
import { GoogleGenAI } from "@google/genai";
import { PipeSegment, StageStatus } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper para filtrar o que entra no relatório
// Apenas itens físicos (Tubos, Curvas, Suportes) entram. Zonas e Anotações são ignoradas.
const getReportableSegments = (segments: PipeSegment[]) => {
    const ignoredTypes = ['ZONE', 'RECTANGLE', 'CIRCLE'];
    return segments.filter(s => !ignoredTypes.includes(s.type));
};

// HELPER: Determina quais estágios são relevantes para o cálculo de "Concluído"
// Para Suportes, ignoramos Hidroteste e Isolamento na verificação
const getRelevantStages = (seg: PipeSegment) => {
    const allStages = Object.values(seg.stages);
    
    if (seg.type === 'SUPPORT' || seg.type === 'CANTILEVER' || seg.type === 'FLOATING') {
        // Ignora Hidro e Isolamento para Suportes
        return allStages.filter(s => s.id !== 'hydro' && s.id !== 'insul');
    }
    
    // Para tubos e conexões, todos importam
    return allStages;
};

// Manteve-se o Helper de erro para o Assistente (que ainda pode usar IA se disponível)
const handleError = (error: any) => {
    console.error("Gemini API Error:", error);
    return "Serviço de IA indisponível. Modo Offline ativado.";
};

// --- ASSISTENTE DE ITEM (Mantém híbrido: Tenta IA, se falhar usa Regras Locais) ---
const generateLocalAdvice = (segment: PipeSegment): string => {
    const relevantStages = getRelevantStages(segment);
    const issues = relevantStages.filter(s => s.status === StageStatus.ISSUE || s.status === StageStatus.BLOCKED);
    
    if (issues.length > 0) {
        return `⚠️ **PENDÊNCIAS CRÍTICAS DETECTADAS:**\nEste item possui ${issues.length} bloqueio(s) nas etapas: ${issues.map(i => i.label).join(', ')}. \n\nAção Recomendada: Resolver as pendências antes de avançar para evitar retrabalho.`;
    }
    
    const inProgress = relevantStages.filter(s => s.status === StageStatus.IN_PROGRESS);
    if (inProgress.length > 0) {
        return `ℹ️ **EM EXECUÇÃO:**\nAtividades ativas: ${inProgress.map(i => i.label).join(', ')}. \n\nLembrete: Verifique se a documentação técnica (RJS, Relatório de Inspeção) está sendo preenchida simultaneamente.`;
    }

    const isAllComplete = relevantStages.every(s => s.status === StageStatus.COMPLETED);
    if (isAllComplete) { 
        return "✅ **CONCLUÍDO:**\nEste item teve todas as etapas finalizadas. Certifique-se de que o Data Book foi compilado.";
    }

    return "⚪ **AGUARDANDO INÍCIO:**\nNenhuma atividade iniciada. Verifique a disponibilidade de materiais e frentes de trabalho.";
};

export const getAIAdviceForSegment = async (segment: PipeSegment): Promise<string> => {
  // Se não tiver chave, usa local direto
  if (!process.env.API_KEY) return generateLocalAdvice(segment);

  const stageDetails = Object.values(segment.stages).map(s => {
      const dateStr = s.date ? ` (Data: ${s.date.split('-').reverse().join('/')})` : '';
      return `- ${s.label}: ${s.status}${dateStr}`;
  }).join('\n');

  const prompt = `
    Atue como um Planejador de Obras Sênior.
    Estou monitorando o trecho: ${segment.name} (${segment.description}).
    
    Status Atual:
    ${stageDetails}

    Analise brevemente se há riscos na sequência ou bloqueios. Responda em 1 parágrafo curto.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || generateLocalAdvice(segment);
  } catch (error) {
    return generateLocalAdvice(segment); // Fallback silencioso para regras locais
  }
};

// --- RELATÓRIO GERAL (PURAMENTE LOCAL / DETERMINÍSTICO) ---
export const getGeneralProjectReport = async (segments: PipeSegment[]): Promise<string> => {
    const today = new Date().toLocaleDateString('pt-BR');
    
    // FILTRAGEM: Remove itens deletados e visuais não técnicos
    const reportSegments = getReportableSegments(segments);
    const totalItems = reportSegments.length;
    
    // Contagem de Status Global
    let totalCompleted = 0;
    let totalInProgress = 0;
    let totalBlocked = 0;
    let totalNotStarted = 0;

    // Listas para detalhamento
    const blockedItems: string[] = [];
    const activeItems: string[] = [];

    reportSegments.forEach(seg => {
        const relevantStages = getRelevantStages(seg);
        
        const isAllComplete = relevantStages.every(s => s.status === StageStatus.COMPLETED);
        const hasBlock = relevantStages.some(s => s.status === StageStatus.BLOCKED || s.status === StageStatus.ISSUE);
        const isRunning = relevantStages.some(s => s.status === StageStatus.IN_PROGRESS);
        const isNotStarted = relevantStages.every(s => s.status === StageStatus.NOT_STARTED);

        // Formatação Padrão: [ID] LOCAL | INFO
        const itemInfo = `[ID: ${seg.id}] Local: ${seg.name} ${seg.description ? `| Info: ${seg.description}` : ''}`;

        if (isAllComplete) totalCompleted++;
        else if (hasBlock) {
            totalBlocked++;
            const reasons = relevantStages.filter(s => s.status === StageStatus.BLOCKED || s.status === StageStatus.ISSUE).map(s => s.label).join(', ');
            blockedItems.push(`- ${itemInfo}\n  >> Motivo: ${reasons}`);
        }
        else if (isRunning) {
            totalInProgress++;
            const acts = relevantStages.filter(s => s.status === StageStatus.IN_PROGRESS).map(s => s.label).join(', ');
            activeItems.push(`- ${itemInfo}\n  >> Atividade: ${acts}`);
        }
        else if (!isNotStarted) {
             // Caso misto (alguns completos, outros não iniciados, mas sem bloqueio ou progresso ativo)
             // Ex: Suporte montado, mas esperando solda (que está NOT_STARTED).
             // Vamos considerar "Em Andamento" para fins de relatório se algo já foi feito.
             const done = relevantStages.filter(s => s.status === StageStatus.COMPLETED).map(s => s.label).join(', ');
             totalInProgress++;
             activeItems.push(`- ${itemInfo}\n  >> Concluído Parcialmente: ${done}`);
        }
        else totalNotStarted++;
    });

    const percentComplete = totalItems > 0 ? ((totalCompleted / totalItems) * 100).toFixed(1) : "0.0";

    // Construção do Texto
    return `RELATÓRIO TÉCNICO DE PLANEJAMENTO
Data de Emissão: ${today}
--------------------------------------------------

1. RESUMO EXECUTIVO (AVANÇO FÍSICO)
--------------------------------------------------
Este relatório contabiliza apenas os itens físicos ativos no projeto atual.
Total de Itens Planejados: ${totalItems}
Progresso Global Estimado: ${percentComplete}%

[🟢] Concluídos: ${totalCompleted}
[🟡] Em Andamento: ${totalInProgress}
[🔴] Com Pendências/Bloqueios: ${totalBlocked}
[⚪] Não Iniciados: ${totalNotStarted}


2. PONTOS DE ATENÇÃO (CRÍTICO)
--------------------------------------------------
${blockedItems.length > 0 ? blockedItems.join('\n') : "Nenhum bloqueio registrado no momento."}


3. FRENTES DE TRABALHO ATIVAS
--------------------------------------------------
${activeItems.length > 0 ? activeItems.join('\n') : "Nenhuma frente ativa no momento."}


4. CONSIDERAÇÕES DO PLANEJAMENTO
--------------------------------------------------
Este relatório reflete a posição física atualizada do banco de dados do projeto. 
Itens marcados como bloqueados devem ter prioridade na resolução pelo setor de Qualidade ou Engenharia.
`;
}

// --- RELATÓRIO DIÁRIO - RDO (PURAMENTE LOCAL / DETERMINÍSTICO) ---
export const getDailyProgressReport = async (segments: PipeSegment[]): Promise<string> => {
   const today = new Date().toLocaleDateString('pt-BR');
   
   // FILTRAGEM: Considera apenas itens técnicos reais
   const reportSegments = getReportableSegments(segments);

   // Estrutura de Agrupamento
   const history: Record<string, string[]> = {};
   const backlog: string[] = [];

   // Processamento dos Dados
   reportSegments.forEach(seg => {
       const itemInfo = `[ID: ${seg.id}] ${seg.name} ${seg.description ? `(${seg.description})` : ''}`;
       
       // Usa todas as etapas para o diário, pois mesmo 'irrelevant' pode ter sido logado se o user quis
       // Mas idealmente filtramos para não poluir o backlog
       const stagesToCheck = getRelevantStages(seg);

       stagesToCheck.forEach(stage => {
           if (stage.status !== StageStatus.NOT_STARTED) {
               if (stage.date) {
                   const dateKey = stage.date.split('-').reverse().join('/');
                   
                   if (!history[dateKey]) history[dateKey] = [];
                   
                   const statusIcon = stage.status === StageStatus.COMPLETED ? '[CONCLUÍDO]' : '[INICIADO]';
                   const lineItem = `${statusIcon} ${itemInfo} - ${stage.label}`;
                   
                   history[dateKey].push(lineItem);
               } else {
                   // Sem data definida
                   if (!history['DATA NÃO INFORMADA']) history['DATA NÃO INFORMADA'] = [];
                   history['DATA NÃO INFORMADA'].push(`[STATUS: ${stage.status}] ${itemInfo} - ${stage.label}`);
               }
           } else {
               // Backlog
               backlog.push(`${itemInfo}: ${stage.label}`);
           }
       });
   });

   // Ordenação das Datas (Cronológica)
   const sortedDates = Object.keys(history).sort((a, b) => {
       if (a === 'DATA NÃO INFORMADA') return 1;
       if (b === 'DATA NÃO INFORMADA') return -1;
       const [d1, m1, y1] = a.split('/');
       const [d2, m2, y2] = b.split('/');
       return new Date(`${y1}-${m1}-${d1}`).getTime() - new Date(`${y2}-${m2}-${d2}`).getTime();
   });

   let historyText = "";
   sortedDates.forEach(date => {
       historyText += `\nDATA: ${date}\n`;
       historyText += "-----------------------------\n";
       historyText += history[date].join('\n') + "\n";
   });

   const backlogCount = backlog.length;
   const backlogPreview = backlog.slice(0, 15).map(i => `- ${i}`).join('\n');
   const backlogMore = backlogCount > 15 ? `\n... e mais ${backlogCount - 15} atividades.` : "";

   return `DIÁRIO DE OBRA (RDO) - CONSOLIDADO
Gerado em: ${today}
--------------------------------------------------

HISTÓRICO DE EXECUÇÃO (CRONOLÓGICO)
${historyText || "Nenhuma atividade executada com data registrada."}

==================================================

SALDO DE ATIVIDADES (BACKLOG)
Total Pendente: ${backlogCount} atividades

${backlogPreview}${backlogMore}

--------------------------------------------------
Responsável Técnico: _____________________________
Visto da Fiscalização: ___________________________
`;
}
