import { join } from "node:path";
import { readdir, mkdir } from "node:fs/promises";
import { z } from "zod";
import ffmpeg from "fluent-ffmpeg";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFile } from "node:fs/promises";

const ffmpegPath = join(
  process.cwd(),
  "node_modules",
  "ffmpeg-static",
  process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
);

const ffprobePath = join(
  process.cwd(),
  "node_modules",
  "ffprobe-static",
  "bin",
  process.platform === "win32" ? "win32" : process.platform,
  process.arch,
  process.platform === "win32" ? "ffprobe.exe" : "ffprobe"
);

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const requestSchema = z.object({
  sessionId: z.string(),
  aspectRatio: z.enum(["16:9", "9:16"]),
  useAiCaption: z.boolean().optional(),
  aiStyle: z.string().optional(),
  musicUrl: z.string().optional(),
  rotations: z.array(z.number()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, aspectRatio, useAiCaption, aiStyle, musicUrl, rotations } = requestSchema.parse(body);

    const inputDir = join(process.cwd(), "storage", "editor-raw", sessionId);
    const outputDir = join(process.cwd(), "storage", "editor-output", sessionId);
    await mkdir(outputDir, { recursive: true });

    const files = await readdir(inputDir);
    const videoFiles = files.filter(f => !f.startsWith('.')).sort();

    if (videoFiles.length === 0) {
      return Response.json({ success: false, message: "No clips found for this session." }, { status: 400 });
    }

    let viralCaption = "";
    let aiPosition = "bottom";
    let aiVibe = "hormozi";

    if (useAiCaption) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        try {
          const screenshotPath = join(inputDir, "frame.jpg");
          await new Promise<void>((resolve, reject) => {
            ffmpeg(join(inputDir, videoFiles[0]))
              .screenshots({ count: 1, folder: inputDir, filename: 'frame.jpg', timemarks: ['50%'] })
              .on('end', () => resolve())
              .on('error', (err) => reject(err));
          });

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

          const prompt = `Analyze this image from a video and generate a viral video metadata JSON. 
          Respond ONLY with a JSON object in this format:
          {
            "caption": "engaging uppercase ${styleType} 10-15 word caption",
            "position": "top" | "middle" | "bottom",
            "vibe": "hormozi" | "elegant" | "neon" | "minimalist",
            "reasoning": "short explanation"
          }
          Avoid blocking important faces or objects in the image.`;
          
          const result = await model.generateContent([prompt, imagePart]);
          const responseText = result.response.text().trim();
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          const aiData = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
          
          viralCaption = aiData.caption || "WAIT FOR THE END";
          aiPosition = aiData.position || "bottom";
          aiVibe = aiData.vibe || "hormozi";

        } catch (error) {
          console.error("Gemini AI Caption Error:", error);
          viralCaption = "WAIT FOR THE END";
        }
      } else {
        const fallbacks = [
          "YOU WILL NEVER BELIEVE WHAT HAPPENS AT THE VERY END OF THIS VIDEO",
          "THIS IS THE MOST INCREDIBLE MOMENT CAPTURED ON CAMERA TODAY",
          "WAIT UNTIL YOU SEE THE SURPRISE WAITING FOR YOU AT THE FINISH",
          "MIND BLOWN BY THIS ABSOLUTELY INSANE AND UNEXPECTED TWIST"
        ];
        viralCaption = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      }
      
      viralCaption = viralCaption.replace(/['":]/g, '').trim();
      const wrapLimit = aspectRatio === "9:16" ? 22 : 40;
      const words = viralCaption.split(/\s+/);
      let wrapped = "";
      let line = "";
      for (const word of words) {
        if ((line + word).length > wrapLimit) {
          wrapped += line.trim() + "\\n";
          line = word + " ";
        } else {
          line += word + " ";
        }
      }
      wrapped += line.trim();
      viralCaption = wrapped;
    }

    const outputPath = join(outputDir, "final_video.mp4");
    const width = aspectRatio === "16:9" ? 1920 : 1080;
    const height = aspectRatio === "16:9" ? 1080 : 1920;

    const videoMetadata = await Promise.all(
      videoFiles.map((file) => {
        return new Promise<{ width: number; height: number }>((resolve, reject) => {
          ffmpeg.ffprobe(join(inputDir, file), (err, metadata) => {
            if (err) reject(err);
            else {
              const stream = metadata.streams.find((s: any) => s.codec_type === 'video');
              const rotate = parseInt(stream?.tags?.rotate || metadata.format?.tags?.rotate || '0', 10);
              let w = stream?.width || 0;
              let h = stream?.height || 0;
              if (rotate === 90 || rotate === 270 || rotate === -90) {
                w = stream?.height || 0;
                h = stream?.width || 0;
              }
              resolve({ width: w, height: h });
            }
          });
        });
      })
    );

    const command = ffmpeg();
    videoFiles.forEach((file) => command.input(join(inputDir, file)));

    let filterComplex = "";

    videoFiles.forEach((file, index) => {
      const meta = videoMetadata[index];
      const manualRotation = rotations ? rotations[index] : 0;
      let preFilter = `[${index}:v]`;
      
      // Apply Manual Rotation
      if (manualRotation === 90) preFilter += `transpose=1,`;
      else if (manualRotation === 180) preFilter += `transpose=1,transpose=1,`;
      else if (manualRotation === 270) preFilter += `transpose=2,`;

      // Apply Auto-Rotation for Aspect Ratio mismatch
      const isVideoLandscape = meta.width > meta.height;
      const isTargetLandscape = aspectRatio === "16:9";

      if (meta.width > 0 && meta.height > 0) {
        if (isVideoLandscape && !isTargetLandscape) {
          preFilter += `transpose=1,`;
        } else if (!isVideoLandscape && isTargetLandscape) {
          preFilter += `transpose=1,`;
        }
      }

      filterComplex += `${preFilter}scale='ceil(max(${width},a*${height})/2)*2':'ceil(max(${height},${width}/a)/2)*2',crop=${width}:${height},eq=contrast=1.15:saturation=1.1,fps=30,setsar=1[v${index}];`;
    });

    const outLabel = viralCaption ? "[concatv]" : "[outv]";
    const vInputs = videoFiles.map((_, i) => `[v${i}]`).join("");
    filterComplex += `${vInputs}concat=n=${videoFiles.length}:v=1:a=0${outLabel}`;

    if (viralCaption) {
      let yPos = "(h-text_h)*0.85";
      if (aiPosition === "top") yPos = "h*0.12";
      if (aiPosition === "middle") yPos = "(h-text_h)/2";

      let styleParams = "fontcolor=white:borderw=4:bordercolor=black";
      if (aiVibe === "hormozi") {
        styleParams = "fontcolor=yellow:borderw=10:bordercolor=black:shadowcolor=black@0.6:shadowx=6:shadowy=6";
      } else if (aiVibe === "neon") {
        styleParams = "fontcolor=0x00FFFF:borderw=3:bordercolor=white:shadowcolor=0xFF00FF@0.4:shadowx=0:shadowy=0:box=1:boxcolor=black@0.3";
      } else if (aiVibe === "elegant") {
        styleParams = "fontcolor=white:borderw=1:bordercolor=0xAAAAAA:shadowcolor=black@0.4:shadowx=3:shadowy=3";
      } else if (aiVibe === "minimalist") {
        styleParams = "fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=25";
      }

      const ffmpegCaption = viralCaption.replace(/\\n/g, '\\n');
      filterComplex += `;[concatv]drawtext=fontfile='C\\:/Windows/Fonts/impact.ttf':text='${ffmpegCaption}':${styleParams}:fontsize=(h/26):line_spacing=20:x=(w-text_w)/2:y=${yPos}[outv]`;
    }
    
    command.complexFilter(filterComplex);

    let audioStartTime = "0";
    if (musicUrl) {
      if (aiStyle === "Viral") audioStartTime = "30"; 
      if (aiStyle === "Epic") audioStartTime = "60";  
      if (aiStyle === "Funny") audioStartTime = "15"; 
    }

    const outputOptions = ['-map [outv]', '-c:v libx264', '-pix_fmt yuv420p'];
    if (musicUrl) {
      command.input(musicUrl).inputOptions([`-ss ${audioStartTime}`]);
      outputOptions.push(`-map ${videoFiles.length}:a`, '-shortest', '-c:a aac', '-b:a 192k');
    }
    
    command.outputOptions(outputOptions);

    await new Promise<void>((resolve, reject) => {
      command
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err, stdout, stderr) => {
          console.error("FFmpeg Error:", stderr);
          reject(new Error(`${err.message}\n${stderr}`));
        })
        .run();
    });

    return Response.json({
      success: true,
      message: "Video generated successfully.",
      outputUrl: `/api/video/output/${sessionId}`
    });

  } catch (error: any) {
    console.error("generate error:", error);
    return Response.json({ success: false, message: `Generation failed: ${error.message || String(error)}` }, { status: 500 });
  }
}
