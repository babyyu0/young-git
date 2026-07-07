"use client";

import { useEffect, useState } from "react";
import { FolderTreeItem } from "@/components/FolderTreeItem";

interface DirectoryEntry {
  name: string;
  path: string;
}

interface FolderBrowserModalProps {
  onSelect: (path: string) => void;
  onClose: () => void;
}

export function FolderBrowserModal({
  onSelect,
  onClose,
}: FolderBrowserModalProps) {
  const [roots, setRoots] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pathInput, setPathInput] = useState("");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/fs");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "폴더를 읽을 수 없습니다.");
        setRoots(data.entries);
      } catch (e) {
        setError(e instanceof Error ? e.message : "폴더를 읽을 수 없습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectPath = (path: string) => setSelectedPath(path);

  const submitPathInput = async () => {
    const trimmed = pathInput.trim();
    if (!trimmed) return;
    setError(null);
    try {
      const res = await fetch(`/api/fs?path=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "폴더를 읽을 수 없습니다.");
      setSelectedPath(data.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "폴더를 읽을 수 없습니다.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex h-[34rem] w-[44rem] flex-col overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-neutral-900">
        {/* 타이틀 바 */}
        <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-2 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            📂 폴더 선택
          </h2>
          <button
            onClick={onClose}
            className="rounded px-2 py-0.5 text-sm text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          >
            ✕
          </button>
        </div>

        {/* 절대경로 입력창 */}
        <div className="flex items-center gap-1 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
          <input
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitPathInput();
            }}
            placeholder="C:\path\to\repo"
            className="flex-1 rounded border border-neutral-300 bg-neutral-50 px-2 py-1 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          />
          <button
            onClick={submitPathInput}
            className="rounded border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            이동
          </button>
        </div>

        {/* 트리 */}
        <div className="flex-1 overflow-y-auto py-1">
          {loading && <p className="p-3 text-sm text-neutral-500">불러오는 중...</p>}
          {error && <p className="p-3 text-sm text-red-500">{error}</p>}
          {!loading &&
            !error &&
            roots.map((root) => (
              <FolderTreeItem
                key={root.path}
                node={root}
                depth={0}
                selectedPath={selectedPath}
                onSelectPath={selectPath}
              />
            ))}
        </div>

        {/* 하단: 선택된 경로 + 선택/취소 */}
        <div className="flex items-center gap-2 border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <input
            readOnly
            value={selectedPath ?? ""}
            placeholder="선택된 폴더 없음"
            className="flex-1 rounded border border-neutral-300 bg-neutral-50 px-2 py-1 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          />
          <button
            disabled={!selectedPath}
            onClick={() => selectedPath && onSelect(selectedPath)}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            선택
          </button>
          <button
            onClick={onClose}
            className="rounded border border-neutral-300 px-4 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
