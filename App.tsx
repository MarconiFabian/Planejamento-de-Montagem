
import React, { useState, useEffect } from 'react';
import PipelineVisualizer from './components/PipelineVisualizer';
import ControlPanel from './components/ControlPanel'; // ControlPanel hidden but import kept for future
import BuilderControls from './components/BuilderControls';
import { MOCK_SEGMENTS, createDefaultStages, generateRackPath, generatePipePath, generateElbowPath, generateCantileverPath, generateRectanglePath, generateCirclePath, generateFloatingSupportPath, generateZonePath } from './constants';
import { PipeSegment, StageStatus } from './types';
import { LayoutDashboard, FileText, CalendarClock, BookOpen } from 'lucide-react';
import { getGeneralProjectReport, getDailyProgressReport } from './services/geminiService';

const GENERAL_SNAP = 15; // Increased slightly for easier BOP alignment
const RACK_GRAVITY = 40; // GRAVE ISSO: Increased gravity to force BOP alignment with Support Top

type ViewMode = 'builder' | 'planning_report' | 'daily_report';

const App: React.FC = () => {
  const [segments, setSegments] = useState<PipeSegment[]>(MOCK_SEGMENTS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // View State
  const [viewMode, setViewMode] = useState<ViewMode>('builder');
  
  // Report States
  const [reportText, setReportText] = useState("");
  const [dailyReportText, setDailyReportText] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  
  // 4"=10, 6"=15, 8"=20, 10"=25
  const [currentDiameter, setCurrentDiameter] = useState(20); 
  const [segmentCounter, setSegmentCount] = useState(2); // Start at 2 because MOCK is SUP-1

  // Primary selection is the last selected item (for displaying specific properties)
  const primarySelectedId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null;
  const selectedSegment = segments.find(s => s.id === primarySelectedId) || null;

  // Determine if ANY selected item is a Pipe or Elbow to show specific controls
  const hasPipeOrElbowSelected = selectedIds.some(id => {
      const s = segments.find(seg => seg.id === id);
      return s && (s.type === 'PIPE' || s.type === 'ELBOW');
  });

  const handleSelectSegment = (id: string, isMultiSelect: boolean) => {
    if (isMultiSelect) {
        setSelectedIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(item => item !== id);
            } else {
                return [...prev, id];
            }
        });
    } else {
        setSelectedIds([id]);
    }
  };

  // New handler for Box Selection
  const handleWindowSelection = (ids: string[]) => {
      // Replaces current selection with the box selection
      setSelectedIds(ids);
  };

  const handleUpdateStatus = (segmentId: string, stageKey: string, newStatus: StageStatus, date?: string) => {
    setSegments(prev => prev.map(seg => {
      if (seg.id !== segmentId) return seg;
      return {
        ...seg,
        stages: {
          ...seg.stages,
          [stageKey]: {
            ...seg.stages[stageKey as keyof typeof seg.stages],
            status: newStatus,
            date: date // Save the date here
          }
        }
      };
    }));
  };

  const handleUpdateJointStatus = (segmentId: string, jointIndex: number, newStatus: StageStatus) => {
      setSegments(prev => prev.map(seg => {
          if (seg.id !== segmentId) return seg;
          const currentJoints = seg.joints ? [...seg.joints] : [StageStatus.NOT_STARTED, StageStatus.NOT_STARTED];
          currentJoints[jointIndex] = newStatus;
          
          return {
              ...seg,
              joints: currentJoints
          };
      }));
  }

  const handleUpdateSegmentLabel = (id: string, newName: string) => {
      setSegments(prev => prev.map(seg => {
          if (seg.id !== id) return seg;
          return { ...seg, name: newName };
      }));
  }

  const handleUpdateSegmentDescription = (id: string, newDesc: string) => {
      setSegments(prev => prev.map(seg => {
          // Allow bulk update if multiple items selected
          if (selectedIds.includes(seg.id) && selectedIds.includes(id)) {
             return { ...seg, description: newDesc };
          }
          if (seg.id === id) return { ...seg, description: newDesc };
          return seg;
      }));
  }

  const handleCreateZone = () => {
    if (selectedIds.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    // Calculate Bounds of selected items
    selectedIds.forEach(id => {
        const seg = segments.find(s => s.id === id);
        if (seg) {
            let halfW = 0, halfH = 0;
            // Crude size estimation for bounding box
            if (seg.type === 'PIPE') {
                const len = parseFloat(seg.length || "0");
                const isVert = seg.description.includes("VERTICAL");
                halfW = isVert ? 20 : len/2;
                halfH = isVert ? len/2 : 20;
            } else if (seg.type === 'ELBOW') {
                halfW = 30; halfH = 30;
            } else {
                halfW = parseFloat(seg.length||"50")/2;
                halfH = parseFloat(seg.weight||"50")/2;
            }

            minX = Math.min(minX, seg.x - halfW);
            maxX = Math.max(maxX, seg.x + halfW);
            minY = Math.min(minY, seg.y - halfH);
            maxY = Math.max(maxY, seg.y + halfH);
        }
    });

    if (minX === Infinity) return;

    const padding = 30;
    const width = (maxX - minX) + padding * 2;
    const height = (maxY - minY) + padding * 2;
    const centerX = minX + (maxX - minX)/2;
    const centerY = minY + (maxY - minY)/2;

    const newId = `ZONE-${segmentCounter}`;
    const newSeg: PipeSegment = {
        id: newId,
        name: `Nova Área de Trabalho`,
        type: 'ZONE',
        x: centerX, 
        y: centerY,
        coordinates: generateZonePath(centerX, centerY, width, height),
        length: width.toString(),
        weight: height.toString(),
        description: 'Local de atividade',
        stages: createDefaultStages()
    };

    setSegments([...segments, newSeg]);
    setSegmentCount(c => c + 1);
    setSelectedIds([newId]); // Select the new zone to allow immediate editing
  };

  const handleGenerateReport = async () => {
    setViewMode('planning_report');
    setReportLoading(true);
    const text = await getGeneralProjectReport(segments);
    setReportText(text);
    setReportLoading(false);
  }

  const handleGenerateDailyReport = async () => {
    setViewMode('daily_report');
    setReportLoading(true);
    const text = await getDailyProgressReport(segments);
    setDailyReportText(text);
    setReportLoading(false);
  }

  // --- BUILDER FUNCTIONS ---

  const handleDiameterChange = (newDia: number) => {
      setCurrentDiameter(newDia);
      
      // Update ALL selected segments
      if (selectedIds.length > 0) {
          setSegments(prev => prev.map(seg => {
              if (!selectedIds.includes(seg.id)) return seg;
              
              if (seg.type === 'PIPE') {
                  const len = parseFloat(seg.length || "200");
                  const isVertical = seg.description.includes("VERTICAL");
                  return {
                      ...seg,
                      weight: newDia.toString(),
                      coordinates: generatePipePath(seg.x, seg.y, len, newDia, isVertical)
                  };
              }
              
              if (seg.type === 'ELBOW') {
                  // For Elbows, length stores diameter
                  const rotation = parseInt(seg.weight || "0");
                  return {
                      ...seg,
                      length: newDia.toString(),
                      coordinates: generateElbowPath(seg.x, seg.y, newDia, rotation)
                  }
              }

              if (seg.type === 'CIRCLE') {
                  // For Circle, diameter update
                  return {
                      ...seg,
                      length: newDia.toString(), // Store dia in length
                      coordinates: generateCirclePath(seg.x, seg.y, newDia)
                  }
              }

              return seg;
          }));
      }
  };

  const handleResetProject = () => {
      setSegments([]);
      setSelectedIds([]);
      setSegmentCount(1);
  };

  const handleCloneSupport = () => {
      // Logic for cloning: If multiple selected, clone all with offset
      if (selectedIds.length === 0) return;

      const newSegmentsToAdd: PipeSegment[] = [];
      let counter = segmentCounter;

      segments.filter(s => selectedIds.includes(s.id)).forEach(segToClone => {
          const typePrefix = segToClone.type === 'PIPE' ? 'PIPE' : 
                             segToClone.type === 'ELBOW' ? 'ELBOW' :
                             segToClone.type === 'SUPPORT' ? 'SUP' :
                             segToClone.type === 'CANTILEVER' ? 'CANT' :
                             segToClone.type === 'FLOATING' ? 'FLOAT' :
                             segToClone.type === 'RECTANGLE' ? 'RECT' :
                             segToClone.type === 'CIRCLE' ? 'CIRC' : 'ITEM';

          const newId = `${typePrefix}-${counter}`;
          counter++;
          
          const width = parseFloat(segToClone.length || "0");
          const height = parseFloat(segToClone.weight || "0");
          
          const newX = segToClone.x + 30;
          const newY = segToClone.y + 30;

          let newPath = "";
          if (segToClone.type === 'SUPPORT') newPath = generateRackPath(newX, newY, width, height);
          if (segToClone.type === 'CANTILEVER') newPath = generateCantileverPath(newX, newY, width, height);
          if (segToClone.type === 'FLOATING') newPath = generateFloatingSupportPath(newX, newY, width, height);
          if (segToClone.type === 'RECTANGLE') newPath = generateRectanglePath(newX, newY, width, height);
          if (segToClone.type === 'ZONE') newPath = generateZonePath(newX, newY, width, height);
          if (segToClone.type === 'CIRCLE') newPath = generateCirclePath(newX, newY, width);
          
          if (segToClone.type === 'PIPE') {
              const isVertical = segToClone.description.includes("VERTICAL");
              newPath = generatePipePath(newX, newY, width, parseFloat(segToClone.weight || "20"), isVertical);
          }
          if (segToClone.type === 'ELBOW') {
              newPath = generateElbowPath(newX, newY, parseFloat(segToClone.length || "20"), parseInt(segToClone.weight || "0"));
          }

          const newSeg: PipeSegment = {
              ...segToClone,
              id: newId,
              x: newX,
              y: newY,
              name: `${segToClone.name} (Cópia)`,
              coordinates: newPath,
              joints: segToClone.joints ? [...segToClone.joints] : undefined,
              stages: createDefaultStages()
          };
          newSegmentsToAdd.push(newSeg);
      });

      setSegments([...segments, ...newSegmentsToAdd]);
      setSegmentCount(counter);
      // Select the newly created items
      setSelectedIds(newSegmentsToAdd.map(s => s.id));
  };

  const handleDeleteSegment = () => {
      if (selectedIds.length > 0) {
          setSegments(prev => prev.filter(s => !selectedIds.includes(s.id)));
          setSelectedIds([]);
      }
  };

  const handleAddSupport = () => {
      const defW = 150;
      const defH = 80;
      const x = 400; 
      const y = 300;
      const newId = `SUP-${segmentCounter}`;
      const newSeg: PipeSegment = {
          id: newId,
          name: `Base ${segmentCounter}`,
          type: 'SUPPORT',
          x, y,
          coordinates: generateRackPath(x, y, defW, defH),
          length: defW.toString(), 
          weight: defH.toString(),
          description: 'Suporte de Chão Ajustável',
          stages: createDefaultStages()
      };
      setSegments([...segments, newSeg]);
      setSelectedIds([newId]);
      setSegmentCount(c => c + 1);
  };

  const handleAddCantilever = () => {
      const defW = 100;
      const defH = 120;
      const x = 400; 
      const y = 300;
      const newId = `CANT-${segmentCounter}`;
      const newSeg: PipeSegment = {
          id: newId,
          name: `Suporte T ${segmentCounter}`,
          type: 'CANTILEVER',
          x, y,
          coordinates: generateCantileverPath(x, y, defW, defH),
          length: defW.toString(), 
          weight: defH.toString(),
          description: 'Suporte Mão Francesa',
          stages: createDefaultStages()
      };
      setSegments([...segments, newSeg]);
      setSelectedIds([newId]);
      setSegmentCount(c => c + 1);
  };

  const handleAddFloatingSupport = () => {
      const defW = 30;
      const defH = 30;
      const x = 400; 
      const y = 300;
      const newId = `FLOAT-${segmentCounter}`;
      const newSeg: PipeSegment = {
          id: newId,
          name: `Sup. Flutuante ${segmentCounter}`,
          type: 'FLOATING',
          x, y,
          coordinates: generateFloatingSupportPath(x, y, defW, defH),
          length: defW.toString(), 
          weight: defH.toString(),
          description: 'Suporte Flutuante (Bloco)',
          stages: createDefaultStages()
      };
      setSegments([...segments, newSeg]);
      setSelectedIds([newId]);
      setSegmentCount(c => c + 1);
  };

  const handleAddRectangle = () => {
      const defW = 100;
      const defH = 100;
      const x = 400;
      const y = 300;
      const newId = `RECT-${segmentCounter}`;
      const newSeg: PipeSegment = {
          id: newId,
          name: `Retângulo ${segmentCounter}`,
          type: 'RECTANGLE',
          x, y,
          coordinates: generateRectanglePath(x, y, defW, defH),
          length: defW.toString(),
          weight: defH.toString(),
          description: 'Área Retangular',
          stages: createDefaultStages()
      };
      setSegments([...segments, newSeg]);
      setSelectedIds([newId]);
      setSegmentCount(c => c + 1);
  };

  const handleAddCircle = () => {
      const defDia = 100;
      const x = 400;
      const y = 300;
      const newId = `CIRC-${segmentCounter}`;
      const newSeg: PipeSegment = {
          id: newId,
          name: `Círculo ${segmentCounter}`,
          type: 'CIRCLE',
          x, y,
          coordinates: generateCirclePath(x, y, defDia),
          length: defDia.toString(), // Length = Diameter
          weight: defDia.toString(),
          description: 'Área Circular',
          stages: createDefaultStages()
      };
      setSegments([...segments, newSeg]);
      setSelectedIds([newId]);
      setSegmentCount(c => c + 1);
  };

  const handleAddPipe = () => {
      const defLen = 200;
      const dia = currentDiameter; 
      const x = 400; 
      const y = 250;
      const newId = `PIPE-${segmentCounter}`;
      
      // Determine label based on diameter
      let label = "8";
      if(dia === 10) label = "4";
      if(dia === 15) label = "6";
      if(dia === 25) label = "10";

      const newSeg: PipeSegment = {
          id: newId,
          name: `Tubo ${label}" ${segmentCounter}`,
          type: 'PIPE',
          x, y,
          coordinates: generatePipePath(x, y, defLen, dia, false),
          length: defLen.toString(),
          weight: dia.toString(), // Store Diameter in Weight for Pipe
          description: `Tubulação ${label}" Aço Carbono`,
          joints: [StageStatus.NOT_STARTED, StageStatus.NOT_STARTED], // Independent Joints
          stages: createDefaultStages()
      };
      setSegments([...segments, newSeg]);
      setSelectedIds([newId]);
      setSegmentCount(c => c + 1);
  };

  const handleAddElbow = () => {
      const dia = currentDiameter;
      const x = 400; 
      const y = 250;
      const newId = `ELBOW-${segmentCounter}`;

       let label = "8";
      if(dia === 10) label = "4";
      if(dia === 15) label = "6";
      if(dia === 25) label = "10";

      const newSeg: PipeSegment = {
          id: newId,
          name: `Curva ${label}" ${segmentCounter}`,
          type: 'ELBOW',
          x, y,
          coordinates: generateElbowPath(x, y, dia, 0),
          length: dia.toString(), // Store Diameter in Length for Elbow
          weight: '0', // Store Rotation in Weight for Elbow
          description: `Curva 90° ${label}" LR`,
          joints: [StageStatus.NOT_STARTED, StageStatus.NOT_STARTED], // Independent Joints
          stages: createDefaultStages()
      };
      setSegments([...segments, newSeg]);
      setSelectedIds([newId]);
      setSegmentCount(c => c + 1);
  };

  const handleRotateSegment = () => {
      if (selectedIds.length === 0) return;
      
      setSegments(prev => prev.map(seg => {
          if (!selectedIds.includes(seg.id)) return seg;

          if (seg.type === 'PIPE') {
              const len = parseFloat(seg.length || "200");
              const dia = parseFloat(seg.weight || "20");
              const isCurrentlyVertical = seg.description.includes("VERTICAL");
              const newVertical = !isCurrentlyVertical;

              return {
                  ...seg,
                  description: newVertical ? seg.description + " VERTICAL" : seg.description.replace(" VERTICAL", ""),
                  coordinates: generatePipePath(seg.x, seg.y, len, dia, newVertical)
              };
          }

          if (seg.type === 'ELBOW') {
              const currentRot = parseInt(seg.weight || "0");
              const nextRot = (currentRot + 1) % 4;
              const dia = parseFloat(seg.length || "20");
              
              return {
                  ...seg,
                  weight: nextRot.toString(),
                  coordinates: generateElbowPath(seg.x, seg.y, dia, nextRot)
              };
          }

          return seg;
      }));
  };

  const handleResizeSupport = (deltaW: number, deltaH: number) => {
      // Resize all selected
      selectedIds.forEach(id => {
          handleResizeSegment(id, deltaW, deltaH);
      });
  };

  // --- NEW: GENERIC RESIZE HANDLER (Works for Buttons AND Dragging) ---
  const handleResizeSegment = (id: string, deltaW: number, deltaH: number) => {
      if (!id) return;
      
      setSegments(prev => prev.map(seg => {
          if (seg.id !== id) return seg;
          
          let currentW = parseFloat(seg.length || "100");
          let currentH = parseFloat(seg.weight || "100");
          
          // Minimum dimensions
          const newW = Math.max(20, currentW + deltaW);
          const newH = Math.max(20, currentH + deltaH);

          let newCoords = seg.coordinates;

          if (seg.type === 'RECTANGLE' || seg.type === 'ZONE') {
              if (seg.type === 'ZONE') {
                 newCoords = generateZonePath(seg.x, seg.y, newW, newH);
              } else {
                 newCoords = generateRectanglePath(seg.x, seg.y, newW, newH);
              }
          }
          else if (seg.type === 'CIRCLE') {
              // For circle, use width as diameter. Maintain aspect if needed, or just take larger delta
              // Simplification: Resize radius by largest delta
              const d = Math.max(deltaW, deltaH);
              const newDia = Math.max(20, parseFloat(seg.length || "100") + d);
              return {
                  ...seg,
                  length: newDia.toString(),
                  weight: newDia.toString(),
                  coordinates: generateCirclePath(seg.x, seg.y, newDia)
              };
          }
          else if (seg.type === 'SUPPORT' || seg.type === 'CANTILEVER' || seg.type === 'FLOATING') {
              // Maintain Base Position (Bottom Y) logic
              const oldBase = seg.y + currentH;
              const newY = oldBase - newH;

              if (seg.type === 'SUPPORT') {
                  newCoords = generateRackPath(seg.x, newY, newW, newH);
              } else if (seg.type === 'CANTILEVER') {
                  newCoords = generateCantileverPath(seg.x, newY, newW, newH);
              } else {
                  newCoords = generateFloatingSupportPath(seg.x, newY, newW, newH);
              }
              return {
                  ...seg,
                  y: newY,
                  length: newW.toString(),
                  weight: newH.toString(),
                  coordinates: newCoords
              };
          }
          else if (seg.type === 'PIPE') {
              // Existing pipe logic
              let len = parseFloat(seg.length || "200");
              const dia = parseFloat(seg.weight || "20");
              const delta = Math.abs(deltaW) > Math.abs(deltaH) ? deltaW : deltaH;
              const newLen = Math.max(50, len + delta);
              const isVertical = seg.description.includes("VERTICAL");
              return {
                  ...seg,
                  length: newLen.toString(),
                  coordinates: generatePipePath(seg.x, seg.y, newLen, dia, isVertical)
              };
          }

          // Fallback for Rectangle/Other simple resize
          return {
              ...seg,
              length: newW.toString(),
              weight: newH.toString(),
              coordinates: newCoords
          };
      }));
  }

  const handleMoveSegment = (draggedId: string, deltaX: number, deltaY: number, ignoreSnapping: boolean = false) => {
      // Determine if we are moving a group
      const isMultiMove = selectedIds.includes(draggedId) && selectedIds.length > 1;
      
      // If multi-move, we skip complex snapping to avoid items collapsing into one point.
      // Snapping only enabled for single item move for now to keep it stable.
      const enableSnapping = !isMultiMove && !ignoreSnapping;

      setSegments(prev => prev.map(seg => {
          // If multi-move: update all in selectedIds. If single: update only draggedId.
          if (isMultiMove ? !selectedIds.includes(seg.id) : seg.id !== draggedId) {
              return seg;
          }

          // Basic move
          let newX = seg.x + deltaX;
          let newY = seg.y + deltaY;
          let newCoords = "";

          // SNAPPING LOGIC (Only if single item move)
          if (enableSnapping) {
              const myType = seg.type;
              let isSnapped = false;
              
              // Helper to get Bottom Y of any component
              const getBottomOffset = (s: PipeSegment) => {
                 if (s.type === 'PIPE') {
                     const dia = parseFloat(s.weight || "20");
                     const len = parseFloat(s.length || "200");
                     return s.description.includes("VERTICAL") ? (len/2) : (dia/2);
                 }
                 if (s.type === 'ELBOW') {
                     const dia = parseFloat(s.length || "20");
                     return dia / 2; // Approximate bottom for alignment
                 }
                 return 0;
              };

              const myBottomOffset = getBottomOffset(seg);
              const myTargetBottomY = newY + myBottomOffset;

              for (const other of prev) {
                  if (other.id === seg.id) continue;
                  
                  const otherBottomOffset = getBottomOffset(other);
                  const isSupportType = (t: string) => t === 'SUPPORT' || t === 'CANTILEVER' || t === 'FLOATING';

                  // 1. SUPORTE SNAP
                  if (myType === 'PIPE' && isSupportType(other.type)) {
                      const rackTopY = other.y;
                      if (Math.abs(myTargetBottomY - rackTopY) < RACK_GRAVITY) {
                          newY = rackTopY - myBottomOffset; 
                          isSnapped = true;
                      }
                  }

                  // 2. CONEXÃO
                  if (!isSnapped) {
                      const isConnectionCandidate = 
                        (myType === 'PIPE' || myType === 'ELBOW') && 
                        (other.type === 'PIPE' || other.type === 'ELBOW');

                      if (isConnectionCandidate) {
                          const otherBottomY = other.y + otherBottomOffset;
                          if (Math.abs(myTargetBottomY - otherBottomY) < GENERAL_SNAP) {
                              newY = otherBottomY - myBottomOffset;
                              isSnapped = true;
                          }
                          if (Math.abs(newX - other.x) < GENERAL_SNAP) {
                              newX = other.x;
                          }
                      }
                  }
                  
                  // 3. SUPORTE COM SUPORTE
                  if (isSupportType(myType) && isSupportType(other.type)) {
                       if (Math.abs(newX - other.x) < GENERAL_SNAP) {
                          newX = other.x;
                      }
                      const myH = parseFloat(seg.weight || "0");
                      const otherH = parseFloat(other.weight || "0");
                      const myBaseY = newY + myH;
                      const otherBaseY = other.y + otherH;
                      if (Math.abs(myBaseY - otherBaseY) < GENERAL_SNAP) {
                          newY = otherBaseY - myH;
                      }
                  }
              }
          }

          // Regenerate coordinates
          if (seg.type === 'SUPPORT') {
              newCoords = generateRackPath(newX, newY, parseFloat(seg.length||"0"), parseFloat(seg.weight||"0"));
          } 
          else if (seg.type === 'CANTILEVER') {
              newCoords = generateCantileverPath(newX, newY, parseFloat(seg.length||"0"), parseFloat(seg.weight||"0"));
          }
          else if (seg.type === 'FLOATING') {
              newCoords = generateFloatingSupportPath(newX, newY, parseFloat(seg.length||"0"), parseFloat(seg.weight||"0"));
          }
          else if (seg.type === 'PIPE') {
               newCoords = generatePipePath(newX, newY, parseFloat(seg.length||"0"), parseFloat(seg.weight||"0"), seg.description.includes("VERTICAL"));
          }
          else if (seg.type === 'ELBOW') {
               newCoords = generateElbowPath(newX, newY, parseFloat(seg.length||"20"), parseInt(seg.weight||"0"));
          }
          else if (seg.type === 'RECTANGLE') {
              newCoords = generateRectanglePath(newX, newY, parseFloat(seg.length||"100"), parseFloat(seg.weight||"100"));
          }
          else if (seg.type === 'ZONE') {
              newCoords = generateZonePath(newX, newY, parseFloat(seg.length||"100"), parseFloat(seg.weight||"100"));
          }
          else if (seg.type === 'CIRCLE') {
              newCoords = generateCirclePath(newX, newY, parseFloat(seg.length||"100"));
          }

          return { ...seg, x: newX, y: newY, coordinates: newCoords };
      }));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // FIX: Check if user is typing in an Input field. If so, ignore shortcuts.
      const activeElement = document.activeElement;
      const isInputActive = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
      if (isInputActive) return;

      // Only trigger if something is selected
      if (selectedIds.length > 0) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          handleDeleteSegment();
        }
        if ((e.metaKey || e.ctrlKey) && (e.key === 'c' || e.key === 'C')) {
          e.preventDefault();
          handleCloneSupport();
        }

        // KEYBOARD MOVEMENT
        const step = 1; 
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIds.forEach(id => handleMoveSegment(id, 0, -step, true));
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIds.forEach(id => handleMoveSegment(id, 0, step, true));
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            selectedIds.forEach(id => handleMoveSegment(id, -step, 0, true));
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            selectedIds.forEach(id => handleMoveSegment(id, step, 0, true));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, segments, segmentCounter]); 

  // Helper to Render Content based on ViewMode
  const renderContent = () => {
      if (viewMode === 'planning_report') {
          return (
            <div className="bg-white m-4 rounded-xl shadow-lg h-[95%] p-8 overflow-y-auto border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <FileText className="text-blue-600"/> 
                    Relatório de Planejamento Geral (IA)
                </h2>
                {reportLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                        Gerando análise...
                    </div>
                ) : (
                    <div className="prose prose-slate max-w-none">
                        <div className="whitespace-pre-line text-slate-700 leading-7">
                            {reportText}
                        </div>
                    </div>
                )}
            </div>
          );
      }

      if (viewMode === 'daily_report') {
        return (
            <div className="bg-white m-4 rounded-xl shadow-lg h-[95%] p-8 overflow-y-auto border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <BookOpen className="text-emerald-600"/> 
                    Relatório Diário de Obra (RDO)
                </h2>
                {reportLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-4"></div>
                        Consolidando datas e gerando diário...
                    </div>
                ) : (
                    <div className="prose prose-slate max-w-none">
                        <div className="whitespace-pre-line text-slate-700 leading-7">
                            {dailyReportText}
                        </div>
                    </div>
                )}
            </div>
        );
      }

      // Default: Builder View
      return (
        <>
            <PipelineVisualizer 
                segments={segments} 
                selectedSegmentIds={selectedIds} 
                onSelectSegment={handleSelectSegment}
                onWindowSelection={handleWindowSelection} // Passing the new handler
                onMoveSegment={handleMoveSegment}
                onResizeSegment={handleResizeSegment}
            />
            <BuilderControls 
                onAddSupport={handleAddSupport}
                onAddCantilever={handleAddCantilever}
                onAddPipe={handleAddPipe}
                onAddElbow={handleAddElbow}
                onAddRectangle={handleAddRectangle}
                onAddCircle={handleAddCircle}
                onAddFloatingSupport={handleAddFloatingSupport}
                onReset={handleResetProject}
                selectedSegmentIds={selectedIds}
                selectedSegmentId={primarySelectedId}
                currentStatus={selectedSegment?.stages.lifting.status}
                currentHydroStatus={selectedSegment?.stages.hydrotest.status} 
                currentWeldingStatus={selectedSegment?.stages.welding.status}
                currentJoints={selectedSegment?.joints}
                selectedSegmentType={selectedSegment?.type}
                selectedSegmentName={selectedSegment?.name}
                selectedSegmentDescription={selectedSegment?.description}
                hasPipeOrElbowSelected={hasPipeOrElbowSelected}
                segments={segments} // Added segments prop
                onResizeSupport={handleResizeSupport}
                onCloneSupport={handleCloneSupport}
                onRotateSegment={handleRotateSegment}
                onUpdateStatus={handleUpdateStatus} 
                onUpdateJointStatus={handleUpdateJointStatus}
                onUpdateSegmentDescription={handleUpdateSegmentDescription}
                currentDiameter={currentDiameter}
                onDiameterChange={handleDiameterChange}
                onMoveSegment={(dx, dy) => selectedIds.forEach(id => handleMoveSegment(id, dx, dy, true))}
                onCreateZone={handleCreateZone}
                onUpdateSegmentLabel={handleUpdateSegmentLabel}
            />
        </>
      );
  };

  return (
    <div className="flex h-screen w-full bg-slate-100 font-sans text-slate-900 overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside className="w-16 bg-slate-900 flex flex-col items-center py-6 gap-6 z-20 shadow-xl">
        <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/30">
            <CalendarClock className="text-white" size={24} />
        </div>
        <div className="flex flex-col gap-4 mt-8 w-full items-center">
            <button 
                onClick={() => setViewMode('builder')}
                className={`p-3 rounded-xl transition-all ${viewMode === 'builder' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                title="Construtor"
            >
                <LayoutDashboard size={20} />
            </button>
            <button 
                onClick={handleGenerateReport}
                className={`p-3 rounded-xl transition-all ${viewMode === 'planning_report' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                title="Relatório Geral"
            >
                <FileText size={20} />
            </button>
            <button 
                onClick={handleGenerateDailyReport}
                className={`p-3 rounded-xl transition-all ${viewMode === 'daily_report' ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                title="Diário de Obra (RDO)"
            >
                <BookOpen size={20} />
            </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative">
        
        {/* Workspace */}
        <div className="flex-1 relative overflow-hidden flex">
            
            {/* Full Width Visualization */}
            <div className={`flex-1 relative bg-slate-800 transition-all duration-300 ${viewMode !== 'builder' ? 'w-1/3' : 'w-full'}`}>
                {renderContent()}
            </div>
        </div>

      </main>
    </div>
  );
};

export default App;
