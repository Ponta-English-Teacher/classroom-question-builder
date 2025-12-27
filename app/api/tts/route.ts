import { NextResponse } from "next/server";

export const runtime = "nodejs";

const AZURE_TTS_KEY = process.env.AZURE_TTS_KEY;
const AZURE_TTS_REGION = process.env.AZURE_TTS_REGION;

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export async function POST(req: Request) {
  try {
    if (!AZURE_TTS_KEY || !AZURE_TTS_REGION) {
      return json({ ok: false, error: "Missing AZURE_TTS_KEY or AZURE_TTS_REGION" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const text = String(body.text || "").trim();
    const voice = String(body.voice || "en-US-JennyNeural").trim();
    const rateRaw = body.rate ?? "0%";
    const rate = String(rateRaw).trim(); // e.g. "0%", "-20%"

    if (!text) {
      return json({ ok: false, error: "Missing text" }, 400);
    }

    // Basic safety to prevent SSML injection via user input
    const safeText = text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");

    const ssml = `<?xml version="1.0" encoding="utf-8"?>
<speak version="1.0" xml:lang="en-US" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts">
  <voice name="${voice}">
    <prosody rate="${rate}">
      ${safeText}
    </prosody>
  </voice>
</speak>`;

    const url = `https://${AZURE_TTS_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_TTS_KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-32kbitrate-mono-mp3",
        "User-Agent": "classroom-question-builder",
      },
      body: ssml,
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      return json(
        { ok: false, error: "Azure TTS failed", status: r.status, details: errText.slice(0, 500) },
        500
      );
    }

    const audio = await r.arrayBuffer();

    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "Server error" }, 500);
  }
}
