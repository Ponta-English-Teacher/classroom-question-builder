"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [classCode, setClassCode] = useState("");

  function goTeacher() {
    router.push("/teacher");
  }

  function goStudent() {
    router.push("/student");
  }

  function openTeacherByCode() {
    const cid = classCode.trim();
    if (!cid) return;
    router.push(`/teacher?classId=${encodeURIComponent(cid)}`);
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 900 }}>
      <h1>Scavenger Hunt App</h1>

      <p>Choose your page:</p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: "1rem" }}>
        <button onClick={goTeacher}>Teacher</button>
        <button onClick={goStudent}>Student</button>
      </div>

      <div
        style={{
          border: "1px solid #ddd",
          padding: 12,
          borderRadius: 8,
          marginBottom: "1rem",
          maxWidth: 520,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          Open Teacher editor by class code
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
            placeholder="e.g. FEG4-XJKU"
            style={{ width: 260 }}
          />
          <button onClick={openTeacherByCode} disabled={!classCode.trim()}>
            Open Teacher Editor
          </button>
        </div>

        <div style={{ marginTop: 8, fontSize: 13, color: "#555" }}>
          Tip: Teacher creates a session → generates & saves questions → students join with class code.
        </div>
      </div>
    </main>
  );
}