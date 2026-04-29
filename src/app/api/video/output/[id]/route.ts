import { join } from "node:path";
import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const filePath = join(process.cwd(), "storage", "editor-output", id, "final_video.mp4");

    const fileStat = await stat(filePath);
    const stream = createReadStream(filePath);

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": fileStat.size.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      },
    });

  } catch (error: any) {
    console.error("Output fetch error:", error);
    return Response.json({ success: false, message: "Video not found or error reading." }, { status: 404 });
  }
}
