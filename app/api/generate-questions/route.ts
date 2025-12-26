import { NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export async function POST(req: Request) {
  try {
    if (!OPENAI_API_KEY) {
      return json({ ok: false, error: "Missing OPENAI_API_KEY" }, 500);
    }

    const body = await req.json();
    const topic = String(body.topic || "");
    const level = String(body.level || "");
    const count = Math.min(10, Math.max(1, Number(body.count || 5)));

    const prompt = `
You are an English teacher.
Generate ${count} discussion questions for ESL students.

Topic: ${topic}
Level: ${level}

Return JSON only in this format:
{
  "items": [
    { "text": "...", "followUp": "...", "grammarTag": "..." }
  ]
}
`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || "";

    // try to parse JSON safely
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return json({ ok: false, error: "AI returned invalid JSON", raw });
    }

    return json({ ok: true, items: parsed.items || [] });
  } catch (e: any) {
    return json({ ok: false, error: e.message || "Server error" }, 500);
  }
}
