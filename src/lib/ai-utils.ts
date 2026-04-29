/**
 * AI Utilities using Pollinations.ai (Free, No Key required)
 */

export async function generateAIText(prompt: string): Promise<string> {
  try {
    const seed = Math.floor(Math.random() * 1000000);
    const url = "https://text.pollinations.ai/";
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        model: "openai",
        seed: seed,
        cache: false
      })
    });

    if (!response.ok) {
      console.error(`Pollinations API Error: ${response.status} ${response.statusText}`);
      throw new Error("AI Service unavailable");
    }
    
    const text = await response.text();
    if (!text) throw new Error("Empty AI response");

    return text;
  } catch (error) {
    console.error("AI Text Generation Error:", error);
    throw error;
  }
}

export function getAIImageUrl(prompt: string, seed?: number): string {
  const s = seed || Math.floor(Math.random() * 1000000);
  const encodedPrompt = encodeURIComponent(prompt);
  // Pollinations image API: https://pollinations.ai/p/{prompt}?width={width}&height={height}&seed={seed}&model={model}
  return `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=1024&seed=${s}&model=flux&nologo=true`;
}
