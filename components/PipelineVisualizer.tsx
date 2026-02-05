
import React, { useState, useRef, useEffect } from 'react';
import { PipeSegment, StageStatus } from '../types';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface PipelineVisualizerProps {
  segments: PipeSegment[];
  selectedSegmentIds: string[]; // Changed to array
  onSelectSegment: (id: string, isMultiSelect: boolean) => void; // Added isMultiSelect param
  onWindowSelection?: (ids: string[]) => void; // New prop for window/box selection
  onMoveSegment: (id: string, deltaX: number, deltaY: number) => void;
  onResizeSegment?: (id: string, deltaWidth: number, deltaHeight: number) => void; 
}

const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({ 
    segments, 
    selectedSegmentIds, 
    onSelectSegment,
    onWindowSelection,
    onMoveSegment,
    onResizeSegment
}) => {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [draggedSegment, setDraggedSegment] = useState<string | null>(null);
  const [hoveredSegmentId, setHoveredSegmentId] = useState<string | null>(null);
  const [draggedHandle, setDraggedHandle] = useState<{ segId: string, handle: string } | null>(null);
  
  // Selection Box States
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{startX: number, startY: number, currentX: number, currentY: number} | null>(null);

  const lastMousePos = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); // Added ref for the container

  // Monitor Alt Key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Alt') setIsAltPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'Alt') setIsAltPressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Zoom Handler (Centered)
  const handleZoom = (delta: number) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const prevScale = scale;
      const newScale = Math.min(Math.max(prevScale + delta, 0.2), 3); // Limit 20% to 300%
      
      // Adjust Pan to keep center fixed
      // Formula: P_new = Center - (Center - P_old) * (Scale_new / Scale_old)
      const newPanX = centerX - ((centerX - pan.x) / prevScale) * newScale;
      const newPanY = centerY - ((centerY - pan.y) / prevScale) * newScale;

      setScale(newScale);
      setPan({x: newPanX, y: newPanY});
  };

  // Add Wheel Event Listener for Ctrl + Scroll Zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            // Negative deltaY means scrolling up (Zoom In), Positive means scrolling down (Zoom Out)
            const delta = e.deltaY < 0 ? 0.1 : -0.1;
            handleZoom(delta);
        }
    };

    const container = containerRef.current;
    if (container) {
        container.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
        if (container) {
            container.removeEventListener('wheel', handleWheel);
        }
    };
  }, [scale, pan]); // Re-attach when state changes to capture correct closure values

  const handleMouseDown = (e: React.MouseEvent) => {
    // If Alt is pressed, start Window Selection
    if (isAltPressed) {
        // Convert screen coordinates to World Coordinates (taking Pan and Scale into account)
        const rect = svgRef.current?.getBoundingClientRect();
        const offsetX = rect ? rect.left : 0;
        const offsetY = rect ? rect.top : 0;
        
        const worldX = (e.clientX - offsetX - pan.x) / scale;
        const worldY = (e.clientY - offsetY - pan.y) / scale;

        setSelectionBox({
            startX: worldX,
            startY: worldY,
            currentX: worldX,
            currentY: worldY
        });
        return; // Don't trigger pan or select logic
    }

    // If not clicking a segment or handle
    if (!draggedSegment && !draggedHandle) {
        setIsPanning(true);
    }
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 0. Update Selection Box
    if (selectionBox) {
        const rect = svgRef.current?.getBoundingClientRect();
        const offsetX = rect ? rect.left : 0;
        const offsetY = rect ? rect.top : 0;

        const worldX = (e.clientX - offsetX - pan.x) / scale;
        const worldY = (e.clientY - offsetY - pan.y) / scale;
        setSelectionBox(prev => prev ? ({ ...prev, currentX: worldX, currentY: worldY }) : null);
        return;
    }

    const rawDeltaX = e.clientX - lastMousePos.current.x;
    const rawDeltaY = e.clientY - lastMousePos.current.y;
    
    // Scaled deltas for world movement
    const deltaX = rawDeltaX / scale;
    const deltaY = rawDeltaY / scale;

    lastMousePos.current = { x: e.clientX, y: e.clientY };

    // 1. Handle Resize Drag
    if (draggedHandle && onResizeSegment) {
        let dW = 0;
        let dH = 0;
        const h = draggedHandle.handle;
        
        if (h === 'e') dW = deltaX * 2; 
        if (h === 'w') dW = -deltaX * 2;
        if (h === 's') dH = deltaY * 2;
        if (h === 'n') dH = -deltaY * 2;
        if (h === 'se') { dW = deltaX * 2; dH = deltaY * 2; }
        if (h === 'sw') { dW = -deltaX * 2; dH = deltaY * 2; }
        if (h === 'ne') { dW = deltaX * 2; dH = -deltaY * 2; }
        if (h === 'nw') { dW = -deltaX * 2; dH = -deltaY * 2; }
        if (h === 'r') dW = deltaX * 2; // Radius

        onResizeSegment(draggedHandle.segId, dW, dH);
        return;
    }

    // 2. Handle Segment Move
    if (draggedSegment) {
        onMoveSegment(draggedSegment, deltaX, deltaY);
        return;
    }

    // 3. Handle Pan (Pan operates in screen pixels, so use rawDelta)
    if (isPanning) {
        setPan(prev => ({ x: prev.x + rawDeltaX, y: prev.y + rawDeltaY }));
    }
  };

  const handleMouseUp = () => {
    // Finish Selection Box
    if (selectionBox) {
        if (onWindowSelection) {
            // Calculate Box Bounds
            const minX = Math.min(selectionBox.startX, selectionBox.currentX);
            const maxX = Math.max(selectionBox.startX, selectionBox.currentX);
            const minY = Math.min(selectionBox.startY, selectionBox.currentY);
            const maxY = Math.max(selectionBox.startY, selectionBox.currentY);

            // Find Intersecting Segments
            const selected = segments.filter(seg => {
                // Approximate bounding box for segments based on center x,y
                // Using a safe padding or using dimensions if available
                let segHalfW = 10;
                let segHalfH = 10;
                
                if (seg.length) segHalfW = parseFloat(seg.length) / 2;
                if (seg.weight) segHalfH = parseFloat(seg.weight) / 2;
                
                // For Text, use a default box if dimensions aren't clear
                if (seg.type === 'TEXT') {
                   segHalfW = (seg.name.length * (seg.fontSize || 14) * 0.6) / 2;
                   segHalfH = (seg.fontSize || 14) / 2;
                }
                
                const segMinX = seg.x - segHalfW;
                const segMaxX = seg.x + segHalfW;
                const segMinY = seg.y - segHalfH;
                const segMaxY = seg.y + segHalfH;

                // AABB Intersection check
                const overlap = (minX < segMaxX && maxX > segMinX && minY < segMaxY && maxY > segMinY);
                return overlap;
            }).map(s => s.id);
            
            onWindowSelection(selected);
        }
        setSelectionBox(null);
    }

    setIsPanning(false);
    setDraggedSegment(null);
    setDraggedHandle(null);
  };

  const handleSegmentMouseDown = (e: React.MouseEvent, segId: string) => {
      if (isAltPressed) return; // Ignore single clicks if in box selection mode
      e.stopPropagation(); 
      onSelectSegment(segId, e.ctrlKey || e.shiftKey); // Keep Shift/Ctrl for click toggle, use Alt for box
      setDraggedSegment(segId);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleHandleMouseDown = (e: React.MouseEvent, segId: string, handle: string) => {
      e.stopPropagation();
      setDraggedHandle({ segId, handle });
      lastMousePos.current = { x: e.clientX, y: e.clientY };
  }

  // Helper to determine color based on status
  const getSegmentStyle = (segment: PipeSegment) => {
      const status = segment.stages.lifting.status; 
      
      // FIX: Only consider Hydro status if it is a Pipe or Elbow.
      // Supports should not turn Blue even if by mistake hydro status is set.
      const isPipeOrElbow = segment.type === 'PIPE' || segment.type === 'ELBOW';
      const hydroStatus = isPipeOrElbow ? segment.stages.hydrotest.status : StageStatus.NOT_STARTED;

      let strokeColor = '#475569'; 
      let fillColor = '#94a3b8';   
      let textColor = 'white';

      if (hydroStatus === StageStatus.COMPLETED) {
           strokeColor = '#1d4ed8'; 
           fillColor = '#3b82f6';   
      } else if (hydroStatus === StageStatus.IN_PROGRESS) {
           strokeColor = '#0e7490'; 
           fillColor = '#06b6d4';   
      } else if (status === StageStatus.COMPLETED) {
          strokeColor = '#15803d'; 
          fillColor = '#22c55e';   
      } else if (status === StageStatus.IN_PROGRESS) {
          strokeColor = '#a16207'; 
          fillColor = '#eab308';   
      } else if (status === StageStatus.ISSUE || status === StageStatus.BLOCKED) {
          strokeColor = '#b91c1c'; 
          fillColor = '#ef4444';   
      }

      if (status === StageStatus.NOT_STARTED && hydroStatus === StageStatus.NOT_STARTED) {
          fillColor = '#78909c'; 
          strokeColor = '#37474f'; 
      }

      // Special styling for Shapes (Rectangle/Circle)
      if (segment.type === 'RECTANGLE' || segment.type === 'CIRCLE') {
          // Allow transparent fill if desired, but for now keep consistent status color
          // maybe slightly lighter opacity
      }

      return { strokeColor, fillColor, textColor };
  };

  // NEW: Calculate and Render Weld Joints INDEPENDENTLY
  const renderWeldJoints = (segment: PipeSegment) => {
      if (segment.type !== 'PIPE' && segment.type !== 'ELBOW') return null;

      // Access independent joint statuses, default to 'welding.status' or NOT_STARTED if undefined
      // BUT current structure logic uses independent array 'joints' if available.
      
      const getJointStatus = (index: number) => {
          if (segment.joints && segment.joints[index]) {
              return segment.joints[index];
          }
          return StageStatus.NOT_STARTED;
      };

      const getJointColor = (status: StageStatus) => {
          if (status === StageStatus.NOT_STARTED) return { fill: '#ef4444', stroke: '#b91c1c' }; // Red
          if (status === StageStatus.IN_PROGRESS) return { fill: '#facc15', stroke: '#ca8a04' }; // Yellow
          if (status === StageStatus.COMPLETED) return { fill: '#22c55e', stroke: '#15803d' }; // Green
          return { fill: '#94a3b8', stroke: '#475569' }; // Grey
      };

      const points: {x: number, y: number}[] = [];
      const dia = segment.type === 'PIPE' ? parseFloat(segment.weight||"20") : parseFloat(segment.length||"20");
      const jointSize = Math.max(4, dia * 0.3); 

      if (segment.type === 'PIPE') {
          const len = parseFloat(segment.length || "200");
          const isVertical = segment.description.includes("VERTICAL");
          if (isVertical) {
              points.push({ x: segment.x, y: segment.y - len/2 }); // Joint 0: Top
              points.push({ x: segment.x, y: segment.y + len/2 }); // Joint 1: Bottom
          } else {
              points.push({ x: segment.x - len/2, y: segment.y }); // Joint 0: Left
              points.push({ x: segment.x + len/2, y: segment.y }); // Joint 1: Right
          }
      } else if (segment.type === 'ELBOW') {
          const rot = parseInt(segment.weight || "0");
          const R = dia * 1.5;
          const cx = segment.x;
          const cy = segment.y;

          if (rot === 0) { points.push({x: cx, y: cy-R}); points.push({x: cx+R, y: cy}); }
          else if (rot === 1) { points.push({x: cx+R, y: cy}); points.push({x: cx, y: cy+R}); }
          else if (rot === 2) { points.push({x: cx, y: cy+R}); points.push({x: cx-R, y: cy}); }
          else if (rot === 3) { points.push({x: cx-R, y: cy}); points.push({x: cx, y: cy-R}); }
      }

      return points.map((p, idx) => {
          const status = getJointStatus(idx);
          const colors = getJointColor(status);

          return (
            <circle 
                key={`weld-${segment.id}-${idx}`}
                cx={p.x}
                cy={p.y}
                r={jointSize}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={2}
                className="pointer-events-none" 
            />
          );
      });
  };

  const renderResizeHandles = (segment: PipeSegment) => {
      const w = parseFloat(segment.length || '0');
      const h = parseFloat(segment.weight || '0');
      const cx = segment.x;
      const cy = segment.y;

      const Handle = ({ x, y, cursor, type }: {x: number, y: number, cursor: string, type: string}) => (
          <circle 
            cx={x} cy={y} r={5 / scale} // Handle size scales inversely so it looks constant size
            fill="white" stroke="#3b82f6" strokeWidth={2 / scale}
            style={{ cursor }}
            onMouseDown={(e) => handleHandleMouseDown(e, segment.id, type)}
          />
      );

      if (segment.type === 'CIRCLE') {
          // Radius handle on the right
          return <Handle x={cx + w/2} y={cy} cursor="ew-resize" type="r" />;
      }

      if (segment.type === 'RECTANGLE' || segment.type === 'SUPPORT' || segment.type === 'CANTILEVER' || segment.type === 'FLOATING' || segment.type === 'ZONE') {
          // 4 Corners + 4 Sides
          const hw = w/2;
          const hh = h/2;
          // Correction for SUPPORT/CANTILEVER/FLOATING to match their generation logic
          // They are top-anchored: Top at y, Bottom at y+h.
          let top = cy - hh;
          let bottom = cy + hh;
          let left = cx - hw;
          let right = cx + hw;

          if (segment.type === 'SUPPORT' || segment.type === 'CANTILEVER' || segment.type === 'FLOATING') {
              top = cy;
              bottom = cy + h;
              left = cx - hw;
              right = cx + hw;
          }

          return (
              <>
                <Handle x={left} y={top} cursor="nw-resize" type="nw" />
                <Handle x={right} y={top} cursor="ne-resize" type="ne" />
                <Handle x={left} y={bottom} cursor="sw-resize" type="sw" />
                <Handle x={right} y={bottom} cursor="se-resize" type="se" />
              </>
          );
      }
      return null;
  };

  return (
    <div 
        ref={containerRef}
        className={`w-full h-full bg-[#1e293b] rounded-xl overflow-hidden relative shadow-2xl border border-slate-600 ${isAltPressed ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
      <div className="absolute top-4 left-4 z-10 pointer-events-none select-none">
        <h2 className="text-white text-xl font-bold uppercase tracking-wider drop-shadow-md">Implantação de Suportes</h2>
        <p className="text-slate-300 text-sm">Tela Infinita: Arraste para mover. Alt + Arrastar para Seleção. Ctrl + Scroll para Zoom.</p>
        <div className="mt-2 flex flex-col gap-2">
            <div className="flex gap-4 text-[10px] text-white bg-slate-800/80 p-2 rounded backdrop-blur-sm inline-flex border border-slate-700">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm border border-slate-600 bg-[#78909c]"></span> Pendente</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm border border-yellow-700 bg-yellow-500"></span> Montando</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm border border-green-700 bg-green-500"></span> Montado</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm border border-cyan-700 bg-cyan-500"></span> Em Teste</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm border border-blue-700 bg-blue-500"></span> Testado</span>
            </div>
            {/* Legend for Welds */}
            <div className="flex gap-4 text-[10px] text-white bg-slate-800/80 p-2 rounded backdrop-blur-sm inline-flex border border-slate-700 w-fit">
                <span className="font-bold mr-1">Juntas:</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Falta Solda</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> Soldando</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Soldado</span>
            </div>
             {/* Legend for Insulation */}
             <div className="flex gap-4 text-[10px] text-white bg-slate-800/80 p-2 rounded backdrop-blur-sm inline-flex border border-slate-700 w-fit">
                <span className="font-bold mr-1">Isolamento:</span>
                <span className="flex items-center gap-1"><span className="w-4 h-2 border border-dashed border-slate-500 rounded-sm"></span> Falta</span>
                <span className="flex items-center gap-1"><span className="w-4 h-2 border border-dashed border-yellow-500 rounded-sm"></span> Montagem</span>
                <span className="flex items-center gap-1"><span className="w-4 h-2 border border-dashed border-green-500 rounded-sm"></span> Pronto</span>
            </div>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
        <button 
            onClick={() => handleZoom(0.2)} 
            className="p-2 bg-slate-800 text-white rounded-lg shadow hover:bg-slate-700 transition-colors border border-slate-700"
            title="Zoom In (+)"
        >
            <ZoomIn size={20} />
        </button>
        <button 
            onClick={() => handleZoom(-0.2)} 
            className="p-2 bg-slate-800 text-white rounded-lg shadow hover:bg-slate-700 transition-colors border border-slate-700"
            title="Zoom Out (-)"
        >
            <ZoomOut size={20} />
        </button>
        <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded text-center font-mono border border-slate-700 select-none">
            {Math.round(scale * 100)}%
        </div>
      </div>

      <svg 
        ref={svgRef}
        width="100%" 
        height="100%" 
        style={{ touchAction: 'none' }}
      >
        <defs>
            <pattern id="floorGrid" x={pan.x} y={pan.y} width="100" height="50" patternUnits="userSpaceOnUse" patternTransform={`scale(${scale})`}>
                <path d="M 100 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
            </pattern>
            <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feFlood floodColor="black" floodOpacity="0.8"/>
                <feComposite operator="in" in2="SourceGraphic"/>
                <feGaussianBlur stdDeviation="0.5"/>
                <feComponentTransfer><feFuncA type="linear" slope="10"/></feComponentTransfer>
                <feMerge> 
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/> 
                </feMerge>
            </filter>
        </defs>

        <rect width="100%" height="100%" fill="url(#floorGrid)" />

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
            
            {segments.map((segment) => {
                const isSelected = selectedSegmentIds.includes(segment.id);
                const isHovered = hoveredSegmentId === segment.id;
                const showLabel = isSelected || isHovered;
                const { strokeColor, fillColor, textColor } = getSegmentStyle(segment);

                // Check Insulation Status for Casing Rendering
                const insulStatus = segment.stages.insulation.status;
                const showInsulation = (segment.type === 'PIPE' || segment.type === 'ELBOW');
                
                let insulColor = '#94a3b8'; // Default Gray (Missing / Not Started)
                if (insulStatus === StageStatus.IN_PROGRESS) insulColor = '#eab308'; // Yellow
                if (insulStatus === StageStatus.COMPLETED) insulColor = '#22c55e'; // Green

                if (segment.type === 'ZONE') {
                    // Custom Render for ZONE
                    const w = parseFloat(segment.length || '100');
                    const h = parseFloat(segment.weight || '100');
                    const hasDesc = segment.description && segment.description.trim().length > 0;
                    
                    // Dynamic Width Calculation
                    // Estimate width based on character count to auto-resize the box
                    const nameLen = segment.name.length;
                    const descLen = hasDesc ? segment.description.length : 0;
                    
                    // Approx pixels per char
                    const nameWidthEst = nameLen * 9; 
                    const descWidthEst = descLen * 7; 
                    
                    const boxWidth = Math.max(160, nameWidthEst + 30, descWidthEst + 30);
                    const boxHeight = hasDesc ? 60 : 40;

                    return (
                        <g 
                            key={segment.id} 
                            onMouseDown={(e) => handleSegmentMouseDown(e, segment.id)}
                            onMouseEnter={() => setHoveredSegmentId(segment.id)}
                            onMouseLeave={() => setHoveredSegmentId(null)}
                            className="cursor-move group"
                        >
                            {/* Bounding Box - Dashed */}
                            <path 
                                d={segment.coordinates} 
                                fill="none"
                                stroke="#94a3b8" 
                                strokeWidth="3"
                                strokeDasharray="6 4"
                                className="opacity-70 group-hover:opacity-100 transition-opacity"
                            />
                             
                             {/* Callout Line */}
                             <line 
                                x1={segment.x} y1={segment.y + h/2}
                                x2={segment.x} y2={segment.y + h/2 + 40}
                                stroke="#94a3b8"
                                strokeWidth="2"
                             />

                             {/* Text Box Background */}
                             <rect
                                x={segment.x - (boxWidth / 2)}
                                y={segment.y + h/2 + 40}
                                width={boxWidth}
                                height={boxHeight}
                                fill="rgba(30, 41, 59, 0.95)"
                                stroke="#cbd5e1"
                                strokeWidth="2"
                                rx="6"
                                vectorEffect="non-scaling-stroke"
                             />

                            {/* Label Text */}
                            <text 
                                x={segment.x} 
                                y={segment.y + h/2 + (hasDesc ? 58 : 65)}
                                fill="#facc15" 
                                fontSize="12" 
                                fontWeight="bold"
                                textAnchor="middle" 
                                className="pointer-events-none select-none"
                            >
                                {segment.name}
                            </text>
                            
                             {/* Description Text */}
                            {hasDesc && (
                                <text 
                                    x={segment.x} 
                                    y={segment.y + h/2 + 78}
                                    fill="#e2e8f0" 
                                    fontSize="11" 
                                    fontWeight="normal"
                                    textAnchor="middle" 
                                    className="pointer-events-none select-none"
                                >
                                    {segment.description}
                                </text>
                            )}

                             {/* Selection Highlight */}
                            {isSelected && (
                                <path 
                                    d={segment.coordinates}
                                    stroke="#3b82f6"
                                    strokeWidth="4"
                                    fill="rgba(59, 130, 246, 0.1)"
                                    strokeDasharray="6 4"
                                />
                            )}

                             {/* Resize Handles (Only if selected) */}
                            {isSelected && renderResizeHandles(segment)}
                        </g>
                    );
                }

                if (segment.type === 'TEXT') {
                     return (
                        <g 
                            key={segment.id} 
                            onMouseDown={(e) => handleSegmentMouseDown(e, segment.id)}
                            onMouseEnter={() => setHoveredSegmentId(segment.id)}
                            onMouseLeave={() => setHoveredSegmentId(null)}
                            className="cursor-move"
                        >
                            {/* Invisible hit box using the coordinates path */}
                            <path 
                                d={segment.coordinates} 
                                fill="transparent" 
                                stroke={isSelected ? "#3b82f6" : "transparent"} 
                                strokeWidth="1"
                                strokeDasharray={isSelected ? "4 4" : ""}
                            />
                            
                            {/* Actual Text */}
                            <text
                                x={segment.x}
                                y={segment.y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill={segment.fontColor || 'white'}
                                fontSize={segment.fontSize || 14}
                                fontFamily={segment.fontFamily || 'Inter, sans-serif'}
                                className="select-none pointer-events-none"
                                style={{ 
                                    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                    fontWeight: '500'
                                }}
                            >
                                {segment.name}
                            </text>
                        </g>
                     );
                }

                return (
                    <g 
                        key={segment.id} 
                        onMouseDown={(e) => handleSegmentMouseDown(e, segment.id)}
                        onMouseEnter={() => setHoveredSegmentId(segment.id)}
                        onMouseLeave={() => setHoveredSegmentId(null)}
                        className="cursor-move hover:opacity-90 transition-opacity duration-200"
                    >
                        {/* Drop Shadow for depth */}
                        <path 
                            d={segment.coordinates} 
                            fill="black" 
                            fillOpacity="0.4"
                            transform="translate(4, 4)"
                        />

                        {/* Selection Highlight (Glow behind) */}
                        {isSelected && (
                            <path 
                                d={segment.coordinates}
                                stroke="#f97316"
                                strokeWidth={segment.type === 'RECTANGLE' || segment.type === 'CIRCLE' ? 4 : 8}
                                fill="none"
                                opacity="0.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        )}

                        {/* Structure Main Path - Solid Fill */}
                        <path 
                            d={segment.coordinates} 
                            fill={fillColor}
                            stroke={strokeColor} 
                            strokeWidth="2"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                        />
                        
                        {/* Insulation Casing / Outline - Scaled to offset "se sobre sai" */}
                        {showInsulation && (
                             <path 
                                d={segment.coordinates} 
                                fill="none"
                                stroke={insulColor}
                                strokeWidth="2" 
                                strokeDasharray="2 4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="pointer-events-none"
                                transform={`translate(${segment.x}, ${segment.y}) scale(1.15) translate(-${segment.x}, -${segment.y})`}
                            />
                        )}

                        {/* Render Weld Joints */}
                        {renderWeldJoints(segment)}

                        {/* Resize Handles (Only if selected) */}
                        {isSelected && renderResizeHandles(segment)}

                        {/* Label (Name) */}
                        <text 
                             x={segment.x} y={segment.y} 
                             fill={textColor}
                             filter="url(#textShadow)"
                             fontSize="12" 
                             fontWeight="bold"
                             textAnchor="middle" 
                             dy="-20"
                             className="pointer-events-none select-none transition-opacity duration-200"
                             opacity={showLabel ? 1 : 0}
                        >
                            {segment.name}
                        </text>

                         {/* Description below Label */}
                         {segment.description && segment.description !== 'undefined' && (
                             <text 
                                x={segment.x} y={segment.y} 
                                fill="#cbd5e1"
                                filter="url(#textShadow)"
                                fontSize="9" 
                                fontWeight="normal"
                                textAnchor="middle" 
                                dy="-6" 
                                className="pointer-events-none select-none transition-opacity duration-200"
                                opacity={showLabel ? 1 : 0}
                             >
                                {segment.description.length > 30 ? segment.description.substring(0, 30) + '...' : segment.description}
                            </text>
                         )}
                    </g>
                );
            })}

            {/* Selection Box Render (Transformed space) */}
            {selectionBox && (
                <rect 
                    x={Math.min(selectionBox.startX, selectionBox.currentX)}
                    y={Math.min(selectionBox.startY, selectionBox.currentY)}
                    width={Math.abs(selectionBox.currentX - selectionBox.startX)}
                    height={Math.abs(selectionBox.currentY - selectionBox.startY)}
                    fill="rgba(59, 130, 246, 0.1)"
                    stroke="#3b82f6"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    className="pointer-events-none"
                    vectorEffect="non-scaling-stroke"
                />
            )}

        </g>
      </svg>
    </div>
  );
};

export default PipelineVisualizer;
