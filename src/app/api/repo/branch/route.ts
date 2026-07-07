import { NextRequest, NextResponse } from "next/server";
import {
  createBranch,
  isGitRepository,
  listBranches,
  listRepoFileTree,
} from "@/lib/gitRepo";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const repoPath = body?.path;
  const name = body?.name;
  const baseBranch = body?.baseBranch;

  if (
    !repoPath ||
    typeof repoPath !== "string" ||
    !name ||
    typeof name !== "string" ||
    !baseBranch ||
    typeof baseBranch !== "string"
  ) {
    return NextResponse.json(
      { error: "브랜치 이름과 기준 브랜치가 필요합니다." },
      { status: 400 },
    );
  }

  const isRepo = await isGitRepository(repoPath);
  if (!isRepo) {
    return NextResponse.json(
      { error: "선택한 폴더는 git 저장소가 아닙니다." },
      { status: 400 },
    );
  }

  try {
    await createBranch(repoPath, name, baseBranch);
    const [tree, branchInfo] = await Promise.all([
      listRepoFileTree(repoPath),
      listBranches(repoPath),
    ]);
    return NextResponse.json({ tree, ...branchInfo });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "브랜치를 만들 수 없습니다.",
      },
      { status: 400 },
    );
  }
}
