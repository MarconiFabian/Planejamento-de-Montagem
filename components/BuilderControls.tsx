
import React, { useState } from 'react';
import { Box, RotateCcw, ArrowUpFromLine, ArrowLeftRight, CheckCircle2, XCircle, Copy, Cylinder, CornerDownRight, RefreshCcw, UtilityPole, Hammer, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Move, Droplet, ClipboardCheck, Square, Circle, Flame, Package, MapPin, CalendarDays, Type } from 'lucide-react';
import { StageStatus, PipeSegment } from '../types';

interface BuilderControlsProps {
  onAddSupport: () => void;
  onAddPipe: () => void;
  onAddElbow: () => void;
  onAddCantilever: () => void;
  onAddRectangle: () => void;
  onAddCircle: () => void;
  onAddFloatingSupport: () => void; // New
  onAddText: () => void; // New Text Button
  onReset: () => void;
  selectedSegmentIds: string[]; // Updated prop
  selectedSegmentId: string | null; // Kept for logic if needed (primary selection)
  currentStatus?: StageStatus; 
  currentHydroStatus?: StageStatus;
  currentWeldingStatus?: StageStatus; // Global status (kept for compatibility)
  currentJoints?: StageStatus[]; // New: Independent joint statuses
  selectedSegmentType?: string;
  selectedSegmentName?: string;
  selectedSegmentDescription?: string;
  // Text Properties
  selectedSegmentFontSize?: number;
  selectedSegmentFontColor?: string;
  selectedSegmentFontFamily?: string;
  onUpdateTextStyle?: (style: { fontSize?: number, fontColor?: string, fontFamily?: string }) => void;

  onResizeSupport: (deltaWidth: number, deltaHeight: number) => void;
  onCloneSupport?: () => void;
  onRotateSegment?: () => void;
  onUpdateStatus?: (id: string, stage: string, status: StageStatus, date?: string) => void;
  onUpdateJointStatus?: (id: string, jointIndex: number, status: StageStatus) => void;
  currentDiameter: number;
  onDiameterChange: (d: number) => void;
  onMoveSegment?: (dx: number, dy: number) => void;
  currentInsulationStatus?: StageStatus; // Added prop manually handled in component usage below via lookup
  hasPipeOrElbowSelected?: boolean; // New prop for bulk context
  segments: PipeSegment[]; // New prop to check types for filtering
  onCreateZone?: () => void;
  onUpdateSegmentLabel?: (id: string, name: string) => void;
  onUpdateSegmentDescription?: (id: string, description: string) => void;
}

const BuilderControls: React.FC<BuilderControlsProps> = ({ 
    onAddSupport,
    onAddPipe,
    onAddElbow,
    onAddCantilever,
    onAddRectangle,
    onAddCircle,
    onAddFloatingSupport,
    onAddText,
    onReset,
    selectedSegmentIds,
    selectedSegmentId,
    currentStatus,
    currentHydroStatus,
    currentJoints,
    selectedSegmentType,
    selectedSegmentName,
    selectedSegmentDescription,
    selectedSegmentFontSize,
    selectedSegmentFontColor,
    selectedSegmentFontFamily,
    onUpdateTextStyle,
    onResizeSupport,
    onCloneSupport,
    onRotateSegment,
    onUpdateStatus,
    onUpdateJointStatus,
    currentDiameter,
    onDiameterChange,
    onMoveSegment,
    hasPipeOrElbowSelected,
    segments,
    onCreateZone,
    onUpdateSegmentLabel,
    onUpdateSegmentDescription
}) => {
  
  // State for the Action Date
  const [actionDate, setActionDate] = useState(new Date().toISOString().split('T')[0]);

  // Mapping sizes to labels
  const diameters = [
      { size: 10, label: '4"' },
      { size: 15, label: '6"' },
      { size: 20, label: '8"' },
      { size: 25, label: '10"' },
  ];

  // Helper: Apply status to ALL selected segments, BUT filtering by type for specific stages
  const handleBulkStatusUpdate = (stage: string, status: StageStatus) => {
      if (onUpdateStatus) {
          selectedSegmentIds.forEach(id => {
              const seg = segments.find(s => s.id === id);
              
              if (!seg) return;

              // Rule: Hydrotest and Insulation apply ONLY to Pipe or Elbow
              if (stage === 'hydrotest' || stage === 'insulation') {
                  if (seg.type !== 'PIPE' && seg.type !== 'ELBOW') {
                      return; // Skip supports/shapes
                  }
              }

              // General Welding (not joints) applies ONLY to Pipe/Elbow too in this context
              // (If supports had welding, we'd need a separate check, but user asked to fix pipes)
              if (stage === 'welding') {
                 if (seg.type !== 'PIPE' && seg.type !== 'ELBOW') {
                      return; 
                  }
              }

              onUpdateStatus(id, stage, status, actionDate);
          });
      }
  };

  // Helper: Mark EVERYTHING as Completed for the selected items
  // Used for the "Pronto" button to ensure Supports don't get stuck with "Missing Welding" status in reports
  const handleMarkEntirelyComplete = () => {
      if (!onUpdateStatus) return;

      selectedSegmentIds.forEach(id => {
          const seg = segments.find(s => s.id === id);
          if (!seg) return;

          // Etapas básicas que todo mundo tem
          const stagesToUpdate = ['scaffolding', 'lifting', 'welding', 'inspection'];

          // Adiciona etapas extras APENAS se for Tubo ou Curva
          // Isso evita que Suportes fiquem com status de Hidroteste COMPLETED (que gera a cor azul)
          if (seg.type === 'PIPE' || seg.type === 'ELBOW') {
              stagesToUpdate.push('hydrotest', 'insulation');
          }

          stagesToUpdate.forEach(stage => {
              onUpdateStatus(id, stage, StageStatus.COMPLETED, actionDate);
          });
      });
  };

  const handleBulkJointUpdate = (jointIndex: number, status: StageStatus) => {
      if (onUpdateJointStatus) {
          selectedSegmentIds.forEach(id => {
              const seg = segments.find(s => s.id === id);
              // Rule: Joints only exist on Pipe or Elbow
              if (seg && (seg.type === 'PIPE' || seg.type === 'ELBOW')) {
                   onUpdateJointStatus(id, jointIndex, status);
              }
          });
      }
  };

  const isPipeOrElbow = selectedSegmentType === 'PIPE' || selectedSegmentType === 'ELBOW' || hasPipeOrElbowSelected;

  // Helper to render weld buttons for a specific joint
  const renderWeldButtons = (jointIndex: number, label: string) => {
      const status = currentJoints && currentJoints[jointIndex] ? currentJoints[jointIndex] : StageStatus.NOT_STARTED;
      
      return (
        <div className="mb-1">
            <span className="text-[9px] font-bold text-orange-400 uppercase block mb-0.5 ml-1">{label}</span>
            <div className="grid grid-cols-3 gap-1">
                <button 
                    onClick={() => handleBulkJointUpdate(jointIndex, StageStatus.NOT_STARTED)}
                    className={`flex flex-col items-center justify-center gap-0.5 p-1.5 rounded text-[9px] font-bold shadow-sm transition-all
                        ${status === StageStatus.NOT_STARTED 
                            ? 'bg-red-500 text-white ring-2 ring-red-300' 
                            : 'bg-white text-red-600 hover:bg-red-50'}`}
                    title="Falta Soldar"
                >
                    <XCircle size={12} /> Falta
                </button>
                <button 
                    onClick={() => handleBulkJointUpdate(jointIndex, StageStatus.IN_PROGRESS)}
                    className={`flex flex-col items-center justify-center gap-0.5 p-1.5 rounded text-[9px] font-bold shadow-sm transition-all
                        ${status === StageStatus.IN_PROGRESS 
                            ? 'bg-orange-500 text-white ring-2 ring-orange-300' 
                            : 'bg-white text-orange-600 hover:bg-orange-50'}`}
                    title="Soldando"
                >
                    <Flame size={12} /> Soldando
                </button>
                <button 
                    onClick={() => handleBulkJointUpdate(jointIndex, StageStatus.COMPLETED)}
                    className={`flex flex-col items-center justify-center gap-0.5 p-1.5 rounded text-[9px] font-bold shadow-sm transition-all
                        ${status === StageStatus.COMPLETED 
                            ? 'bg-green-600 text-white ring-2 ring-green-300' 
                            : 'bg-white text-green-600 hover:bg-green-50'}`}
                    title="Soldado"
                >
                    <CheckCircle2 size={12} /> Soldado
                </button>
            </div>
        </div>
      );
  };

  return (
    <div className="absolute top-4 right-4 z-20 bg-white p-3 rounded-xl shadow-2xl border border-slate-200 flex flex-col gap-3 w-60 max-h-[90vh] overflow-y-auto">
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

        {/* Components Grid */}
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
        
        {/* Basic Shapes */}
        <div className="grid grid-cols-4 gap-1 mt-1">
             <button 
                onClick={onAddRectangle}
                className="flex flex-col items-center justify-center gap-1 p-2 bg-slate-50 text-slate-600 rounded hover:bg-slate-100 border border-dashed border-slate-300 text-[10px] font-bold transition-all"
                title="Novo Retângulo"
            >
                <Square size={16} /> Retângulo
            </button>
            <button 
                onClick={onAddCircle}
                className="flex flex-col items-center justify-center gap-1 p-2 bg-slate-50 text-slate-600 rounded hover:bg-slate-100 border border-dashed border-slate-300 text-[10px] font-bold transition-all"
                title="Novo Círculo"
            >
                <Circle size={16} /> Círculo
            </button>
            <button 
                onClick={onAddFloatingSupport}
                className="flex flex-col items-center justify-center gap-1 p-2 bg-slate-50 text-slate-600 rounded hover:bg-slate-100 border border-dashed border-slate-300 text-[10px] font-bold transition-all"
                title="Suporte Flutuante"
            >
                <Package size={16} /> Flutuante
            </button>
            <button 
                onClick={onAddText}
                className="flex flex-col items-center justify-center gap-1 p-2 bg-slate-50 text-slate-600 rounded hover:bg-slate-100 border border-dashed border-slate-300 text-[10px] font-bold transition-all"
                title="Adicionar Texto"
            >
                <Type size={16} /> Texto
            </button>
        </div>

        <div className="h-px bg-slate-200 my-1"></div>

        {selectedSegmentIds.length > 0 ? (
            <div className="flex flex-col gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {selectedSegmentIds.length > 1 ? `Editando ${selectedSegmentIds.length} itens` : 'Editar'}
                    </span>
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

                {/* Name / Description Fields */}
                {selectedSegmentId && (
                    <div className="flex flex-col gap-2">
                        {/* TEXT SPECIFIC CONTROLS */}
                        {selectedSegmentType === 'TEXT' && onUpdateTextStyle && (
                            <div className="flex flex-col gap-2 p-2 bg-white rounded border border-slate-200 shadow-sm mb-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Estilo do Texto</span>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[9px] text-slate-400 block">Tamanho</label>
                                        <input 
                                            type="number" 
                                            className="w-full text-xs p-1 border border-slate-300 rounded"
                                            value={selectedSegmentFontSize || 14}
                                            onChange={(e) => onUpdateTextStyle({ fontSize: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-slate-400 block">Cor</label>
                                        <div className="flex gap-1">
                                            <input 
                                                type="color" 
                                                className="w-full h-6 border-0 p-0 rounded cursor-pointer"
                                                value={selectedSegmentFontColor || '#ffffff'}
                                                onChange={(e) => onUpdateTextStyle({ fontColor: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] text-slate-400 block">Fonte</label>
                                    <select 
                                        className="w-full text-xs p-1 border border-slate-300 rounded bg-white"
                                        value={selectedSegmentFontFamily || 'Inter'}
                                        onChange={(e) => onUpdateTextStyle({ fontFamily: e.target.value })}
                                    >
                                        <option value="Inter">Padrão (Inter)</option>
                                        <option value="Arial">Arial</option>
                                        <option value="Courier New">Courier New</option>
                                        <option value="Times New Roman">Times New Roman</option>
                                        <option value="Verdana">Verdana</option>
                                        <option value="Impact">Impact</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* NAME / LOCAL / TEXT CONTENT */}
                        {selectedSegmentIds.length === 1 && onUpdateSegmentLabel && (
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">
                                    {selectedSegmentType === 'TEXT' ? 'Conteúdo do Texto' : 'Local / Identificação'}
                                </label>
                                {selectedSegmentType === 'TEXT' ? (
                                    <textarea 
                                        className="w-full text-sm p-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-slate-900 bg-white"
                                        rows={3}
                                        value={selectedSegmentName || ''}
                                        onChange={(e) => onUpdateSegmentLabel(selectedSegmentId, e.target.value)}
                                    />
                                ) : (
                                    <input 
                                        type="text" 
                                        className="w-full text-xs p-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-slate-900 bg-white"
                                        value={selectedSegmentName || ''}
                                        onChange={(e) => onUpdateSegmentLabel(selectedSegmentId, e.target.value)}
                                    />
                                )}
                            </div>
                        )}

                        {/* DESCRIPTION / INFO - Multi Item Support (Hide for Text to save space) */}
                        {onUpdateSegmentDescription && selectedSegmentType !== 'TEXT' && (
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Informações Adicionais</label>
                                <textarea 
                                    className="w-full text-xs p-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-slate-900 bg-white resize-none"
                                    rows={2}
                                    value={selectedSegmentDescription || ''}
                                    onChange={(e) => onUpdateSegmentDescription(selectedSegmentId, e.target.value)}
                                    placeholder={selectedSegmentIds.length > 1 ? "Editar descrição de todos..." : "Descrição..."}
                                />
                            </div>
                        )}
                    </div>
                )}
                
                {/* Zone Creation */}
                {onCreateZone && (
                     <button 
                        onClick={onCreateZone}
                        className="w-full flex items-center justify-center gap-1 p-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold hover:bg-indigo-100"
                        title="Marcar Local de Trabalho em Volta da Seleção"
                    >
                        <MapPin size={12} /> Marcar Local de Atividade
                    </button>
                )}

                {/* Construction Date Input */}
                <div className="flex flex-col gap-1 mt-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <CalendarDays size={12} /> Data de Referência
                    </label>
                    <input 
                        type="date" 
                        value={actionDate}
                        onChange={(e) => setActionDate(e.target.value)}
                        className="w-full text-xs p-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-slate-900 bg-white"
                    />
                </div>

                {/* Construction Status Controls */}
                <div className="grid grid-cols-3 gap-1">
                     <button 
                         onClick={() => handleBulkStatusUpdate('lifting', StageStatus.NOT_STARTED)}
                        className={`flex flex-col items-center justify-center gap-1 p-2 rounded text-[10px] font-bold shadow-sm transition-all
                            ${currentStatus === StageStatus.NOT_STARTED 
                                ? 'bg-slate-600 text-white ring-2 ring-slate-300' 
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                        title="Marcar como Pendente"
                    >
                        <XCircle size={14} /> Falta
                    </button>
                    
                    <button 
                        onClick={() => handleBulkStatusUpdate('lifting', StageStatus.IN_PROGRESS)}
                        className={`flex flex-col items-center justify-center gap-1 p-2 rounded text-[10px] font-bold shadow-sm transition-all
                            ${currentStatus === StageStatus.IN_PROGRESS 
                                ? 'bg-yellow-500 text-white ring-2 ring-yellow-300' 
                                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}
                        title="Marcar como Montando"
                    >
                        <Hammer size={14} /> Montando
                    </button>

                    <button 
                        onClick={handleMarkEntirelyComplete}
                        className={`flex flex-col items-center justify-center gap-1 p-2 rounded text-[10px] font-bold shadow-sm transition-all
                            ${currentStatus === StageStatus.COMPLETED 
                                ? 'bg-green-600 text-white ring-2 ring-green-300' 
                                : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                        title="Marcar TUDO como Concluído (Limpa Pendências)"
                    >
                        <CheckCircle2 size={14} /> Pronto
                    </button>
                </div>

                {/* Independent Welding Controls - ONLY for Pipe/Elbow */}
                {isPipeOrElbow && (
                    <div className="mt-1 bg-orange-50 p-2 rounded border border-orange-100">
                        <span className="text-[10px] font-bold text-orange-600 uppercase block mb-1 flex items-center gap-1"><Flame size={12}/> Soldagem (Juntas)</span>
                        {renderWeldButtons(0, "Junta 1 (Início)")}
                        {renderWeldButtons(1, "Junta 2 (Fim)")}
                    </div>
                )}

                {/* Hydro Test Controls - ONLY for Pipe/Elbow */}
                {isPipeOrElbow && (
                    <div className="mt-1 bg-blue-50 p-2 rounded border border-blue-100">
                        <span className="text-[10px] font-bold text-blue-500 uppercase block mb-1">Teste Hidrostático</span>
                        <div className="grid grid-cols-2 gap-1">
                             <button 
                                onClick={() => {
                                    const next = currentHydroStatus === StageStatus.IN_PROGRESS ? StageStatus.NOT_STARTED : StageStatus.IN_PROGRESS;
                                    handleBulkStatusUpdate('hydrotest', next);
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
                                    const next = currentHydroStatus === StageStatus.COMPLETED ? StageStatus.NOT_STARTED : StageStatus.COMPLETED;
                                    handleBulkStatusUpdate('hydrotest', next);
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

                {/* Insulation Controls - ONLY for Pipe/Elbow */}
                {isPipeOrElbow && (
                    <div className="mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1 flex items-center gap-1"><Package size={12}/> Proteção Térmica</span>
                        <div className="grid grid-cols-3 gap-1">
                            <button 
                                onClick={() => handleBulkStatusUpdate('insulation', StageStatus.NOT_STARTED)}
                                className="flex flex-col items-center justify-center gap-0.5 p-1.5 rounded text-[9px] font-bold bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
                                title="Falta Isolamento"
                            >
                                Falta
                            </button>
                            <button 
                                onClick={() => handleBulkStatusUpdate('insulation', StageStatus.IN_PROGRESS)}
                                className="flex flex-col items-center justify-center gap-0.5 p-1.5 rounded text-[9px] font-bold bg-white text-yellow-600 hover:bg-yellow-50 border border-slate-200"
                                title="Montando Isolamento"
                            >
                                Montagem
                            </button>
                            <button 
                                onClick={() => handleBulkStatusUpdate('insulation', StageStatus.COMPLETED)}
                                className="flex flex-col items-center justify-center gap-0.5 p-1.5 rounded text-[9px] font-bold bg-white text-green-600 hover:bg-green-50 border border-slate-200"
                                title="Isolamento Pronto"
                            >
                                Pronto
                            </button>
                        </div>
                    </div>
                )}

                {/* Dimensions Controls (Not for Text) */}
                {selectedSegmentType !== 'TEXT' && (
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
                )}

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
