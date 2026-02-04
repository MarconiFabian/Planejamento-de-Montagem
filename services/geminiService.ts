import { GoogleGenAI } from "@google/genai";
import { PipeSegment, StageStatus } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const handleError = (error: any) => {
    // Check for quota exhaustion or rate limits
    const msg = error?.message || JSON.stringify(error);
    if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        return "⚠️ Cota de uso da IA excedida (Erro 429). Por favor, aguarde alguns instantes ou verifique seu plano de faturamento.";
    }
    console.error("Gemini API Error:", error);
    return "Serviço de inteligência artificial indisponível no momento. Tente novamente.";
};

export const getAIAdviceForSegment = async (segment: PipeSegment): Promise<string> => {
  if (!process.env.API_KEY) {
    return "API Key não configurada. Impossível gerar análise.";
  }

  const prompt = `
    Atue como um Planejador de Obras Sênior focado em controle de atividades e cronograma.
    
    Estou monitorando as atividades do trecho: ${segment.name} (${segment.description}).
    
    Status do Checklist de Atividades:
    - Andaime: ${segment.stages.scaffolding.status}
    - Içamento/Logística: ${segment.stages.lifting.status}
    - Soldagem: ${segment.stages.welding.status}
    - Inspeção (Qualidade): ${segment.stages.inspection.status}
    - Teste Hidrostático: ${segment.stages.hydrotest.status}
    - Isolamento Térmico: ${segment.stages.insulation.status}

    O objetivo é reportar se o trecho está "No Prazo", "Atrasado" ou "Concluído" e identificar travas.
    
    Retorne UM parágrafo curto e objetivo em PORTUGUÊS com:
    1. O status real do trecho (ex: "Liberado para Solda", "Aguardando Inspeção").
    2. O que falta fazer para fechar este trecho.
    3. Se houver status 'BLOCKED' ou 'ISSUE', sugira ação corretiva de gestão.
    
    Não use jargão complexo de engenharia. Foco em: Iniciado, Concluído, Pendente.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Sem análise de planejamento disponível.";
  } catch (error) {
    return handleError(error);
  }
};

export const getGeneralProjectReport = async (segments: PipeSegment[]): Promise<string> => {
     if (!process.env.API_KEY) {
        return "API Key não configurada.";
    }

    const segmentsSummary = segments.map(s => 
        `${s.name}: Solda=${s.stages.welding.status}, Insp=${s.stages.inspection.status}, Geral=${Object.values(s.stages).filter(st => st.status === StageStatus.COMPLETED).length}/6 etapas`
    ).join('\n');

    const prompt = `
        Gere um Relatório Semanal de Planejamento (S-Curve textual) para a gerência.
        
        Dados de avanço físico:
        ${segmentsSummary}

        Estruture o relatório com:
        1. Resumo Executivo (% de avanço global estimado).
        2. Atividades Críticas (Onde o fluxo está parado?).
        3. Plano de Ação para a próxima semana.
        
        Seja direto. Foco em cumprimento de metas e atividades concluídas.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text || "Relatório indisponível.";
    } catch (error) {
        return handleError(error);
    }
}