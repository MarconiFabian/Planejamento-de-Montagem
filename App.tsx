import React, { useState, useEffect } from 'react';
import PipelineVisualizer from './components/PipelineVisualizer';
import ControlPanel from './components/ControlPanel'; // ControlPanel hidden but import kept for future
import BuilderControls from './components/BuilderControls';
import { MOCK_SEGMENTS, createDefaultStages, generateRackPath, generatePipePath, generateElbowPath, generateCantileverPath } from './constants';
import { PipeSegment, StageStatus } from './types';
import { LayoutDashboard, FileText, CalendarClock } from 'lucide-react';
import { getGeneralProjectReport } from './services/geminiService';

const GENERAL_SNAP = 15; // Increased slightly for easier BOP alignment
const RACK_GRAVITY = 40; // GRAVE ISSO: Increased gravity to force BOP alignment with Support Top

const App: React.FC = () => {
  const [segments, setSegments] = useState<PipeSegment[]>(MOCK_SEGMENTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  
  // 4"=10, 6"=15, 8"=20, 10"=25
  const [currentDiameter, setCurrentDiameter] = useState(20); 
  const [segmentCounter, setSegmentCount] = useState(100);

  const selectedSegment = segments.find(s => s.id === selectedId) || null;

  const handleUpdateStatus = (segmentId: string, stageKey: string, newStatus: StageStatus) => {
    setSegments(prev => prev.map(seg => {
      if (seg.id !== segmentId) return seg;
      return {
        ...seg,
        stages: {
          ...seg.stages,
          [stageKey]: {
            ...seg.stages[stageKey as keyof typeof seg.stages],
            status: newStatus
          }
        }
      };
    }));
  };

  const handleGenerateReport = async () => {
    setReportOpen(true);
    setReportLoading(true);
    const text = await getGeneralProjectReport(segments);
    setReportText(text);
    setReportLoading(false);
  }

  // --- BUILDER FUNCTIONS ---

  const handleDiameterChange = (newDia: number) => {
      setCurrentDiameter(newDia);
      
      // If a pipe/elbow is selected, update its diameter
      if (selectedId && selectedSegment) {
          setSegments(prev => prev.map(seg => {
              if (seg.id !== selectedId) return seg;
              
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

              return seg;
          }));
      }
  };

  const handleResetProject = () => {
      setSegments([]);
      setSelectedId(null);
      setSegmentCount(1);
  };

  const handleCloneSupport = () => {
      if (!selectedId || !selectedSegment) return;

      const newId = `ITEM-${segmentCounter + 1}`;
      const width = parseFloat(selectedSegment.length || "0");
      const height = parseFloat(selectedSegment.weight || "0");
      
      const newX = selectedSegment.x + 30;
      const newY = selectedSegment.y + 30;

      let newPath = "";
      if (selectedSegment.type === 'SUPPORT') newPath = generateRackPath(newX, newY, width, height);
      if (selectedSegment.type === 'CANTILEVER') newPath = generateCantileverPath(newX, newY, width, height);
      if (selectedSegment.type === 'PIPE') {
          const isVertical = selectedSegment.description.includes("VERTICAL");
          // Pipe uses weight for diameter
          newPath = generatePipePath(newX, newY, width, parseFloat(selectedSegment.weight || "20"), isVertical);
      }
      if (selectedSegment.type === 'ELBOW') {
          // Elbow uses length for diameter, weight for rotation
          newPath = generateElbowPath(newX, newY, parseFloat(selectedSegment.length || "20"), parseInt(selectedSegment.weight || "0"));
      }

      const newSeg: PipeSegment = {
          ...selectedSegment,
          id: newId,
          x: newX,
          y: newY,
          name: `${selectedSegment.name} (Cópia)`,
          coordinates: newPath,
          stages: createDefaultStages()
      };

      setSegments([...segments, newSeg]);
      setSelectedId(newId);
      setSegmentCount(c => c + 1);
  };

  const handleDeleteSegment = () => {
      if (selectedId) {
          setSegments(prev => prev.filter(s => s.id !== selectedId));
          setSelectedId(null);
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
      setSelectedId(newId);
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
      setSelectedId(newId);
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
          stages: createDefaultStages()
      };
      setSegments([...segments, newSeg]);
      setSelectedId(newId);
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
          stages: createDefaultStages()
      };
      setSegments([...segments, newSeg]);
      setSelectedId(newId);
      setSegmentCount(c => c + 1);
  };

  const handleRotateSegment = () => {
      if (!selectedId || !selectedSegment) return;
      
      setSegments(prev => prev.map(seg => {
          if (seg.id !== selectedId) return seg;

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
      if (!selectedId || !selectedSegment) return;

      setSegments(prev => prev.map(seg => {
          if (seg.id !== selectedId) return seg;
          
          // Unified Support Resizing Logic
          if (seg.type === 'SUPPORT' || seg.type === 'CANTILEVER') {
            let currentW = parseFloat(seg.length || "100");
            let currentH = parseFloat(seg.weight || "100");
            
            const newW = Math.max(40, currentW + deltaW);
            const newH = Math.max(40, currentH + deltaH);

            // KEY CHANGE: Maintain Base Position (Bottom Y)
            // Old Bottom Y = oldY + oldHeight
            // New Y = Old Bottom Y - New Height
            const oldBottomY = seg.y + currentH;
            const newY = oldBottomY - newH;

            let newCoords = "";
            if (seg.type === 'SUPPORT') {
                newCoords = generateRackPath(seg.x, newY, newW, newH);
            } else {
                newCoords = generateCantileverPath(seg.x, newY, newW, newH);
            }

            return {
                ...seg,
                y: newY,
                length: newW.toString(),
                weight: newH.toString(),
                coordinates: newCoords
            };
          }
          
          if (seg.type === 'PIPE') {
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

          return seg;
      }));
  };

  const handleMoveSegment = (id: string, deltaX: number, deltaY: number, ignoreSnapping: boolean = false) => {
      setSegments(prev => prev.map(seg => {
          if (seg.id !== id) return seg;

          let newX = seg.x + deltaX;
          let newY = seg.y + deltaY;
          const myType = seg.type;

          let isSnapped = false;

          // Only perform snapping if NOT ignoring snapping (Mouse drag uses snapping, Keyboard/Buttons do not)
          if (!ignoreSnapping) {
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
                  if (other.id === id) continue;
                  
                  const otherBottomOffset = getBottomOffset(other);
                  
                  const isSupportType = (t: string) => t === 'SUPPORT' || t === 'CANTILEVER';

                  // 1. SUPORTE SNAP (Prioridade Alta) - BOP aligns with TOS
                  // If moving a PIPE, snap to any Support type
                  if (myType === 'PIPE' && isSupportType(other.type)) {
                      const rackTopY = other.y;
                      // BOP (Bottom Of Pipe) should align with TOS (Top Of Support)
                      // myTargetBottomY is approximately where the bottom of pipe is currently
                      
                      if (Math.abs(myTargetBottomY - rackTopY) < RACK_GRAVITY) {
                          // Force alignment: Pipe Center Y = Support Top Y - Pipe Radius
                          newY = rackTopY - myBottomOffset; 
                          isSnapped = true;
                      }
                  }

                  // 2. CONEXÃO (Tubo-Tubo ou Tubo-Curva)
                  // "Acompanha a barriga de baixo" -> Alinha pelo fundo (BOP)
                  if (!isSnapped) {
                      const isConnectionCandidate = 
                        (myType === 'PIPE' || myType === 'ELBOW') && 
                        (other.type === 'PIPE' || other.type === 'ELBOW');

                      if (isConnectionCandidate) {
                          const otherBottomY = other.y + otherBottomOffset;

                          // Snap Y: Bottom Alignment (BOP)
                          if (Math.abs(myTargetBottomY - otherBottomY) < GENERAL_SNAP) {
                              newY = otherBottomY - myBottomOffset;
                              isSnapped = true;
                          }

                          // Snap X: Standard Center/End alignment logic
                          if (Math.abs(newX - other.x) < GENERAL_SNAP) {
                              newX = other.x;
                          }
                      }
                  }
                  
                  // 3. SUPORTE COM SUPORTE (Alinhamento Suave)
                  if (isSupportType(myType) && isSupportType(other.type)) {
                       // Simple X alignment
                       if (Math.abs(newX - other.x) < GENERAL_SNAP) {
                          newX = other.x;
                      }
                      
                      // Base Alignment (Bottom Y)
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

          // Regenerate coordinates based on new position
          let newCoords = "";
          if (seg.type === 'SUPPORT') {
              newCoords = generateRackPath(newX, newY, parseFloat(seg.length||"0"), parseFloat(seg.weight||"0"));
          } 
          else if (seg.type === 'CANTILEVER') {
              newCoords = generateCantileverPath(newX, newY, parseFloat(seg.length||"0"), parseFloat(seg.weight||"0"));
          }
          else if (seg.type === 'PIPE') {
               newCoords = generatePipePath(newX, newY, parseFloat(seg.length||"0"), parseFloat(seg.weight||"0"), seg.description.includes("VERTICAL"));
          }
          else if (seg.type === 'ELBOW') {
               newCoords = generateElbowPath(newX, newY, parseFloat(seg.length||"20"), parseInt(seg.weight||"0"));
          }

          return { ...seg, x: newX, y: newY, coordinates: newCoords };
      }));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if something is selected
      if (selectedId) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          handleDeleteSegment();
        }
        if ((e.metaKey || e.ctrlKey) && (e.key === 'c' || e.key === 'C')) {
          e.preventDefault();
          handleCloneSupport();
        }

        // KEYBOARD MOVEMENT (Subtle - ignores snapping)
        const step = 1; // Subtle 1px movement
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            handleMoveSegment(selectedId, 0, -step, true);
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            handleMoveSegment(selectedId, 0, step, true);
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            handleMoveSegment(selectedId, -step, 0, true);
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            handleMoveSegment(selectedId, step, 0, true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, segments, segmentCounter]); // Re-bind when state changes to ensure fresh closures

  return (
    <div className="flex h-screen w-full bg-slate-100 font-sans text-slate-900 overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside className="w-16 bg-slate-900 flex flex-col items-center py-6 gap-6 z-20 shadow-xl">
        <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/30">
            <CalendarClock className="text-white" size={24} />
        </div>
        <div className="flex flex-col gap-4 mt-8 w-full items-center">
            <button 
                onClick={() => setReportOpen(false)}
                className={`p-3 rounded-xl transition-all ${!reportOpen ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                title="Construtor"
            >
                <LayoutDashboard size={20} />
            </button>
            <button 
                onClick={handleGenerateReport}
                className={`p-3 rounded-xl transition-all ${reportOpen ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                title="Relatório de Planejamento"
            >
                <FileText size={20} />
            </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative">
        
        {/* Workspace */}
        <div className="flex-1 relative overflow-hidden flex">
            
            {/* Full Width Visualization */}
            <div className={`flex-1 relative bg-slate-800 transition-all duration-300 ${reportOpen ? 'w-1/3' : 'w-full'}`}>
                {reportOpen ? (
                    <div className="bg-white m-4 rounded-xl shadow-lg h-[95%] p-8 overflow-y-auto border border-slate-200">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <FileText className="text-blue-600"/> 
                            Relatório de Planejamento (IA)
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
                ) : (
                    <>
                        <PipelineVisualizer 
                            segments={segments} 
                            selectedSegmentId={selectedId} 
                            onSelectSegment={setSelectedId} 
                            onMoveSegment={handleMoveSegment}
                        />
                        <BuilderControls 
                            onAddSupport={handleAddSupport}
                            onAddCantilever={handleAddCantilever}
                            onAddPipe={handleAddPipe}
                            onAddElbow={handleAddElbow}
                            onReset={handleResetProject}
                            selectedSegmentId={selectedId}
                            currentStatus={selectedSegment?.stages.lifting.status}
                            currentHydroStatus={selectedSegment?.stages.hydrotest.status} 
                            selectedSegmentType={selectedSegment?.type}
                            onResizeSupport={handleResizeSupport}
                            onCloneSupport={handleCloneSupport}
                            onRotateSegment={handleRotateSegment}
                            onUpdateStatus={handleUpdateStatus} 
                            currentDiameter={currentDiameter}
                            onDiameterChange={handleDiameterChange}
                            onMoveSegment={(dx, dy) => selectedId && handleMoveSegment(selectedId, dx, dy, true)}
                        />
                    </>
                )}
            </div>
        </div>

      </main>
    </div>
  );
};

export default App;