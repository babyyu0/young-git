"use client";

import { useEffect, useState } from "react";
import { FileDiffViewer } from "@/components/FileDiffViewer";
import { FileTree, type RepoFileNode } from "@/components/FileTree";
import { FolderBrowserModal } from "@/components/FolderBrowserModal";

const LAST_REPO_PATH_KEY = "young-git:last-repo-path";

export default function Home() {
  const [isBrowserOpen, setBrowserOpen] = useState(false);
  const [repoPath, setRepoPath] = useState<string | null>(null);
  const [tree, setTree] = useState<RepoFileNode[] | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelect = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "저장소를 불러올 수 없습니다.");
      setRepoPath(data.path);
      setTree(data.tree);
      setSelectedFilePath(null);
      setBrowserOpen(false);
      localStorage.setItem(LAST_REPO_PATH_KEY, data.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장소를 불러올 수 없습니다.");
      localStorage.removeItem(LAST_REPO_PATH_KEY);
    } finally {
      setLoading(false);
    }
  };

  // 새로고침해도 마지막으로 연 저장소를 자동으로 다시 불러온다.
  useEffect(() => {
    (async () => {
      const lastPath = localStorage.getItem(LAST_REPO_PATH_KEY);
      if (lastPath) await handleSelect(lastPath);
    })();
  }, []);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-8 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
            young-git
          </h1>
          <button
            onClick={() => setBrowserOpen(true)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            저장소 열기
          </button>
        </div>

        {repoPath && (
          <p className="truncate text-sm text-zinc-500">{repoPath}</p>
        )}
        {loading && <p className="text-sm text-zinc-500">불러오는 중...</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {tree && (
          <div className="flex min-h-0 flex-1 gap-4">
            <div className="w-64 shrink-0 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
              <FileTree
                nodes={tree}
                selectedPath={selectedFilePath}
                onFileClick={setSelectedFilePath}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              {selectedFilePath && repoPath ? (
                <FileDiffViewer
                  key={selectedFilePath}
                  repoPath={repoPath}
                  filePath={selectedFilePath}
                />
              ) : (
                <p className="p-3 text-sm text-zinc-500">
                  왼쪽에서 파일을 선택하세요.
                </p>
              )}
            </div>
          </div>
        )}

        {!tree && !loading && (
          <p className="text-sm text-zinc-500">
            &quot;저장소 열기&quot; 버튼을 눌러 로컬 git 저장소 폴더를
            선택하세요.
          </p>
        )}
      </main>

      {isBrowserOpen && (
        <FolderBrowserModal
          onSelect={handleSelect}
          onClose={() => setBrowserOpen(false)}
        />
      )}
    </div>
  );
}
