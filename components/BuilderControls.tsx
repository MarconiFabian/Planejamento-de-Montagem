import React from 'react';
import { Box, RotateCcw, ArrowUpFromLine, ArrowLeftRight, CheckCircle2, XCircle, Copy, Cylinder, CornerDownRight, RefreshCcw, UtilityPole, Hammer, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Move, Droplet, ClipboardCheck } from 'lucide-react';
import { StageStatus } from '../types';

interface BuilderControlsProps {
  onAddSupport: () => void;
  onAddPipe: () => void;
  onAddElbow: () => void;
  onAddCantilever: () => void;
  onReset: () => void;
  selectedSegmentId: string | null;
  currentStatus?: StageStatus; 
  currentHydroStatus?: StageStatus;
  selectedSegmentType?: string;
  onResizeSupport: (deltaWidth: number, deltaHeight: number) => void;
  onCloneSupport?: () => void;
  onRotateSegment?: () => void;
  onUpdateStatus?: (id: string, stage: string, status: StageStatus) => void;
  currentDiameter: number;
  onDiameterChange: (d: number) => void;
  onMoveSegment?: (dx: number, dy: number) => void;
}

const BuilderControls: React.FC<BuilderControlsProps> = ({ 
    onAddSupport,
    onAddPipe,
    onAddElbow,
    onAddCantilever,
    onReset,
    selectedSegmentId,
    currentStatus,
    currentHydroStatus,
    selectedSegmentType,
    onResizeSupport,
    onCloneSupport,
    onRotateSegment,
    onUpdateStatus,
    currentDiameter,
    onDiameterChange,
    onMoveSegment
}) => {
  
  // Mapping sizes to labels
  const diameters = [
      { size: 10, label: '4"' },
      { size: 15, label: '6"' },
      { size: 20, label: '8"' },
      { size: 25, label: '10"' },
  ];

  const isPipeOrElbow = selectedSegmentType === 'PIPE' || selectedSegmentType === 'ELBOW';

  return (
    <div className="absolute top-4 right-4 z-20 bg-white p-3 rounded-xl shadow-2xl border border-slate-200 flex flex-col gap-3 w-60">
        <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
            <Box size={16} className="text-blue-600"/>
            Construtor
        </h3>
        
        {/* Diameter Selector */}
        <div className="bg-slate-50 p-2 rounded border border-slate-100 flex flex-col gap-1">
             <span className="text-[10px] font-bold text-slate-400 uppercase">Diâmetro Nominal</span>
             <div className="flex justify-between gap-1">
                 {diameters.map((d) => (
                     <button
                        key={d.label}
                        onClick={() => onDiameterChange(d.size)}
                        className={`
                            flex-1 h-8 rounded-md text-xs font-bold border transition-all flex items-center justify-center
                            ${currentDiameter === d.size 
                                ? 'bg-blue-600 text-white border-blue-700 shadow-md scale-105' 
                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}
                        `}
                     >
                         {d.label}
                     </button>
                 ))}
             </div>
        </div>

        {/* Components Grid - Organized logically: Supports Top, Pipes Bottom */}
        <div className="grid grid-cols-2 gap-1">
            <button 
                onClick={onAddSupport}
                className="flex flex-col items-center justify-center gap-1 p-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 text-[10px] font-bold transition-all"
                title="Novo Suporte"
            >
                <Box size={18} className="text-blue-600"/> Base
            </button>
            <button 
                onClick={onAddCantilever}
                className="flex flex-col items-center justify-center gap-1 p-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 text-[10px] font-bold transition-all"
                title="Nova Mão Francesa"
            >
                <UtilityPole size={18} className="text-orange-500"/> Suporte T
            </button>
            <button 
                onClick={onAddPipe}
                className="flex flex-col items-center justify-center gap-1 p-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 text-[10px] font-bold transition-all"
                title="Novo Tubo"
            >
                <Cylinder size={18} className="text-slate-600"/> Tubo
            </button>
            <button 
                onClick={onAddElbow}
                className="flex flex-col items-center justify-center gap-1 p-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 text-[10px] font-bold transition-all"
                title="Nova Curva"
            >
                <CornerDownRight size={18} className="text-slate-600"/> Curva
            </button>
        </div>

        <div className="h-px bg-slate-200 my-1"></div>

        {selectedSegmentId ? (
            <div className="flex flex-col gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Editar</span>
                    <div className="flex gap-1">
                        <button 
                            onClick={onRotateSegment}
                            className="text-xs flex items-center gap-1 text-slate-600 hover:text-blue-600 bg-white px-2 py-1 rounded border border-slate-200 transition-colors"
                            title="Girar Peça"
                        >
                            <RefreshCcw size={12} /> Girar
                        </button>
                        <button 
                            onClick={onCloneSupport}
                            className="text-xs flex items-center gap-1 text-slate-600 hover:text-blue-600 bg-white px-2 py-1 rounded border border-slate-200 transition-colors"
                            title="Duplicar"
                        >
                            <Copy size={12} /> Copiar
                        </button>
                    </div>
                </div>
                
                {/* Construction Status Controls */}
                <div className="grid grid-cols-3 gap-1">
                     <button 
                         onClick={() => onUpdateStatus && onUpdateStatus(selectedSegmentId, 'lifting', StageStatus.NOT_STARTED)}
                        className={`flex flex-col items-center justify-center gap-1 p-2 rounded text-[10px] font-bold shadow-sm transition-all
                            ${currentStatus === StageStatus.NOT_STARTED 
                                ? 'bg-slate-600 text-white ring-2 ring-slate-300' 
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                        title="Marcar como Pendente"
                    >
                        <XCircle size={14} /> Falta
                    </button>
                    
                    <button 
                        onClick={() => onUpdateStatus && onUpdateStatus(selectedSegmentId, 'lifting', StageStatus.IN_PROGRESS)}
                        className={`flex flex-col items-center justify-center gap-1 p-2 rounded text-[10px] font-bold shadow-sm transition-all
                            ${currentStatus === StageStatus.IN_PROGRESS 
                                ? 'bg-yellow-500 text-white ring-2 ring-yellow-300' 
                                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}
                        title="Marcar como Montando"
                    >
                        <Hammer size={14} /> Montando
                    </button>

                    <button 
                        onClick={() => onUpdateStatus && onUpdateStatus(selectedSegmentId, 'lifting', StageStatus.COMPLETED)}
                        className={`flex flex-col items-center justify-center gap-1 p-2 rounded text-[10px] font-bold shadow-sm transition-all
                            ${currentStatus === StageStatus.COMPLETED 
                                ? 'bg-green-600 text-white ring-2 ring-green-300' 
                                : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                        title="Marcar como Pronto"
                    >
                        <CheckCircle2 size={14} /> Pronto
                    </button>
                </div>

                {/* Hydro Test Controls - ONLY for Pipe/Elbow */}
                {isPipeOrElbow && (
                    <div className="mt-1 bg-blue-50 p-2 rounded border border-blue-100">
                        <span className="text-[10px] font-bold text-blue-500 uppercase block mb-1">Teste Hidrostático</span>
                        <div className="grid grid-cols-2 gap-1">
                             <button 
                                onClick={() => {
                                    if (onUpdateStatus && selectedSegmentId) {
                                        const next = currentHydroStatus === StageStatus.IN_PROGRESS ? StageStatus.NOT_STARTED : StageStatus.IN_PROGRESS;
                                        onUpdateStatus(selectedSegmentId, 'hydrotest', next);
                                    }
                                }}
                                className={`flex flex-col items-center justify-center gap-1 p-2 rounded text-[10px] font-bold shadow-sm transition-all
                                    ${currentHydroStatus === StageStatus.IN_PROGRESS 
                                        ? 'bg-cyan-500 text-white ring-2 ring-cyan-300' 
                                        : 'bg-white text-cyan-600 hover:bg-cyan-50'}`}
                            >
                                <Droplet size={14} /> Em Teste
                            </button>
                            <button 
                                onClick={() => {
                                    if (onUpdateStatus && selectedSegmentId) {
                                        const next = currentHydroStatus === StageStatus.COMPLETED ? StageStatus.NOT_STARTED : StageStatus.COMPLETED;
                                        onUpdateStatus(selectedSegmentId, 'hydrotest', next);
                                    }
                                }}
                                className={`flex flex-col items-center justify-center gap-1 p-2 rounded text-[10px] font-bold shadow-sm transition-all
                                    ${currentHydroStatus === StageStatus.COMPLETED 
                                        ? 'bg-blue-600 text-white ring-2 ring-blue-300' 
                                        : 'bg-white text-blue-600 hover:bg-blue-50'}`}
                            >
                                <ClipboardCheck size={14} /> Testado
                            </button>
                        </div>
                    </div>
                )}

                {/* Dimensions Controls - Adjusted for Subtle delta (2px) */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                    <button onClick={() => onResizeSupport(0, 2)} className="bg-white border hover:bg-slate-100 rounded p-1 text-xs flex flex-col items-center">
                        <ArrowUpFromLine size={14} className="mb-1 text-blue-500"/> + Altura
                    </button>
                    <button onClick={() => onResizeSupport(0, -2)} className="bg-white border hover:bg-slate-100 rounded p-1 text-xs flex flex-col items-center">
                        <ArrowUpFromLine size={14} className="mb-1 rotate-180 text-blue-500"/> - Altura
                    </button>
                    <button onClick={() => onResizeSupport(2, 0)} className="bg-white border hover:bg-slate-100 rounded p-1 text-xs flex flex-col items-center">
                        <ArrowLeftRight size={14} className="mb-1 text-orange-500"/> + Comp.
                    </button>
                    <button onClick={() => onResizeSupport(-2, 0)} className="bg-white border hover:bg-slate-100 rounded p-1 text-xs flex flex-col items-center">
                        <ArrowLeftRight size={14} className="mb-1 text-orange-500"/> - Comp.
                    </button>
                </div>

                {/* Fine Positioning Controls */}
                <div className="mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                    <div className="flex items-center gap-1 justify-center mb-1">
                        <Move size={12} className="text-slate-400"/>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Ajuste Fino</span>
                    </div>
                    <div className="flex justify-center gap-1">
                        <button onClick={() => onMoveSegment && onMoveSegment(-1, 0)} className="p-1 bg-white border rounded hover:bg-blue-50">
                            <ArrowLeft size={14} className="text-slate-600"/>
                        </button>
                        <div className="flex flex-col gap-1">
                             <button onClick={() => onMoveSegment && onMoveSegment(0, -1)} className="p-1 bg-white border rounded hover:bg-blue-50">
                                <ArrowUp size={14} className="text-slate-600"/>
                            </button>
                            <button onClick={() => onMoveSegment && onMoveSegment(0, 1)} className="p-1 bg-white border rounded hover:bg-blue-50">
                                <ArrowDown size={14} className="text-slate-600"/>
                            </button>
                        </div>
                        <button onClick={() => onMoveSegment && onMoveSegment(1, 0)} className="p-1 bg-white border rounded hover:bg-blue-50">
                            <ArrowRight size={14} className="text-slate-600"/>
                        </button>
                    </div>
                </div>
            </div>
        ) : (
            <div className="text-center py-4 text-slate-400 text-xs italic">
                Selecione uma peça para editar.
            </div>
        )}

        <div className="h-px bg-slate-200 my-1"></div>

        <button 
            onClick={onReset}
            className="flex items-center justify-center gap-2 p-2 text-red-500 hover:bg-red-50 rounded text-xs font-medium transition-colors"
        >
            <RotateCcw size={14} /> Limpar Tudo
        </button>
    </div>
  );
};

export default BuilderControls;