import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Lead, AuditReport, Language, DeepAnalysis, Message } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getLangName = (l: Language) => l === 'fr' ? 'Français' : l === 'es' ? 'Español' : 'English';

// Helper for exponential backoff retry
const callGeminiWithRetry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 2000
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = 
      error.status === 429 || 
      error.code === 429 || 
      (error.message && (
        error.message.includes('429') || 
        error.message.includes('RESOURCE_EXHAUSTED') || 
        error.message.includes('quota')
      ));

    if (retries > 0 && isRateLimit) {
      console.warn(`Rate Limit hit. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callGeminiWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

// 1. GLOBAL ASSISTANT CHAT
export const sendAssistantMessage = async (
  history: { role: 'user' | 'model'; text: string }[],
  newMessage: string,
  fileContents: string[],
  language: Language,
  currentContextSummary: string
): Promise<string> => {
  try {
    const model = 'gemini-3-flash-preview';
    const langName = getLangName(language);
    
    const systemInstruction = `
    You are "AutoProspec AI", a world-class business growth expert.
    
    CRITICAL INSTRUCTIONS:
    1. Respond in ${langName} ONLY.
    2. ACT LIKE A HUMAN: Be warm, professional but conversational. Use emojis 🌟 periodically to keep it engaging.
    3. FORMATTING: ALWAYS use Markdown. Use bold for key points, lists for clarity.
    4. MISSION: Help the user define business strategy and find leads.
    
    Context: "${currentContextSummary}"
    `;

    let prompt = newMessage;
    if (fileContents.length > 0) {
      prompt += `\n\n[Attached File Contents]:\n${fileContents.join('\n---\n')}`;
    }

    const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model,
      contents: [
        ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: { systemInstruction }
    }));

    return response.text || "Error.";
  } catch (error) {
    return "System overloaded. Try again.";
  }
};

// 2. LEAD DISCOVERY (Unchanged logic, kept simpler)
export const findLeadsOnMaps = async (
  query: string,
  location: string,
  language: Language,
  contextStrategy: string
): Promise<Lead[]> => {
  try {
    const langName = getLangName(language);
    
    const prompt = `
    Find specific, REAL, and OPERATIONAL B2B leads for: "${query}" in "${location}".
    Context: "${contextStrategy}"
    Return 5-8 high-quality leads.
    Language: ${langName}.
    `;

    const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { tools: [{ googleMaps: {} } as any] },
    }));

    const textOutput = response.text || "";
    
    const extractionResponse = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract leads to JSON. Text: "${textOutput}". Schema: name, address, website, businessType, notes (summary).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    address: { type: Type.STRING },
                    rating: { type: Type.NUMBER },
                    website: { type: Type.STRING },
                    phone: { type: Type.STRING },
                    businessType: { type: Type.STRING },
                    notes: { type: Type.STRING }
                }
            }
        }
      }
    }));

    const parsedLeads = JSON.parse(extractionResponse.text || "[]");
    return parsedLeads.map((l: any, i: number) => ({
      id: `lead-${Date.now()}-${i}`,
      name: l.name,
      address: l.address,
      website: l.website,
      phone: l.phone,
      businessType: l.businessType,
      status: 'new',
      notes: l.notes, 
    }));

  } catch (error) {
    console.error("Error finding leads:", error);
    return [];
  }
};

// 3. SIMPLIFIED DEEP ANALYSIS (Fit & Score & Email Discovery)
export const deepAnalyzeLead = async (
  lead: Lead,
  language: Language,
  businessContext: string
): Promise<DeepAnalysis> => {
  try {
    const langName = getLangName(language);
    const prompt = `
    Analyze this lead: "${lead.name}" (${lead.website}).
    My Business: ${businessContext}
    
    Task:
    1. Determine if they are active.
    2. Score 0-100 on how good a client they would be for me.
    3. Explain WHY they are a good client (Fit Reasoning).
    4. Detect tech stack.
    5. **CRITICAL**: Find a contact email address (public info@, contact@, or a specific person's email if found on web).
    
    Language: ${langName}. NO BOLD SYNTAX.
    `;

    const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            leadScore: { type: Type.INTEGER },
            fitReasoning: { type: Type.STRING, description: "A short paragraph explaining why I should contact them." },
            keyPainPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
            verificationStatus: { type: Type.STRING, enum: ['Verified Active', 'Uncertain', 'Likely Closed'] },
            decisionMaker: { type: Type.STRING },
            contactEmail: { type: Type.STRING, description: "The discovered email address or empty string." }
          }
        }
      }
    }));
    
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return {
      leadScore: 0,
      fitReasoning: "Analysis failed.",
      keyPainPoints: [],
      techStack: [],
      verificationStatus: 'Uncertain'
    };
  }
};

// 4. WEB AUDIT (Simplified)
export const analyzeWebsite = async (url: string, language: Language): Promise<AuditReport> => {
  try {
    const langName = getLangName(language);
    const prompt = `Audit: ${url}. SEO, Design. Language: ${langName}. Output JSON.`;
    const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            seoScore: { type: Type.INTEGER },
            designScore: { type: Type.INTEGER },
            mobileScore: { type: Type.INTEGER },
            criticalIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
            positivePoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING }
          }
        }
      }
    }));
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return { seoScore: 0, designScore: 0, mobileScore: 0, criticalIssues: [], positivePoints: [], summary: "Error" };
  }
};

// 5. GENERATE SINGLE EMAIL
export const generateInitialEmail = async (
  businessContext: string,
  lead: Lead,
  language: Language
): Promise<string> => {
  try {
    const langName = getLangName(language);
    
    let prompt = `
    Write a HIGH-CONVERTING cold email.
    
    Sender Context: ${businessContext}
    Recipient: ${lead.name} (${lead.businessType})
    Analysis: ${JSON.stringify(lead.deepAnalysis || {})}
    
    Guidelines:
    - Language: ${langName}
    - Tone: Human, Personal, Engaging, Authentic. (Avoid "AI-sounding" buzzwords).
    - Format: Use Markdown (bolding key concepts).
    - Goal: Get a meeting.
    - NO Subject line in the body (just the body text).
    `;

    const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
    }));

    return response.text || "";
  } catch (error) {
    return "Error generating email.";
  }
};

// 6. REFINE EMAIL (CHAT)
export const refineEmailWithAI = async (
  currentEmail: string,
  instruction: string,
  businessContext: string,
  lead: Lead,
  history: Message[]
): Promise<string> => {
  try {
    const prompt = `
    CURRENT EMAIL DRAFT:
    "${currentEmail}"

    USER INSTRUCTION:
    "${instruction}"

    CONTEXT:
    Sender: ${businessContext}
    Recipient: ${lead.name}
    
    TASK:
    Rewrite the email applying the user instruction. 
    Act like a world-class copywriter. Be human, use emojis if appropriate for the tone asked.
    Return ONLY the new email body.
    `;

    const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    }));

    return response.text || currentEmail;
  } catch (error) {
    return currentEmail;
  }
};