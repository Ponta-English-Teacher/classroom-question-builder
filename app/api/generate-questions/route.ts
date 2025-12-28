import { NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function hintPolicy(level: string) {
  const L = String(level || "").toUpperCase();

  // A1-A2: 3-line hint, line 2 is a definition/explanation (NOT a question)
  if (L.includes("A1") || L.includes("A2")) {
    return `
Hint rules (A1–A2):
- hint MUST be EXACTLY 3 lines, in this order:
  Line 1: Japanese translation of the QUESTION.
  Line 2: VERY short English explanation in easy words that DEFINES the key word/idea.
          - MUST be a statement (NOT a question).
          - MUST NOT start with "Do you", "Can you", "Will you", "Did you", "Have you".
          - SHOULD start with "It is ..." or "This is ..." or "They are ...".
          - MUST include at least TWO identifying features when possible.
          Examples:
          - Volleyball: "It is a sport with a ball and a net."
          - Tennis: "It is a sport with a racket and a small ball."
          - Swimming: "It is moving in water for sport or fun."
  Line 3: Japanese translation of Line 2 (support).
- Do NOT ask follow-up questions.
- Keep each line short and simple.
`.trim();
  }

  // B1-B2: allow richer hinting
  return `
Hint rules (B1–B2):
- hint must include:
  (1) 1–2 short paraphrases of the question
  (2) 1–2 related questions (similar questions)
- Do NOT give answers.
- Do NOT branch (no yes/no paths).
- Keep it short (2–4 short lines).
`.trim();
}

function clean(s: any) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

// Preserve line breaks for hint display (and keep each line clean)
function cleanHintPreserveNewlines(s: any) {
  const raw = String(s ?? "").replace(/\r\n/g, "\n").trim();
  const lines = raw
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return lines.join("\n");
}

function looksLikeQuestionText(s: string) {
  const t = clean(s);
  if (!t) return false;
  if (!t.endsWith("?")) return false;
  if (t.split(" ").length < 2) return false;
  return true;
}

export async function POST(req: Request) {
  try {
    if (!OPENAI_API_KEY) {
      return json({ ok: false, error: "Missing OPENAI_API_KEY" }, 500);
    }

    const body = await req.json();

    const topic = clean(body.topic || "");
    const level = clean(body.level || "");
    const count = Math.min(10, Math.max(1, Number(body.count || 5)));

    const teacherInstruction = clean(body.teacherInstruction || "");
    const avoid = clean(body.avoid || "");
    const rulePattern = clean(body.rulePattern || "");
    const ruleItems = clean(body.ruleItems || "");

    const policy = hintPolicy(level);

    const prompt = `
You are an English teacher creating pair-work speaking questions.

Topic: ${topic || "(none)"}
Level: ${level || "(none)"}

Teacher instruction (optional):
${teacherInstruction || "(none)"}

Avoid (optional):
${avoid || "(none)"}

Optional pattern rule (optional):
pattern: ${rulePattern || "(none)"}
items: ${ruleItems || "(none)"}

TASK:
Generate exactly ${count} items.

CRITICAL OUTPUT RULES:
- Each item.text MUST be a complete natural question sentence for students.
- Each item.text MUST end with a question mark "?".
- Do NOT output single nouns or word lists (examples of WRONG text: "apples", "bananas", "favorite fruit").
- Keep questions appropriate to the level and topic.

OPTIONAL PATTERN BEHAVIOR (only if BOTH pattern and items are present and pattern contains "___"):
- Create one natural question per item, using the pattern as a guide.
- Do NOT show the raw pattern in output.
Example:
pattern: "Do you like ___?"
items: "apples, bananas"
→ "Do you like apples?" / "Do you like bananas?"

${policy}

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "items": [
    { "text": "...?", "hint": "...", "grammarTag": "..." }
  ]
}
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
        max_tokens: 900,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return json({ ok: false, error: `OpenAI error ${res.status}: ${txt}` }, 500);
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || "";

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return json({ ok: false, error: "AI returned invalid JSON", raw }, 500);
    }

    const itemsRaw = Array.isArray(parsed?.items) ? parsed.items : [];

    const normalized = itemsRaw
      .map((it: any) => ({
        text: clean(it?.text),
        hint: cleanHintPreserveNewlines(it?.hint),
        grammarTag: clean(it?.grammarTag),
      }))
      .filter((it: any) => looksLikeQuestionText(it.text))
      .slice(0, count);

    if (normalized.length < Math.min(1, count)) {
      return json(
        {
          ok: false,
          error: "Model did not return usable question sentences.",
          raw,
        },
        500
      );
    }

    return json({ ok: true, items: normalized });
  } catch (e: any) {
    return json({ ok: false, error: e.message || "Server error" }, 500);
  }
}