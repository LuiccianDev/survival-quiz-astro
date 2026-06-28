import type { APIRoute } from 'astro';
import { GoogleGenAI } from '@google/genai';

export const POST: APIRoute = async ({ request }) => {
  const { scenario, answers } = await request.json();

  const ai = new GoogleGenAI({ apiKey: import.meta.env.GEMINI_API_KEY });

  const interaction = await ai.interactions.create({
    model: 'gemini-3.5-flash',
    input: `
      Scenario: ${scenario}
      User answers: ${JSON.stringify(answers)}

      Decide if the user survives. Reply ONLY with this JSON, no markdown:
      {
        "survived": true,
        "title": "short dramatic title",
        "story": "2-3 sentences about their fate",
        "deathCause": "if survived=false, how exactly they died (dramatic/funny)"
      }
    `,
  });

  const text = interaction.output_text.replace(/```json|```/g, '').trim();

  return new Response(text, {
    headers: { 'Content-Type': 'application/json' },
  });
};