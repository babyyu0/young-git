import fs from "node:fs";
import path from "node:path";
import simpleGit from "simple-git";

export interface FileGitState {
  /** index(스테이지)에 변경이 있는지 여부. 체크박스/뱃지 상태로 쓰인다. */
  staged: boolean;
}

export interface RepoFileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  status?: FileGitState;
  children?: RepoFileNode[];
}

async function getFileGitStates(
  repoPath: string,
): Promise<Map<string, FileGitState>> {
  const status = await simpleGit(repoPath).status();
  const stagedPaths = new Set(status.staged);
  const states = new Map<string, FileGitState>();

  for (const file of status.files) {
    states.set(file.path, {
      staged:
        stagedPaths.has(file.path) ||
        (file.index !== " " && file.index !== "?"),
    });
  }

  return states;
}

export async function isGitRepository(repoPath: string): Promise<boolean> {
  try {
    if (!fs.statSync(repoPath).isDirectory()) return false;
  } catch {
    return false;
  }

  try {
    return await simpleGit(repoPath).checkIsRepo();
  } catch {
    return false;
  }
}

/**
 * git이 무시하지 않는 파일(추적 중 + untracked)만 모아 트리로 만든다.
 * .gitignore된 파일/폴더(node_modules 등)는 자연히 제외된다.
 */
export async function listRepoFileTree(
  repoPath: string,
): Promise<RepoFileNode[]> {
  const git = simpleGit(repoPath);
  const [raw, fileGitStates] = await Promise.all([
    git.raw(["ls-files", "--cached", "--others", "--exclude-standard"]),
    getFileGitStates(repoPath),
  ]);

  const relativePaths = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const root: RepoFileNode[] = [];
  const dirChildren = new Map<string, RepoFileNode[]>([["", root]]);

  const ensureDir = (dirPath: string): RepoFileNode[] => {
    const existing = dirChildren.get(dirPath);
    if (existing) return existing;

    const parentPath = path.posix.dirname(dirPath);
    const parentChildren =
      parentPath === "." ? root : ensureDir(parentPath);

    const node: RepoFileNode = {
      name: path.posix.basename(dirPath),
      path: dirPath,
      type: "directory",
      children: [],
    };
    parentChildren.push(node);
    dirChildren.set(dirPath, node.children!);
    return node.children!;
  };

  // git은 항상 '/'로 구분된 경로를 출력한다.
  for (const relPath of relativePaths) {
    const dir = path.posix.dirname(relPath);
    const children = dir === "." ? root : ensureDir(dir);
    children.push({
      name: path.posix.basename(relPath),
      path: relPath,
      type: "file",
      status: fileGitStates.get(relPath),
    });
  }

  const sortTree = (nodes: RepoFileNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((node) => node.children && sortTree(node.children));
  };
  sortTree(root);

  return root;
}

export interface FileDiffContent {
  oldContent: string;
  newContent: string;
  isBinary: boolean;
}

function assertSafeRelativeFilePath(filePath: string) {
  const normalized = path.posix.normalize(filePath);
  if (normalized.startsWith("..") || path.posix.isAbsolute(normalized)) {
    throw new Error("잘못된 파일 경로입니다.");
  }
}

/**
 * HEAD 시점(변경 전)과 워킹 디렉터리(변경 후)의 파일 내용을 각각 읽어온다.
 * 새로 추가된 파일은 HEAD에 없으므로 oldContent가 빈 문자열이고,
 * 삭제된 파일은 워킹 디렉터리에 없으므로 newContent가 빈 문자열이다.
 */
export async function getFileDiffContent(
  repoPath: string,
  filePath: string,
): Promise<FileDiffContent> {
  assertSafeRelativeFilePath(filePath);

  const git = simpleGit(repoPath);

  let oldContent = "";
  try {
    oldContent = await git.show([`HEAD:${filePath}`]);
  } catch {
    oldContent = "";
  }

  let newContent = "";
  try {
    newContent = fs.readFileSync(path.join(repoPath, filePath), "utf8");
  } catch {
    newContent = "";
  }

  const isBinary =
    oldContent.includes("\u0000") || newContent.includes("\u0000");

  return { oldContent, newContent, isBinary };
}

/**
 * 선택된 파일들을 한 번에 스테이징(git add)하거나 언스테이징(git reset)한다.
 * 언스테이징은 워킹 디렉터리의 변경 내용은 그대로 두고 index에서만 뺀다.
 */
export async function setFilesStaged(
  repoPath: string,
  filePaths: string[],
  staged: boolean,
): Promise<void> {
  filePaths.forEach(assertSafeRelativeFilePath);
  if (filePaths.length === 0) return;

  const git = simpleGit(repoPath);
  if (staged) {
    await git.add(filePaths);
  } else {
    await git.raw(["reset", "HEAD", "--", ...filePaths]);
  }
}

/** 현재 스테이징된 변경 내용을 커밋한다. */
export async function commitChanges(
  repoPath: string,
  message: string,
): Promise<void> {
  await simpleGit(repoPath).commit(message);
}

export interface UnpushedInfo {
  /** 업스트림(리모트 추적) 브랜치가 설정되어 있는지 여부. */
  hasUpstream: boolean;
  /** 아직 푸시되지 않은 커밋들의 제목(첫 줄) 목록, 최신순. */
  commitTitles: string[];
}

/** 업스트림 대비 아직 푸시하지 않은 커밋 목록을 가져온다. */
export async function getUnpushedCommits(
  repoPath: string,
): Promise<UnpushedInfo> {
  const git = simpleGit(repoPath);
  const status = await git.status();

  if (!status.tracking) {
    return { hasUpstream: false, commitTitles: [] };
  }

  const log = await git.log({ from: status.tracking, to: "HEAD" });
  return {
    hasUpstream: true,
    commitTitles: log.all.map((commit) => commit.message),
  };
}

/** 현재 브랜치를 업스트림으로 푸시한다. */
export async function pushChanges(repoPath: string): Promise<void> {
  await simpleGit(repoPath).push();
}
