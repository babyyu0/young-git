import { NextRequest, NextResponse } from "next/server";
import {
  discardFiles,
  isGitRepository,
  listRepoFileTree,
} from "@/lib/gitRepo";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const repoPath = body?.path;
  const filePaths = body?.filePaths;

  if (
    !repoPath ||
    typeof repoPath !== "string" ||
    !Array.isArray(filePaths) ||
    filePaths.length === 0 ||
    !filePaths.every((p) => typeof p === "string")
  ) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const isRepo = await isGitRepository(repoPath);
  if (!isRepo) {
    return NextResponse.json(
      { error: "선택한 폴더는 git 저장소가 아닙니다." },
      { status: 400 },
    );
  }

  try {
    await discardFiles(repoPath, filePaths);
    const tree = await listRepoFileTree(repoPath);
    return NextResponse.json({ tree });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "되돌릴 수 없습니다.",
      },
      { status: 400 },
    );
  }
}
