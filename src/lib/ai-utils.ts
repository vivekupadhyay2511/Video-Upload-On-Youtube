/**
 * AI Utilities using Pollinations.ai (Free, No Key required)
 */

export async function generateAIText(prompt: string): Promise<string> {
  try {
    const encodedPrompt = encodeURIComponent(prompt);
    // Pollinations text API (Mistral-7B / Llama-3 based)
    const url = `https://text.pollinations.ai/${encodedPrompt}?model=openai&json=true&system=You are a professional YouTube growth expert. Optimize the user's title to be catchier and viral. The title MUST be under 100 characters including 2-3 viral hashtags at the end. Provide a separate detailed description. Return ONLY JSON with fields 'title' and 'description'.`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch from AI");
    
    const data = await response.json();
    
    // Sometimes the API might return text instead of JSON if the model ignores the instruction,
    // so we handle both cases.
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const content = data.choices[0].message.content;
      try {
        const parsed = JSON.parse(content.replace(/```json|```/g, ""));
        return JSON.stringify(parsed);
      } catch {
        return content;
      }
    }
    
    return JSON.stringify(data);
  } catch (error) {
    console.error("AI Text Generation Error:", error);
    return JSON.stringify({ title: "Error generating title", description: "Error generating description" });
  }
}

export function getAIImageUrl(prompt: string, seed?: number): string {
  const s = seed || Math.floor(Math.random() * 1000000);
  const encodedPrompt = encodeURIComponent(prompt);
  // Pollinations image API: https://pollinations.ai/p/{prompt}?width={width}&height={height}&seed={seed}&model={model}
  return `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=1024&seed=${s}&model=flux&nologo=true`;
}
