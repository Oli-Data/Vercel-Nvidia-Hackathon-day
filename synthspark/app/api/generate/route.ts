
import OpenAI from "openai";
import { NextResponse } from "next/server";

// IMPORTANT: In Next.js App Router, this file must live at:
//   app/api/generate/route.ts
// If it's currently under api/generate/route.ts, move it under app/api/generate/route.ts
// so the endpoint is accessible at /api/generate.
export const runtime = "edge";

const client = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

const SYSTEM = `You are a dataset schema and sample data generator.
Respond with VALID JSON ONLY in this exact shape:
{
  "schema": [
    { "name": "field_name", "type": "string|integer|float|boolean|date|datetime", "description": "brief description" }
  ],
  "csv": "header1,header2\\nrow1col1,row1col2\\nrow2col1,row2col2"
}
Rules:
- Generate 5-8 schema fields that match the dataset description
- CSV must include a header row and 10-15 realistic rows
- Use \\n for newlines
- Do not include any text outside the JSON`;

function clampCsv(csv: string, maxRows: number) {
  const lines = (csv || "").trim().split("\n");
  if (lines.length <= maxRows + 1) return (csv || "").trim();
  return lines.slice(0, maxRows + 1).join("\n");
}

export async function POST(req: Request) {
  try {
    const { spec } = await req.json();
    if (!spec || typeof spec !== "string") {
      return NextResponse.json({ error: "Missing 'spec' string in body." }, { status: 400 });
    }

    // First attempt: ask the model for strict JSON
    const completion = await client.chat.completions.create({
      model: "nvidia/nvidia-nemotron-nano-9b-v2",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Dataset description:\n${spec}\nReturn JSON now.` },
      ],
      temperature: 0.2,
      max_tokens: 1800,
      stream: false,
    });

    let text = completion.choices?.[0]?.message?.content ?? "";
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      // One repair pass: ask the model to output valid JSON only
      const repair = await client.chat.completions.create({
        model: "nvidia/nvidia-nemotron-nano-9b-v2",
        messages: [
          { role: "system", content: "You fix invalid JSON. Output ONLY VALID JSON, no extra prose." },
          { role: "user", content: `Fix to valid JSON with keys {schema:[], csv:""}:\n${text}` },
        ],
        temperature: 0,
        max_tokens: 1200,
        stream: false,
      });
      text = repair.choices?.[0]?.message?.content ?? "{}";
      parsed = JSON.parse(text);
    }

    // Basic shape checks
    const schema = Array.isArray(parsed?.schema) ? parsed.schema : [];
    let csv = typeof parsed?.csv === "string" ? parsed.csv : "";
    csv = clampCsv(csv, 100); // header + 100 rows

    // Build a response that supports both the new and old front-end shapes
    const response = {
      schema,
      csv,
      json_schema: { columns: schema },
      csv_sample: csv,
      raw_text: text,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("[generate] error:", error);
    return NextResponse.json(
      { error: "Failed to generate dataset. Check NVIDIA_API_KEY, model id, or move route to app/api/generate/route.ts." },
      { status: 500 }
    );
  }
}