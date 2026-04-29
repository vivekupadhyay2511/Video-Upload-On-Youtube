import { join } from "node:path";
import { readdir, access, rm, rename } from "node:fs/promises";
import { z } from "zod";
import ffmpeg from "fluent-ffmpeg";
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
  downloadId: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { downloadId } = requestSchema.parse(body);

    const downloadDir = join(process.cwd(), "storage", "downloads", downloadId);
    await access(downloadDir);

    const files = await readdir(downloadDir);
    const filename = files.find(f => !f.startsWith('.'));

    if (!filename) {
      return Response.json({ success: false, message: "No video found to crop." }, { status: 404 });
    }

    const inputPath = join(downloadDir, filename);
    const outputPath = join(downloadDir, `cropped-${filename}`);

    const duration: number = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata.format.duration || 0);
      });
    });

    if (duration <= 2) {
      return Response.json({ success: false, message: "Video is too short to crop 2 seconds." }, { status: 400 });
    }

    const cropDuration = duration - 2;

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .setDuration(cropDuration)
        .videoCodec('copy')
        .audioCodec('copy')
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err, stdout, stderr) => reject(new Error(`${err.message}\n${stderr}`)))
        .run();
    });

    await rm(inputPath);
    await rename(outputPath, inputPath);

    return Response.json({
      success: true,
      message: "Video cropped successfully.",
    });

    } catch (error: any) {
      console.error("crop-video error:", error);
      return Response.json(
        { success: false, message: `Failed to crop video: ${error.message || String(error)}` },
        { status: 500 }
      );
  }
}
