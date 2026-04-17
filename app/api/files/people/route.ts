import { NextResponse } from "next/server";
import { readPeopleFromWorkbook } from "@/lib/files-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get("file");

  if (!file) {
    return NextResponse.json({ error: "Missing file parameter." }, { status: 400 });
  }

  try {
    const people = await readPeopleFromWorkbook(file);
    return NextResponse.json({ people });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to read file." },
      { status: 400 },
    );
  }
}
