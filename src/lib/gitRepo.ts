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

async function remoteRefExists(
  git: ReturnType<typeof simpleGit>,
  ref: string,
): Promise<boolean> {
  try {
    await git.raw(["rev-parse", "--verify", ref]);
    return true;
  } catch {
    return false;
  }
}

/**
 * 비교 기준이 될 원격 ref를 정한다. 업스트림이 이미 설정되어 있으면 그것을,
 * 아니면 같은 이름의 origin 브랜치(origin/<current>)가 있는지 확인해서 쓴다.
 * 둘 다 없으면(원격에 한 번도 push된 적 없는 브랜치) null을 돌려준다.
 */
async function resolveCompareRef(
  git: ReturnType<typeof simpleGit>,
  status: Awaited<ReturnType<ReturnType<typeof simpleGit>["status"]>>,
): Promise<string | null> {
  if (status.tracking) return status.tracking;
  if (!status.current) return null;

  const candidate = `origin/${status.current}`;
  return (await remoteRefExists(git, candidate)) ? candidate : null;
}

/** 업스트림(또는 같은 이름의 origin 브랜치) 대비 아직 푸시하지 않은 커밋 목록을 가져온다. */
export async function getUnpushedCommits(
  repoPath: string,
): Promise<UnpushedInfo> {
  const git = simpleGit(repoPath);
  const status = await git.status();
  const compareRef = await resolveCompareRef(git, status);

  if (!compareRef) {
    // 원격에 같은 이름의 브랜치가 아예 없으면(첫 push), 로컬 커밋 전체가 새로 올라간다.
    const log = await git.log();
    return {
      hasUpstream: false,
      commitTitles: log.all.map((commit) => commit.message),
    };
  }

  const log = await git.log({ from: compareRef, to: "HEAD" });
  return {
    hasUpstream: Boolean(status.tracking),
    commitTitles: log.all.map((commit) => commit.message),
  };
}

/**
 * 현재 브랜치를 origin의 같은 이름 브랜치로 푸시한다.
 * 업스트림이 아직 설정되지 않았다면(-u) 그 자리에서 설정한다.
 */
export async function pushChanges(repoPath: string): Promise<void> {
  const git = simpleGit(repoPath);
  const status = await git.status();
  if (!status.current) {
    throw new Error("현재 브랜치를 확인할 수 없습니다(detached HEAD).");
  }
  await git.raw(["push", "-u", "origin", status.current]);
}

export interface BranchInfo {
  current: string;
  branches: string[];
}

/** 로컬 브랜치 목록과 현재 브랜치를 가져온다. */
export async function listBranches(repoPath: string): Promise<BranchInfo> {
  const summary = await simpleGit(repoPath).branchLocal();
  return { current: summary.current, branches: summary.all };
}

export type CheckoutDirtyMode = "stash" | "discard";

export type CheckoutResult =
  | { status: "needs-decision"; changedFiles: string[] }
  | { status: "ok"; stashed: boolean };

/**
 * 다른 브랜치로 체크아웃한다. 워킹 디렉터리에 변경사항(추적 중 + untracked)이
 * 있고 처리 방식(mode)이 정해지지 않았다면, 체크아웃을 진행하지 않고
 * "needs-decision"과 변경된 파일 목록을 돌려준다(사용자가 stash/discard를
 * 선택하도록 하기 위함). mode가 주어지면 그에 따라 처리한 뒤 체크아웃한다.
 * stash한 내용은 자동으로 복원하지 않으므로, 필요하면 git stash pop으로 꺼내야 한다.
 */
export async function checkoutBranch(
  repoPath: string,
  branch: string,
  mode?: CheckoutDirtyMode,
): Promise<CheckoutResult> {
  const git = simpleGit(repoPath);
  const status = await git.status();
  const isDirty = !status.isClean();

  if (isDirty && !mode) {
    return {
      status: "needs-decision",
      changedFiles: status.files.map((file) => file.path),
    };
  }

  if (isDirty && mode === "stash") {
    await git.stash(["push", "--include-untracked"]);
  } else if (isDirty && mode === "discard") {
    await git.raw(["reset", "--hard", "HEAD"]);
    await git.raw(["clean", "-fd"]);
  }

  await git.checkout(branch);
  return { status: "ok", stashed: isDirty && mode === "stash" };
}

/** baseBranch에서 새 브랜치를 만들고 그 브랜치로 체크아웃한다. */
export async function createBranch(
  repoPath: string,
  branchName: string,
  baseBranch: string,
): Promise<void> {
  await simpleGit(repoPath).checkoutBranch(branchName, baseBranch);
}
