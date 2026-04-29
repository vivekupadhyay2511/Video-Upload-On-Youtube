import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("clips") as File[];
    
    if (!files || files.length === 0) {
      return Response.json({ success: false, message: "No files uploaded." }, { status: 400 });
    }

    const sessionId = randomUUID();
    const uploadDir = join(process.cwd(), "storage", "editor-raw", sessionId);
    await mkdir(uploadDir, { recursive: true });

    const savedFiles = [];

    for (const [index, file] of files.entries()) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const fileName = `${String(index + 1).padStart(2, '0')}_clip.${ext}`;
      const filePath = join(uploadDir, fileName);
      
      await writeFile(filePath, buffer);
      savedFiles.push({ name: file.name, path: filePath, serverName: fileName });
    }

    return Response.json({
      success: true,
      sessionId,
      message: `${files.length} clips uploaded successfully.`,
      files: savedFiles
    });
  } catch (error: any) {
    console.error("upload-clips error:", error);
    return Response.json({ success: false, message: `Upload failed: ${error.message}` }, { status: 500 });
  }
}
