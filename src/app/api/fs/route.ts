import { NextRequest, NextResponse } from "next/server";
import { listDirectory } from "@/lib/directoryBrowser";

export async function GET(request: NextRequest) {
  const targetPath = request.nextUrl.searchParams.get("path");

  try {
    const listing = listDirectory(targetPath);
    return NextResponse.json(listing);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "폴더를 읽을 수 없습니다.",
      },
      { status: 400 },
    );
  }
}
