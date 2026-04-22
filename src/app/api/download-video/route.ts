import { basename } from "node:path";
import { z } from "zod";

import {
  assertSupportedUrl,
  downloadSourceVideo,
  getErrorMessage,
  improveTitle,
} from "@/lib/video-utils";

const requestSchema = z.object({
  sourceUrl: z.string().url(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.parse(body);
    assertSupportedUrl(parsed.sourceUrl);

    const { downloadId, filePath, title } = await downloadSourceVideo(parsed.sourceUrl);
    const improvedTitle = improveTitle(title);

    return Response.json({
      success: true,
      message: `Video downloaded successfully: ${basename(filePath)}.`,
      previewUrl: `/api/downloaded-video/${downloadId}`,
      downloadUrl: `/api/downloaded-video/${downloadId}?download=1`,
      title: improvedTitle,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("download-video error", error);

    return Response.json(
      {
        success: false,
        message,
      },
      { status: 400 },
    );
  }
}
