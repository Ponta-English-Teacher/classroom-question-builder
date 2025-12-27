import { NextResponse } from "next/server";

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

async function kv(command: any[]) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    throw new Error("Upstash env vars missing");
  }

const url = UPSTASH_URL;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

function generateClassCode() {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${part()}-${part()}`;
}

// POST /api/session → create session
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const topic = String(body.topic || "general");
    const classSize = Number(body.classSize || 0);
    const count = Number(body.count || 5);

    const classId = generateClassCode();
    const key = `session:${classId}`;

    const session = {
      classId,
      topic,
      classSize,
      count,
      createdAt: Date.now(),
      studentsJoined: 0,
      questions: [],
    };

    await kv(["SET", key, JSON.stringify(session)]);
    return json({ ok: true, classId, session });
  } catch (e: any) {
    return json({ ok: false, error: e.message }, 500);
  }
}

// GET /api/session?classId=XXXX → load session
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    if (!classId) return json({ ok: false, error: "Missing classId" }, 400);

    const raw = await kv(["GET", `session:${classId}`]);
    if (!raw) return json({ ok: false, error: "Not found" }, 404);

    return json({ ok: true, session: JSON.parse(raw) });
  } catch (e: any) {
    return json({ ok: false, error: e.message }, 500);
  }
}

// PUT /api/session?classId=XXXX → update session
export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    if (!classId) return json({ ok: false, error: "Missing classId" }, 400);

    const raw = await kv(["GET", `session:${classId}`]);
    if (!raw) return json({ ok: false, error: "Not found" }, 404);

    const session = JSON.parse(raw);
    const body = await req.json();

    if (Array.isArray(body.questions)) {
      session.questions = body.questions;
    }
    if (body.incrementJoined) {
      session.studentsJoined++;
    }

    await kv(["SET", `session:${classId}`, JSON.stringify(session)]);
    return json({ ok: true, session });
  } catch (e: any) {
    return json({ ok: false, error: e.message }, 500);
  }
}
