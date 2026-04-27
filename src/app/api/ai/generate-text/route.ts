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
      const cleanJson = aiResponse.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      return NextResponse.json(parsed);
    } catch {
      // Fallback: Return as title and description fields for the frontend
      // If it's a simple string, we'll let the frontend decide how to use it
      return NextResponse.json({ 
        title: aiResponse, 
        description: aiResponse 
      });
    }
  } catch (error) {
    console.error("AI Route Error:", error);
    return NextResponse.json({ error: "Failed to generate AI text" }, { status: 500 });
  }
}
