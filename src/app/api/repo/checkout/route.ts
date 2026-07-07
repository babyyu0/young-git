import { NextRequest, NextResponse } from "next/server";
import {
  checkoutBranch,
  isGitRepository,
  listBranches,
  listRepoFileTree,
  type CheckoutDirtyMode,
} from "@/lib/gitRepo";

const VALID_MODES: CheckoutDirtyMode[] = ["stash", "discard"];

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const repoPath = body?.path;
  const branch = body?.branch;
  const mode = body?.mode;

  if (
    !repoPath ||
    typeof repoPath !== "string" ||
    !branch ||
    typeof branch !== "string" ||
    (mode !== undefined && !VALID_MODES.includes(mode))
  ) {
    return NextResponse.json({ error: "브랜치가 필요합니다." }, { status: 400 });
  }

  const isRepo = await isGitRepository(repoPath);
  if (!isRepo) {
    return NextResponse.json(
      { error: "선택한 폴더는 git 저장소가 아닙니다." },
      { status: 400 },
    );
  }

  try {
    const result = await checkoutBranch(repoPath, branch, mode);

    if (result.status === "needs-decision") {
      return NextResponse.json(result);
    }

    const [tree, branchInfo] = await Promise.all([
      listRepoFileTree(repoPath),
      listBranches(repoPath),
    ]);
    return NextResponse.json({ ...result, tree, ...branchInfo });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "브랜치를 전환할 수 없습니다.",
      },
      { status: 400 },
    );
  }
}
