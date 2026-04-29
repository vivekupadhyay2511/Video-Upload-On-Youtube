import { NextResponse } from "next/server";
import { generateAIText } from "@/lib/ai-utils";

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const aiResponse = await generateAIText(prompt);
    
    // Try to parse JSON if the model followed instructions
    try {
      // Use regex to extract JSON object from potentially messy response
      const match = aiResponse.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.title || parsed.description) {
          return NextResponse.json({
            title: parsed.title || "",
            description: parsed.description || ""
          });
        }
      }
      throw new Error("No valid JSON structure found in response");
    } catch {
      // Fallback: Try to extract using standard text patterns
      const titleMatch = aiResponse.match(/Title:\s*(.*)/i);
      const descMatch = aiResponse.match(/Description:\s*([\s\S]*)/i);
      
      if (titleMatch && descMatch) {
        return NextResponse.json({
          title: titleMatch[1].trim().replace(/^"|"$/g, ''),
          description: descMatch[1].trim()
        });
      }

      // Final Fallback: Put it all in the description and let the user extract the title manually
      return NextResponse.json({ 
        title: "", 
        description: aiResponse.trim()
      });
    }
  } catch (error) {
    console.error("AI Route Error:", error);
    return NextResponse.json({ error: "Failed to generate AI text" }, { status: 500 });
  }
}
