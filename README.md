# SynthSpark

SynthSpark turns a plain-English dataset description into a proposed column schema and a small sample of synthetic CSV data. It was built for the NVIDIA and Vercel hackathon in October 2025 as a way to prototype data pipelines, dashboards, or validation rules before real data is available.

## What it does

1. Describe a dataset, or start with a preset for retail transactions, IoT readings, or support tickets.
2. Review the generated schema, including column names, data types, and descriptions.
3. Preview the sample rows, then copy the CSV or download it as `synthspark_sample.csv`.

**Example prompt:** “Generate support tickets with a ticket ID, creation date, issue category, priority, and resolution status.”

The output is model-generated sample data. Check its accuracy and consistency before using it for testing, and don’t put private data in prompts.

## How it works

The Next.js frontend sends the description to a [server-side API route](synthspark/app/api/generate/route.ts). The route calls NVIDIA Nemotron Nano 9B v2 through NVIDIA’s OpenAI-compatible API, parses the JSON response, and makes one repair attempt if the first response is not valid JSON. The browser renders the schema and CSV preview and handles the export.

## Run locally

```bash
cd synthspark
npm ci
```

Create `synthspark/.env.local` with `NVIDIA_API_KEY=your_key_here`. Keep your real key out of Git. Run `npm run dev` from `synthspark` and open [localhost:3000](http://localhost:3000).

This repository preserves the hackathon prototype. Live generation depends on access to the configured NVIDIA model endpoint. Before deploying publicly, update the pinned dependencies and verify that the inference endpoint is still supported.
