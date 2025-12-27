import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 720 }}>
      <h1>Scavenger Hunt App</h1>

      <p style={{ marginTop: 8 }}>
        Choose your page:
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        <Link href="/teacher">
          <button>Teacher</button>
        </Link>

        <Link href="/student">
          <button>Student</button>
        </Link>
      </div>

      <hr style={{ margin: "24px 0" }} />

      <p style={{ opacity: 0.8 }}>
        Tip: Teacher creates a session → generates & saves questions → students join with class code.
      </p>
    </main>
  );
}