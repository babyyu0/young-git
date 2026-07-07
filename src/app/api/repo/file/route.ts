import { NextRequest, NextResponse } from "next/server";
import { getFileDiffContent, isGitRepository } from "@/lib/gitRepo";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const repoPath = body?.path;
  const filePath = body?.filePath;

  if (
    !repoPath ||
    typeof repoPath !== "string" ||
    !filePath ||
    typeof filePath !== "string"
  ) {
    return NextResponse.json({ error: "경로가 필요합니다." }, { status: 400 });
  }

  const isRepo = await isGitRepository(repoPath);
  if (!isRepo) {
    return NextResponse.json(
      { error: "선택한 폴더는 git 저장소가 아닙니다." },
      { status: 400 },
    );
  }

  try {
    const content = await getFileDiffContent(repoPath, filePath);
    return NextResponse.json(content);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "파일을 읽을 수 없습니다.",
      },
      { status: 400 },
    );
  }
}
