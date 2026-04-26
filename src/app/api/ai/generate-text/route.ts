import { NextResponse } from "next/server";
import { generateAIText } from "@/lib/ai-utils";

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const aiResponse = await generateAIText(prompt);
    let parsed;
    try {
      parsed = JSON.parse(aiResponse);
    } catch {
      parsed = { title: aiResponse, description: "" };
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("AI Route Error:", error);
    return NextResponse.json({ error: "Failed to generate AI text" }, { status: 500 });
  }
}
