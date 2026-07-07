import { NextRequest, NextResponse } from "next/server";
import { getUnpushedCommits, isGitRepository } from "@/lib/gitRepo";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const repoPath = body?.path;

  if (!repoPath || typeof repoPath !== "string") {
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
    const info = await getUnpushedCommits(repoPath);
    return NextResponse.json(info);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "커밋 목록을 불러올 수 없습니다.",
      },
      { status: 400 },
    );
  }
}
