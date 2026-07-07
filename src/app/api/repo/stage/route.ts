import { NextRequest, NextResponse } from "next/server";
import {
  isGitRepository,
  listRepoFileTree,
  setFilesStaged,
} from "@/lib/gitRepo";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const repoPath = body?.path;
  const filePaths = body?.filePaths;
  const staged = body?.staged;

  if (
    !repoPath ||
    typeof repoPath !== "string" ||
    !Array.isArray(filePaths) ||
    filePaths.length === 0 ||
    !filePaths.every((p) => typeof p === "string") ||
    typeof staged !== "boolean"
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
    await setFilesStaged(repoPath, filePaths, staged);
    const tree = await listRepoFileTree(repoPath);
    return NextResponse.json({ tree });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "작업을 수행할 수 없습니다.",
      },
      { status: 400 },
    );
  }
}
