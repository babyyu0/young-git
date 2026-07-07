import fs from "node:fs";
import path from "node:path";

export interface DirectoryEntry {
  name: string;
  path: string;
}

export interface DirectoryListing {
  /** null이면 "내 PC"(Windows 드라이브 목록) 화면을 뜻한다. */
  path: string | null;
  /** null이면 더 이상 상위로 갈 수 없음(드라이브 목록이 최상위). */
  parent: string | null;
  entries: DirectoryEntry[];
}

function listWindowsDrives(): DirectoryEntry[] {
  const drives: DirectoryEntry[] = [];
  for (let code = 65; code <= 90; code++) {
    const letter = String.fromCharCode(code);
    const drivePath = `${letter}:\\`;
    if (fs.existsSync(drivePath)) {
      drives.push({ name: drivePath, path: drivePath });
    }
  }
  return drives;
}

export function listDirectory(targetPath: string | null): DirectoryListing {
  if (!targetPath) {
    if (process.platform === "win32") {
      return { path: null, parent: null, entries: listWindowsDrives() };
    }
    targetPath = "/";
  }

  const stat = fs.statSync(targetPath);
  if (!stat.isDirectory()) {
    throw new Error("선택한 경로는 폴더가 아닙니다.");
  }

  const dirents = fs.readdirSync(targetPath, { withFileTypes: true });
  const entries: DirectoryEntry[] = dirents
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      path: path.join(targetPath as string, entry.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const parsed = path.parse(targetPath);
  const isRoot = parsed.root === targetPath;
  const parent =
    isRoot && process.platform === "win32" ? null : path.dirname(targetPath);

  return { path: targetPath, parent, entries };
}
