import React, { useState, useEffect } from 'react';
import { PipeSegment, StageStatus, PipelineStage } from '../types';
import { 
    Hammer, 
    Construction, // For Scaffolding replacement
    Flame, 
    ShieldCheck, 
    Droplets, 
    Package, 
    AlertTriangle, 
    CheckCircle2, 
    Circle,
    Truck, // For Lifting
    Bot,
    ClipboardList // For Planning Icon
} from 'lucide-react';
import { getAIAdviceForSegment } from '../services/geminiService';

interface ControlPanelProps {
  segment: PipeSegment | null;
  onUpdateStatus: (segmentId: string, stageKey: string, newStatus: StageStatus) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ segment, onUpdateStatus }) => {
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    if (segment) {
      setLoadingAi(true);
      setAiAdvice(null);
      
      // Debounce API calls by 800ms to prevent hitting rate limits when switching segments quickly
      const timer = setTimeout(() => {
          getAIAdviceForSegment(segment)
            .then(advice => setAiAdvice(advice))
            .catch(() => setAiAdvice("Erro ao carregar IA."))
            .finally(() => setLoadingAi(false));
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [segment]);

  if (!segment) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-white border-l border-slate-200">
        <ClipboardList size={48} className="mb-4 text-blue-200" />
        <h3 className="text-lg font-semibold text-slate-600">Planejamento Visual</h3>
        <p className="mt-2 text-sm">Selecione um pacote de trabalho (trecho) no mapa para atualizar as atividades.</p>
      </div>
    );
  }

  const renderStage = (key: string, stage: PipelineStage) => {
    const statusColors = {
      [StageStatus.NOT_STARTED]: 'bg-slate-100 text-slate-400 border-slate-200',
      [StageStatus.IN_PROGRESS]: 'bg-blue-50 text-blue-600 border-blue-200',
      [StageStatus.COMPLETED]: 'bg-green-50 text-green-600 border-green-200',
      [StageStatus.BLOCKED]: 'bg-orange-50 text-orange-500 border-orange-200',
      [StageStatus.ISSUE]: 'bg-red-50 text-red-600 border-red-200',
    };

    const StatusIcon = () => {
        switch(stage.status) {
            case StageStatus.COMPLETED: return <CheckCircle2 size={18} />;
            case StageStatus.ISSUE: return <AlertTriangle size={18} />;
            default: return <Circle size={18} />;
        }
    }

    const getIcon = (iconName: string) => {
        switch(iconName) {
            case 'Scaffold': return <Construction size={20} />;
            case 'Crane': return <Truck size={20} />;
            case 'Flame': return <Flame size={20} />;
            case 'ShieldCheck': return <ShieldCheck size={20} />;
            case 'Droplet': return <Droplets size={20} />;
            case 'Package': return <Package size={20} />;
            default: return <Hammer size={20} />;
        }
    }

    return (
      <div key={stage.id} className="mb-4 p-3 bg-white rounded-lg border border-slate-200 shadow-sm transition-all hover:shadow-md">
        <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-md ${statusColors[stage.status]} bg-opacity-20`}>
                    {getIcon(stage.icon)}
                </div>
                <div>
                    <h4 className="font-semibold text-slate-700 text-sm">{stage.label}</h4>
                    <p className="text-xs text-slate-500">{stage.requiredResources.join(', ')}</p>
                </div>
            </div>
            <div className={`text-xs px-2 py-1 rounded-full border font-medium flex items-center gap-1 ${statusColors[stage.status]}`}>
                <StatusIcon />
                {stage.status === StageStatus.NOT_STARTED ? 'Não Iniciado' : 
                 stage.status === StageStatus.IN_PROGRESS ? 'Em Andamento' :
                 stage.status === StageStatus.COMPLETED ? 'Concluído' :
                 stage.status === StageStatus.ISSUE ? 'Com Pendência' : 'Bloqueado'}
            </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2 mt-3">
            <button 
                onClick={() => onUpdateStatus(segment.id, key, StageStatus.IN_PROGRESS)}
                className="flex-1 py-1.5 px-2 bg-blue-50 text-blue-600 text-xs font-medium rounded hover:bg-blue-100 transition-colors"
            >
                Iniciar
            </button>
            <button 
                onClick={() => onUpdateStatus(segment.id, key, StageStatus.COMPLETED)}
                className="flex-1 py-1.5 px-2 bg-green-50 text-green-600 text-xs font-medium rounded hover:bg-green-100 transition-colors"
            >
                Concluir
            </button>
            <button 
                 onClick={() => onUpdateStatus(segment.id, key, StageStatus.ISSUE)}
                className="py-1.5 px-3 bg-slate-50 text-slate-500 text-xs font-medium rounded hover:bg-red-50 hover:text-red-500 transition-colors"
                title="Reportar Pendência"
            >
                <AlertTriangle size={14} />
            </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-slate-50 border-l border-slate-200 overflow-y-auto flex flex-col">
      {/* Header Info */}
      <div className="p-6 bg-white border-b border-slate-200">
        <div className="flex justify-between items-start mb-2">
             <h2 className="text-xl font-bold text-slate-800">{segment.name}</h2>
             <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded font-mono">{segment.id}</span>
        </div>
        <p className="text-sm text-slate-500 mb-4">{segment.description}</p>
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <span className="block text-xs text-slate-400 uppercase">Status Global</span>
                <span className="font-semibold text-slate-700">
                    {(Object.values(segment.stages) as PipelineStage[]).every(s => s.status === StageStatus.COMPLETED) 
                        ? '100% Concluído' 
                        : 'Em Execução'}
                </span>
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <span className="block text-xs text-slate-400 uppercase">Recurso Crítico</span>
                <span className="font-semibold text-slate-700 truncate">
                    {(Object.values(segment.stages) as PipelineStage[]).find(s => s.status === StageStatus.IN_PROGRESS)?.requiredResources[0] || 'Nenhum'}
                </span>
            </div>
        </div>
      </div>

      {/* AI Assistant Box */}
      <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
        <div className="flex items-center gap-2 mb-2">
            <ClipboardList size={18} className="text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Assistente de Planejamento</span>
        </div>
        {loadingAi ? (
            <div className="flex space-x-1 animate-pulse">
                <div className="w-2 h-2 bg-emerald-300 rounded-full"></div>
                <div className="w-2 h-2 bg-emerald-300 rounded-full"></div>
                <div className="w-2 h-2 bg-emerald-300 rounded-full"></div>
            </div>
        ) : (
            <div className="text-sm text-emerald-900 leading-relaxed whitespace-pre-line">
                {aiAdvice}
            </div>
        )}
      </div>

      {/* Pipeline Stages */}
      <div className="p-4 flex-1">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Checklist de Atividades</h3>
        {renderStage('scaffolding', segment.stages.scaffolding)}
        {renderStage('lifting', segment.stages.lifting)}
        {renderStage('welding', segment.stages.welding)}
        {renderStage('inspection', segment.stages.inspection)}
        {renderStage('hydrotest', segment.stages.hydrotest)}
        {renderStage('insulation', segment.stages.insulation)}
      </div>
    </div>
  );
};

export default ControlPanel;