import { NextResponse } from "next/server";
import { getAIImageUrl } from "@/lib/ai-utils";

export async function POST(request: Request) {
  try {
    const { prompt, seed } = await request.json();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Direct URL generation for Pollinations
    const imageUrl = getAIImageUrl(prompt, seed);

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("AI Image Route Error:", error);
    return NextResponse.json({ error: "Failed to generate AI image" }, { status: 500 });
  }
}
