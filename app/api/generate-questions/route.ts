import { NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function hintPolicy(levelRaw: string) {
  const L = String(levelRaw || "").toUpperCase();

  // A1/A2 => meaning + JP
  if (L.includes("A1") || L.includes("A2")) {
    return {
      mode: "LOW",
      instructions: `
Hint rules (A1–A2):
- hint must include:
  (1) a VERY short meaning in easy English
  (2) a Japanese translation
- Do NOT ask follow-up questions.
- Keep it short (1–2 lines).`,
    };
  }

  // B1/B2 (and everything else) => paraphrase + related questions
  return {
    mode: "HIGH",
    instructions: `
Hint rules (B1–B2):
- hint must include:
  (1) 1–2 short paraphrases of the question
  (2) 1–2 related questions (similar questions)
- Do NOT give answers.
- Do NOT branch (no yes/no paths).
- Keep it short (2–4 short lines).`,
  };
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

    const policy = hintPolicy(level);

    const prompt = `
You are an English teacher.
Generate ${count} discussion questions for ESL students.

Topic: ${topic}
Level: ${level}

IMPORTANT:
- Provide ONE "hint" per question (no followUp field).
- Do NOT create branching follow-ups (no yes/no branching).
- Keep questions suitable for the given level.
${policy.instructions}

Return JSON only in this format:
{
  "items": [
    { "text": "...", "hint": "...", "grammarTag": "..." }
  ]
}

Do not include explanations, markdown, or extra text outside the JSON.
`.trim();

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

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return json({ ok: false, error: "AI returned invalid JSON", raw }, 500);
    }

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return json({ ok: true, items });
  } catch (e: any) {
    return json({ ok: false, error: e.message || "Server error" }, 500);
  }
}