import React, { useState, useRef } from 'react';
import { PipeSegment, StageStatus } from '../types';

interface PipelineVisualizerProps {
  segments: PipeSegment[];
  selectedSegmentId: string | null;
  onSelectSegment: (id: string) => void;
  onMoveSegment: (id: string, deltaX: number, deltaY: number) => void;
}

const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({ 
    segments, 
    selectedSegmentId, 
    onSelectSegment,
    onMoveSegment
}) => {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggedSegment, setDraggedSegment] = useState<string | null>(null);
  const [hoveredSegmentId, setHoveredSegmentId] = useState<string | null>(null);
  
  const lastMousePos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    if (draggedSegment) {
        onMoveSegment(draggedSegment, deltaX, deltaY);
        return;
    }

    if (isPanning) {
        setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedSegment(null);
  };

  const handleSegmentMouseDown = (e: React.MouseEvent, segId: string) => {
      e.stopPropagation(); 
      onSelectSegment(segId);
      setDraggedSegment(segId);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  // Helper to determine color based on status
  const getSegmentStyle = (segment: PipeSegment) => {
      const status = segment.stages.lifting.status; // Construction Status
      const hydroStatus = segment.stages.hydrotest.status; // Hydro Status (Only relevant for Pipes)

      // Default: Industrial Steel Blue
      let strokeColor = '#475569'; // Slate 600
      let fillColor = '#94a3b8';   // Slate 400
      let textColor = 'white';

      // --- COLOR PRIORITY LOGIC ---
      // 1. Hydrotest (Highest Priority for Visuals)
      if (hydroStatus === StageStatus.COMPLETED) {
           strokeColor = '#1d4ed8'; // Blue 700
           fillColor = '#3b82f6';   // Blue 500
      } else if (hydroStatus === StageStatus.IN_PROGRESS) {
           strokeColor = '#0e7490'; // Cyan 700
           fillColor = '#06b6d4';   // Cyan 500
      
      // 2. Construction (Lifting/Mounting)
      } else if (status === StageStatus.COMPLETED) {
          strokeColor = '#15803d'; // Green 700
          fillColor = '#22c55e';   // Green 500
      } else if (status === StageStatus.IN_PROGRESS) {
          strokeColor = '#a16207'; // Yellow 700
          fillColor = '#eab308';   // Yellow 500
      } else if (status === StageStatus.ISSUE || status === StageStatus.BLOCKED) {
          strokeColor = '#b91c1c'; // Red 700
          fillColor = '#ef4444';   // Red 500
      }

      // If just Not Started
      if (status === StageStatus.NOT_STARTED && hydroStatus === StageStatus.NOT_STARTED) {
          fillColor = '#78909c'; // Blue Grey
          strokeColor = '#37474f'; // Dark Blue Grey
      }

      return { strokeColor, fillColor, textColor };
  };

  return (
    <div 
        className="w-full h-full bg-[#1e293b] rounded-xl overflow-hidden relative shadow-2xl border border-slate-600 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
      <div className="absolute top-4 left-4 z-10 pointer-events-none select-none">
        <h2 className="text-white text-xl font-bold uppercase tracking-wider drop-shadow-md">Implantação de Suportes</h2>
        <p className="text-slate-300 text-sm">Tela Infinita: Arraste o fundo para mover. Clique e arraste para posicionar.</p>
        <div className="mt-2 flex gap-4 text-[10px] text-white bg-slate-800/80 p-2 rounded backdrop-blur-sm inline-flex border border-slate-700">
             <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm border border-slate-600 bg-[#78909c]"></span> Pendente</span>
             <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm border border-yellow-700 bg-yellow-500"></span> Montando</span>
             <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm border border-green-700 bg-green-500"></span> Montado</span>
             <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm border border-cyan-700 bg-cyan-500"></span> Em Teste</span>
             <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm border border-blue-700 bg-blue-500"></span> Testado</span>
        </div>
      </div>

      <svg 
        width="100%" 
        height="100%" 
        style={{ touchAction: 'none' }}
      >
        <defs>
            <pattern id="floorGrid" x={pan.x} y={pan.y} width="100" height="50" patternUnits="userSpaceOnUse">
                <path d="M 100 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
            </pattern>
            {/* Filter for text shadow to make it readable on solid colors */}
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

        <g transform={`translate(${pan.x}, ${pan.y})`}>
            
            {segments.map((segment) => {
                const isSelected = selectedSegmentId === segment.id;
                const isHovered = hoveredSegmentId === segment.id;
                const showLabel = isSelected || isHovered;
                const { strokeColor, fillColor, textColor } = getSegmentStyle(segment);

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
                                strokeWidth="8"
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
                        
                        {/* Label - Only shown on Hover or Select to prevent clutter */}
                        <text 
                             x={segment.x} y={segment.y} 
                             fill={textColor}
                             filter="url(#textShadow)"
                             fontSize="12" 
                             fontWeight="bold"
                             textAnchor="middle" 
                             dy="-15"
                             className="pointer-events-none select-none transition-opacity duration-200"
                             opacity={showLabel ? 1 : 0}
                        >
                            {segment.name}
                        </text>
                    </g>
                );
            })}

        </g>
      </svg>
    </div>
  );
};

export default PipelineVisualizer;