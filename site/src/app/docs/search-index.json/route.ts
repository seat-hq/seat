import { NextResponse } from "next/server";
import { getSearchIndex } from "@/lib/docs/content";

export const dynamic = "force-static";

/** Build-time search index for the docs ⌘K search. */
export function GET() {
  return NextResponse.json(getSearchIndex());
}
