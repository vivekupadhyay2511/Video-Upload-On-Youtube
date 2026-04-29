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
  musicUrl: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, aspectRatio, useAiCaption, musicUrl } = requestSchema.parse(body);

    const inputDir = join(process.cwd(), "storage", "editor-raw", sessionId);
    const outputDir = join(process.cwd(), "storage", "editor-output", sessionId);
    await mkdir(outputDir, { recursive: true });

    const files = await readdir(inputDir);
    const videoFiles = files.filter(f => !f.startsWith('.')).sort();

    if (videoFiles.length === 0) {
      return Response.json({ success: false, message: "No clips found for this session." }, { status: 400 });
    }

    let viralCaption = "";

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

          const prompt = "Analyze this image from a video and generate a long, highly engaging, viral 10-15 word caption suitable for TikTok/YouTube Shorts. Just return the caption, nothing else. Make it catchy, uppercase, and without quotes.";
          
          const result = await model.generateContent([prompt, imagePart]);
          viralCaption = result.response.text().trim().replace(/['"]/g, '');
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
      
      // Ensure no quotes or special characters break the FFmpeg filter string
      viralCaption = viralCaption.replace(/['"]/g, '').trim();
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

    videoFiles.forEach((file) => {
      command.input(join(inputDir, file));
    });

    if (musicUrl) {
      command.input(musicUrl);
    }

    let filterComplex = "";

    videoFiles.forEach((file, index) => {
      const meta = videoMetadata[index];
      let preFilter = `[${index}:v]`;
      
      const isVideoLandscape = meta.width > meta.height;
      const isTargetLandscape = aspectRatio === "16:9";

      if (meta.width > 0 && meta.height > 0) {
        if (isVideoLandscape && !isTargetLandscape) {
          preFilter += `transpose=1,`; // Rotate 90 degrees clockwise
        } else if (!isVideoLandscape && isTargetLandscape) {
          preFilter += `transpose=1,`; // Rotate 90 degrees clockwise
        }
      }

      filterComplex += `${preFilter}scale='ceil(max(${width},a*${height})/2)*2':'ceil(max(${height},${width}/a)/2)*2',crop=${width}:${height},eq=contrast=1.15:saturation=1.1,fps=30,setsar=1[v${index}];`;
    });

    const outLabel = viralCaption ? "[concatv]" : "[outv]";

    if (musicUrl) {
      const vInputs = videoFiles.map((_, i) => `[v${i}]`).join("");
      filterComplex += `${vInputs}concat=n=${videoFiles.length}:v=1:a=0${outLabel};`;
      
      if (viralCaption) {
        filterComplex += `[concatv]drawtext=fontfile='C\\:/Windows/Fonts/impact.ttf':text='${viralCaption}':fontcolor=white:fontsize=(h/40):x=(w-text_w)/2:y=(h-text_h)*0.85:box=1:boxcolor=black@0.5:boxborderw=15[outv]`;
      }
      
      command.complexFilter(filterComplex);
      
      command.outputOptions([
        '-map [outv]',
        `-map ${videoFiles.length}:a`,
        '-shortest',
        '-c:v libx264',
        '-c:a aac',
        '-pix_fmt yuv420p'
      ]);
    } else {
      const vInputs = videoFiles.map((_, i) => `[v${i}]`).join("");
      filterComplex += `${vInputs}concat=n=${videoFiles.length}:v=1:a=0${outLabel}`;
      
      if (viralCaption) {
        filterComplex += `;[concatv]drawtext=fontfile='C\\:/Windows/Fonts/impact.ttf':text='${viralCaption}':fontcolor=white:fontsize=(h/40):x=(w-text_w)/2:y=(h-text_h)*0.85:box=1:boxcolor=black@0.5:boxborderw=15[outv]`;
      }
      
      command.complexFilter(filterComplex);
      command.outputOptions([
        '-map [outv]',
        '-c:v libx264',
        '-pix_fmt yuv420p'
      ]);
    }

    await new Promise<void>((resolve, reject) => {
      command
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err, stdout, stderr) => reject(new Error(`${err.message}\n${stderr}`)))
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
