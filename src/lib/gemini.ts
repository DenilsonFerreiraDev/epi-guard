import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "SUA_CHAVE_AQUI" });

export interface ExtractedDelivery {
  workerName?: string;
  workerCPF?: string;
  epi?: string;
  deliveryDate?: string;
  status: 'complete' | 'incomplete';
  missingFields: string[];
}

export async function parseDeliveryInput(input: string): Promise<ExtractedDelivery> {
  const prompt = `Você é o motor lógico do EPI Guard. Extraia informações de entrega de EPI da mensagem do usuário.
  
Mapeie para os seguintes tipos de EPI se possível:
- Capacete
- Botas de Segurança
- Luvas de Vaqueta/Raspa
- Óculos de Proteção
- Protetor Auricular

Se a data não for informada, use a data de hoje (${new Date().toISOString().split('T')[0]}).
Se o CPF for informado, extraia apenas os números.

Mensagem: "${input}"`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          workerName: { type: Type.STRING },
          workerCPF: { type: Type.STRING },
          epi: { type: Type.STRING },
          deliveryDate: { type: Type.STRING },
          status: { type: Type.STRING, enum: ['complete', 'incomplete'] },
          missingFields: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          }
        },
        required: ['status', 'missingFields']
      }
    }
  });

  try {
    return JSON.parse(response.text) as ExtractedDelivery;
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return { status: 'incomplete', missingFields: ['Erro no processamento'] };
  }
}
