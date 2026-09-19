import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { RecordedFill } from "@/lib/fills";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CANDIDATES = [
  path.join(process.cwd(), "..", "keeper", "data", "fills.json"),
  path.join(process.cwd(), "keeper", "data", "fills.json"),
];

async function loadFills(): Promise<RecordedFill[]> {
  for (const file of CANDIDATES) {
    try {
      const raw = await readFile(file, "utf8");
      const json = JSON.parse(raw) as { fills?: RecordedFill[] };
      if (Array.isArray(json.fills)) return json.fills;
    } catch {
      // try next path
    }
  }
  return [];
}

export async function GET() {
  const fills = await loadFills();
  return NextResponse.json({ fills });
}
