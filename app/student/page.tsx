"use client";

import { useState } from "react";

type Item = {
  text: string;
  hint?: string;
  grammarTag?: string;
};

type VoiceGender = "female" | "male";

function voiceFor(gender: VoiceGender) {
  return gender === "male" ? "en-US-GuyNeural" : "en-US-JennyNeural";
}

// We only want to play ENGLISH from hint.
// Supported hint formats:
// (A) 3 lines:
//   1) Japanese translation of the question
//   2) English meaning/explanation
//   3) Japanese translation of the explanation
// (B) Old style with " / ":
//   "English ... / 日本語 ..."
function extractHintEnglish(hintRaw: string) {
  const hint = String(hintRaw || "").trim();
  if (!hint) return "";

  // Prefer 3-line format (line 2)
  const lines = hint.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2) return lines[1];

  // Fallback: "English / Japanese"
  const parts = hint.split(" / ");
  return (parts[0] || hint).trim();
}

export default function StudentPage() {
  const [classId, setClassId] = useState("");
  const [studentNumber, setStudentNumber] = useState<number | "">("");
  const [status, setStatus] = useState("");

  const [item, setItem] = useState<Item | null>(null);

  // TTS controls (gender only)
  const [gender, setGender] = useState<VoiceGender>("female");
  const [isPlaying, setIsPlaying] = useState(false);

  async function loadSession() {
    const cid = classId.trim();

    if (!cid || !studentNumber) {
      setStatus("Please enter class code and student number.");
      return;
    }

    setStatus("Loading...");

    try {
      const res = await fetch(`/api/session?classId=${encodeURIComponent(cid)}`);
      const data = await res.json();

      if (!data.ok || !data.session?.questions?.length) {
        setItem(null);
        setStatus("Session not found or has no questions.");
        return;
      }

      const questions = data.session.questions;
      const index = (Number(studentNumber) - 1) % questions.length;

      setItem(questions[index]);
      setStatus(`Loaded question for student #${studentNumber}`);
    } catch {
      setItem(null);
      setStatus("Error loading session.");
    }
  }

  async function playTTS(textRaw: string) {
    const text = String(textRaw || "").trim();
    if (!text) return;

    setIsPlaying(true);
    setStatus("Generating audio...");

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice: voiceFor(gender),
        }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        setStatus("TTS error: " + (t || res.statusText));
        setIsPlaying(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setIsPlaying(false);
        setStatus("Ready.");
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setIsPlaying(false);
        setStatus("Audio playback error.");
      };

      await audio.play();
      setStatus("Playing...");
    } catch {
      setIsPlaying(false);
      setStatus("TTS request failed.");
    }
  }

  return (
    <main style={{ padding: "2rem", maxWidth: 700, fontFamily: "sans-serif" }}>
      <h1>Student Page</h1>

      <div style={{ marginBottom: 12 }}>
        <input
          placeholder="Class code"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          style={{ marginRight: 8 }}
        />

        <input
          type="number"
          placeholder="Student number"
          value={studentNumber}
          onChange={(e) => {
            const v = e.target.value;
            setStudentNumber(v === "" ? "" : Number(v));
          }}
          style={{ width: 160, marginRight: 8 }}
        />

        <button onClick={loadSession}>Join</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong>Status:</strong> {status}
      </div>

      <hr />

      <div style={{ marginBottom: 12 }}>
        <strong>Voice:</strong>{" "}
        <label style={{ marginRight: 12 }}>
          <input
            type="radio"
            name="gender"
            checked={gender === "female"}
            onChange={() => setGender("female")}
          />{" "}
          Female
        </label>
        <label>
          <input
            type="radio"
            name="gender"
            checked={gender === "male"}
            onChange={() => setGender("male")}
          />{" "}
          Male
        </label>
      </div>

      {item && (
        <div style={{ marginTop: 18 }}>
          <h3>Your Question</h3>

          <p>
            <strong>Q:</strong> {item.text}
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <button onClick={() => playTTS(item.text)} disabled={isPlaying}>
              🔊 Play Question
            </button>

            {item.hint && (
              <button
                onClick={() => playTTS(extractHintEnglish(item.hint || ""))}
                disabled={isPlaying}
              >
                🔊 Play Hint (English)
              </button>
            )}
          </div>

          {item.hint && (
            <p style={{ marginTop: 12, whiteSpace: "pre-line" }}>
              <strong>Hint:</strong>{" "}
              {item.hint}
            </p>
          )}
        </div>
      )}
    </main>
  );
}