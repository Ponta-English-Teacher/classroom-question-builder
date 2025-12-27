"use client";

import { useState } from "react";

type Item = {
  text: string;
  hint?: string;
  grammarTag?: string;
};

export default function StudentPage() {
  const [classId, setClassId] = useState("");
  const [studentNumber, setStudentNumber] = useState<number | "">("");
  const [status, setStatus] = useState("");
  const [item, setItem] = useState<Item | null>(null);

  async function loadSession() {
    if (!classId || !studentNumber) {
      setStatus("Please enter class code and student number.");
      return;
    }

    setStatus("Loading...");

    try {
      const res = await fetch(`/api/session?classId=${classId}`);
      const data = await res.json();

      if (!data.ok || !data.session?.questions?.length) {
        setStatus("Session not found or has no questions.");
        return;
      }

      const questions = data.session.questions;
      const index = (Number(studentNumber) - 1) % questions.length;

      setItem(questions[index]);
      setStatus(`Loaded question for student #${studentNumber}`);
    } catch {
      setStatus("Error loading session.");
    }
  }

  return (
    <main style={{ padding: "2rem", maxWidth: 700 }}>
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
          onChange={(e) => setStudentNumber(Number(e.target.value))}
          style={{ width: 140, marginRight: 8 }}
        />
        <button onClick={loadSession}>Join</button>
      </div>

      <div><strong>Status:</strong> {status}</div>

      {item && (
        <div style={{ marginTop: 24 }}>
          <h3>Your Question</h3>
          <p><strong>Q:</strong> {item.text}</p>

          {item.hint && (
            <p style={{ marginTop: 12 }}>
              <strong>Hint:</strong> {item.hint}
            </p>
          )}
        </div>
      )}
    </main>
  );
}