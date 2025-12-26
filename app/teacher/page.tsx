"use client";

import { useState } from "react";

type Item = {
  text: string;
  followUp: string;
  grammarTag: string;
};

export default function TeacherPage() {
  const [topic, setTopic] = useState("travel");
  const [level, setLevel] = useState("A2");
  const [count, setCount] = useState(5);
  const [classSize, setClassSize] = useState(20);

  const [classId, setClassId] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<string>("");

  async function createSession() {
    setStatus("Creating session...");
    const r = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, classSize, count }),
    });
    const j = await r.json();
    if (!j.ok) {
      setStatus("Error: " + j.error);
      return;
    }
    setClassId(j.classId);
    setStatus(`Session created: ${j.classId}`);
  }

  async function generateQuestions() {
    setStatus("Generating questions...");
    const r = await fetch("/api/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, level, count }),
    });
    const j = await r.json();
    if (!j.ok) {
      setStatus("Error: " + j.error);
      return;
    }
    setItems(j.items || []);
    setStatus("Questions generated. You can edit them now.");
  }

  async function saveToSession() {
    if (!classId) {
      setStatus("Create or open a session first.");
      return;
    }
    setStatus("Saving questions to session...");
    const r = await fetch(`/api/session?classId=${encodeURIComponent(classId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions: items }),
    });
    const j = await r.json();
    if (!j.ok) {
      setStatus("Error: " + j.error);
      return;
    }
    setStatus("Saved. Students can join with this class code: " + classId);
  }

  function updateItem(i: number, field: keyof Item, value: string) {
    setItems((prev) => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [field]: value };
      return copy;
    });
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 900 }}>
      <h1>Teacher</h1>

      <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem" }}>
        <label>
          Topic:
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            style={{ marginLeft: 8, width: 300 }}
          />
        </label>

        <label>
          Level:
          <input
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            style={{ marginLeft: 8, width: 120 }}
          />
        </label>

        <label>
          Number of questions:
          <input
            type="number"
            value={count}
            min={1}
            max={10}
            onChange={(e) => setCount(Number(e.target.value))}
            style={{ marginLeft: 8, width: 80 }}
          />
        </label>

        <label>
          Class size:
          <input
            type="number"
            value={classSize}
            min={1}
            max={200}
            onChange={(e) => setClassSize(Number(e.target.value))}
            style={{ marginLeft: 8, width: 80 }}
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: "1rem" }}>
        <button onClick={createSession}>Create new session</button>
        <button onClick={generateQuestions}>Generate questions</button>
        <button onClick={saveToSession}>Save questions to session</button>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <strong>Class code:</strong> {classId || "(not created yet)"}
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <strong>Status:</strong> {status}
      </div>

      <hr />

      <h2>Editable Questions</h2>

      {items.length === 0 ? (
        <p>No questions yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {items.map((it, i) => (
            <div key={i} style={{ border: "1px solid #ccc", padding: 12 }}>
              <div style={{ marginBottom: 8 }}>
                <div>Q{i + 1} text</div>
                <input
                  value={it.text}
                  onChange={(e) => updateItem(i, "text", e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <div>Follow-up</div>
                <input
                  value={it.followUp}
                  onChange={(e) => updateItem(i, "followUp", e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <div>Grammar tag</div>
                <input
                  value={it.grammarTag}
                  onChange={(e) => updateItem(i, "grammarTag", e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
