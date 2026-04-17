import { NextResponse } from "next/server";
import { listWorkbookFiles } from "@/lib/files-store";

export async function GET() {
  const files = await listWorkbookFiles();
  return NextResponse.json({ files });
}
