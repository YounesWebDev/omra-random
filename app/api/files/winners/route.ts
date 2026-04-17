import { NextResponse } from "next/server";
import { buildWinnersWorkbook, type PersonEntry } from "@/lib/files-store";

interface WinnersRequestBody {
  file?: string;
  winners?: PersonEntry[];
}

export async function POST(request: Request) {
  const body = (await request.json()) as WinnersRequestBody;

  if (!body.file) {
    return NextResponse.json({ error: "Missing source file." }, { status: 400 });
  }

  if (!Array.isArray(body.winners)) {
    return NextResponse.json({ error: "Missing winners list." }, { status: 400 });
  }

  try {
    const { fileName, buffer } = buildWinnersWorkbook(body.file, body.winners);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to download winners." },
      { status: 400 },
    );
  }
}
