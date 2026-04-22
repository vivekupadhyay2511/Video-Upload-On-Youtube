import { createReadStream } from "node:fs";
import { access, readdir } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";

const contentTypeMap: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
};

function getContentType(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return contentTypeMap[extension] ?? "application/octet-stream";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ downloadId: string }> },
) {
  const { downloadId } = await context.params;
  const downloadDir = join(process.cwd(), "storage", "downloads", downloadId);
  const shouldDownload = new URL(request.url).searchParams.get("download") === "1";

  await access(downloadDir);

  const files = await readdir(downloadDir);
  const filename = files[0];

  if (!filename) {
    return new Response("Downloaded video not found.", { status: 404 });
  }

  const filePath = join(downloadDir, filename);
  const stream = createReadStream(filePath);

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": getContentType(filename),
      "Cache-Control": "no-store",
      "Content-Disposition": `${shouldDownload ? "attachment" : "inline"}; filename="${filename}"`,
    },
  });
}
