import fs from "node:fs";
import path from "node:path";
import simpleGit from "simple-git";

export type FileGitStatus =
  | "modified"
  | "added"
  | "deleted"
  | "renamed"
  | "untracked"
  | "conflicted";

export interface RepoFileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  status?: FileGitStatus;
  children?: RepoFileNode[];
}

async function getChangedFileStatuses(
  repoPath: string,
): Promise<Map<string, FileGitStatus>> {
  const status = await simpleGit(repoPath).status();
  const changed = new Map<string, FileGitStatus>();

  // 우선순위가 낮은 것부터 넣어서, 뒤에서 conflicted가 항상 덮어쓰도록 한다.
  for (const file of status.not_added) changed.set(file, "untracked");
  for (const { to } of status.renamed) changed.set(to, "renamed");
  for (const file of status.deleted) changed.set(file, "deleted");
  for (const file of status.created) changed.set(file, "added");
  for (const file of status.modified) changed.set(file, "modified");
  for (const file of status.conflicted) changed.set(file, "conflicted");

  return changed;
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
  const [raw, changedStatuses] = await Promise.all([
    git.raw(["ls-files", "--cached", "--others", "--exclude-standard"]),
    getChangedFileStatuses(repoPath),
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
      status: changedStatuses.get(relPath),
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
