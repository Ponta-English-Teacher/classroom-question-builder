import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voice = "en-US-JennyNeural" } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Missing text" },
        { status: 400 }
      );
    }

    // Placeholder response (no real TTS yet)
    // This keeps the app working and lets frontend integrate safely
    return NextResponse.json({
      ok: true,
      message: "TTS placeholder – audio generation not yet enabled",
      voice,
      text,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 500 }
    );
  }
}
