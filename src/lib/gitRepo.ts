import fs from "node:fs";
import path from "node:path";
import simpleGit from "simple-git";

export interface RepoFileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: RepoFileNode[];
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
  const raw = await git.raw([
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
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
