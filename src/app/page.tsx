"use client";

import { useState } from "react";
import { FileTree, type RepoFileNode } from "@/components/FileTree";
import { FolderBrowserModal } from "@/components/FolderBrowserModal";

export default function Home() {
  const [isBrowserOpen, setBrowserOpen] = useState(false);
  const [repoPath, setRepoPath] = useState<string | null>(null);
  const [tree, setTree] = useState<RepoFileNode[] | null>(null);
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
      setBrowserOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장소를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-16 py-16">
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
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <FileTree nodes={tree} />
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
