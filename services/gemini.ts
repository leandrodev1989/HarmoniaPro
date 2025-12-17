import { GoogleGenAI, Chat } from "@google/genai";
import { Chord, ScaleType } from "../types";

let chatSession: Chat | null = null;

const SYSTEM_INSTRUCTION = `
Você é um professor de música experiente, especializado em harmonia funcional, piano e violão.
Seu objetivo é ensinar de forma PRÁTICA, DIRETA e DIVERTIDA.
Evite "tijolos" de texto. Use listas, tópicos e emojis quando apropriado.

Ao responder:
1. Se o usuário perguntar sobre teclado/piano, dê dicas de voicalização (voicing) e dedilhado.
2. Se o usuário perguntar sobre violão, fale sobre shapes, batidas e pestanas.
3. Se perguntarem sobre harmonia, explique a sensação (tensão/repouso).

Mantenha as respostas concisas (máximo 3 parágrafos curtos por vez), a menos que o usuário peça detalhes.
`;

export const getChatResponse = async (message: string, currentContext: string): Promise<string> => {
  try {
    if (!process.env.API_KEY) {
      return "⚠️ Chave de API não configurada. Configure o arquivo .env ou o segredo do projeto.";
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Inicializa o chat se não existir
    if (!chatSession) {
      chatSession = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
      });
      
      // Envia o contexto inicial silenciosamente (ou como primeira mensagem de setup)
      // Mas para simplificar, apenas garantimos que a sessão existe.
    }

    // Adiciona o contexto atual à mensagem do usuário para que a IA saiba o que ele está vendo
    const fullMessage = `[Contexto Atual do App: ${currentContext}]\n\nPergunta do Aluno: ${message}`;

    const result = await chatSession.sendMessage({
      message: fullMessage
    });

    return result.text || "Não entendi, pode repetir?";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Ocorreu um erro ao falar com o professor virtual. Tente novamente.";
  }
};

// Função auxiliar para resetar o chat se mudar muito o contexto (opcional)
export const resetChat = () => {
  chatSession = null;
};
