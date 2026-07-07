import { NextRequest, NextResponse } from "next/server";
import {
  commitChanges,
  isGitRepository,
  listRepoFileTree,
} from "@/lib/gitRepo";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const repoPath = body?.path;
  const title = body?.title;
  const message = body?.message;

  if (
    !repoPath ||
    typeof repoPath !== "string" ||
    !title ||
    typeof title !== "string"
  ) {
    return NextResponse.json(
      { error: "커밋 제목이 필요합니다." },
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

  const fullMessage =
    typeof message === "string" && message.trim()
      ? `${title}\n\n${message}`
      : title;

  try {
    await commitChanges(repoPath, fullMessage);
    const tree = await listRepoFileTree(repoPath);
    return NextResponse.json({ tree });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "커밋할 수 없습니다.",
      },
      { status: 400 },
    );
  }
}
