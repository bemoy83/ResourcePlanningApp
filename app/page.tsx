import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 20px",
        background:
          "radial-gradient(circle at top, rgba(99, 102, 241, 0.12), transparent 60%), var(--bg-secondary)",
      }}
    >
      <section
        style={{
          maxWidth: 720,
          width: "100%",
          padding: "40px",
          backgroundColor: "var(--surface-default)",
          border: "1px solid var(--border-primary)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "12px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            fontWeight: 600,
          }}
        >
          Resource Planning
        </p>
        <h1
          style={{
            margin: "12px 0 10px",
            fontSize: "32px",
            lineHeight: "1.15",
            letterSpacing: "-0.02em",
          }}
        >
          Plan hours with confidence
        </h1>
        <p style={{ margin: "0 0 28px", color: "var(--text-secondary)" }}>
          Import events, allocate work, and compare demand against capacity in one workspace.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          <Link
            href="/workspace"
            style={{
              padding: "10px 22px",
              borderRadius: "999px",
              backgroundColor: "var(--button-primary-bg)",
              color: "var(--text-inverse)",
              border: "1px solid var(--button-primary-border)",
              textDecoration: "none",
              fontWeight: 600,
              boxShadow: "var(--shadow-primary-glow)",
            }}
          >
            Open workspace
          </Link>
          <Link
            href="/data/events/import"
            style={{
              padding: "10px 22px",
              borderRadius: "999px",
              backgroundColor: "var(--surface-default)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-primary)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Import event data
          </Link>
        </div>
      </section>
    </main>
  );
}
