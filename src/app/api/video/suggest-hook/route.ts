// AI Suggestion Engine - v2 (Native crypto)
import { GoogleGenerativeAI } from "@google/generative-ai";
import ffmpeg from "fluent-ffmpeg";
import { writeFile, mkdir, readFile, rm } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  const tempId = randomUUID();
  const tempDir = join(process.cwd(), "storage", "temp-suggest", tempId);
  
  try {
    const formData = await request.formData();
    const clip = formData.get("clip") as File;
    const aiStyle = (formData.get("style") as string) || "Viral";

    if (!clip) {
      return Response.json({ success: false, message: "No clip provided" }, { status: 400 });
    }

    await mkdir(tempDir, { recursive: true });
    const videoPath = join(tempDir, "temp_clip.mp4");
    const buffer = Buffer.from(await clip.arrayBuffer());
    await writeFile(videoPath, buffer);

    const screenshotPath = join(tempDir, "frame.jpg");
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({ count: 1, folder: tempDir, filename: 'frame.jpg', timemarks: ['50%'] })
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ success: false, message: "API Key missing" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const imageBuffer = await readFile(screenshotPath);
    const imagePart = {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType: "image/jpeg"
      }
    };

    let styleType = "highly engaging, viral";
    if (aiStyle === "Epic") styleType = "cinematic, dramatic, and high-impact";
    if (aiStyle === "Professional") styleType = "clean, sophisticated, and professional";
    if (aiStyle === "Funny") styleType = "humorous, witty, and entertaining";

    const prompt = `Analyze this image from a video and suggest a viral caption hook.
    Style: ${styleType}.
    Respond ONLY with a JSON object: {"caption": "THE CAPTION TEXT"}`;
    
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text().trim();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const aiData = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);

    // Cleanup
    await rm(tempDir, { recursive: true, force: true });

    return Response.json({
      success: true,
      caption: aiData.caption || "WAIT FOR THE END"
    });

  } catch (error: any) {
    console.error("Suggest error:", error);
    try { await rm(tempDir, { recursive: true, force: true }); } catch {}
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}
