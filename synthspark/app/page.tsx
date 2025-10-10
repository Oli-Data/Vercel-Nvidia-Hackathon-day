"use client";
import { useState } from "react";

type SchemaField = {
  name: string;
  type: string;
  description: string;
};

type GenerateResponse = {
  json_schema: { columns: SchemaField[] };
  csv_sample: string;
  // For backward compatibility if API returns old keys:
  schema?: SchemaField[];
  csv?: string;
};

const PRESETS = {
  retail:
    "Retail transactions with realistic dates, amounts $1–$500, categories, and a binary fraud_flag (3–5%).",
  iot: "IoT sensor data with timestamps, device IDs, temperature readings (15-35°C), humidity (30-80%), and status codes.",
  support:
    "Support tickets with ticket IDs, customer names, issue categories, priority levels, timestamps, and resolution status.",
} as const;

export default function Page() {
  const [spec, setSpec] = useState<string>(PRESETS.retail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schema, setSchema] = useState<SchemaField[] | null>(null);
  const [csv, setCsv] = useState<string>("");
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setSchema(null);
    setCsv("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec }),
      });
      const data: GenerateResponse = await res.json();
      if (!res.ok || (data as any).error) {
        throw new Error((data as any).error || "Generation failed");
      }
      // Support both {json_schema, csv_sample} and {schema, csv}
      const cols =
        data.json_schema?.columns ??
        (Array.isArray(data.schema) ? data.schema : []);
      const csvOut = data.csv_sample ?? data.csv ?? "";
      setSchema(cols || []);
      setCsv(csvOut || "");
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!csv) return;
    try {
      await navigator.clipboard.writeText(csv);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  function handleDownload() {
    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "synthspark_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main style={{ minHeight: "100vh", padding: "2rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <header style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>
            SynthSpark — Nemotron
          </h1>
          <p style={{ opacity: 0.8 }}>
            Type a dataset idea → get schema + CSV sample.
          </p>
        </header>

        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <button onClick={() => setSpec(PRESETS.retail)}>Retail</button>
            <button onClick={() => setSpec(PRESETS.iot)}>IoT Sensors</button>
            <button onClick={() => setSpec(PRESETS.support)}>Support Tickets</button>
          </div>

          <textarea
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            placeholder="Describe your dataset idea..."
            style={{
              width: "100%",
              minHeight: 120,
              padding: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              resize: "vertical",
              marginBottom: 12,
            }}
          />

          <button
            onClick={handleGenerate}
            disabled={loading || !spec.trim()}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #111827",
              background: "#111827",
              color: "white",
              borderRadius: 8,
              opacity: loading || !spec.trim() ? 0.6 : 1,
              cursor: loading || !spec.trim() ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Generating…" : "Generate"}
          </button>
          {error && (
            <p style={{ color: "#b91c1c", marginTop: 8 }}>
              {error}
            </p>
          )}
        </section>

        {schema && schema.length > 0 && (
          <section
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 8 }}>
              Schema
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ textAlign: "left", padding: "8px 6px" }}>Name</th>
                    <th style={{ textAlign: "left", padding: "8px 6px" }}>Type</th>
                    <th style={{ textAlign: "left", padding: "8px 6px" }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {schema.map((f, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 6px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{f.name}</td>
                      <td style={{ padding: "8px 6px", opacity: 0.8 }}>{f.type}</td>
                      <td style={{ padding: "8px 6px" }}>{f.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {csv && (
          <section
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>CSV Preview</h2>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={handleCopy}>{copied ? "Copied!" : "Copy CSV"}</button>
                <button onClick={handleDownload}>Download CSV</button>
              </div>
            </div>
            <pre
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 12,
                maxHeight: 400,
                overflow: "auto",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              {csv}
            </pre>
          </section>
        )}
      </div>
    </main>
  );
}
