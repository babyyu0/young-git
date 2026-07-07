"use client";

import { useState } from "react";

interface DirectoryEntry {
  name: string;
  path: string;
}

interface FolderTreeItemProps {
  node: DirectoryEntry;
  depth: number;
  selectedPath: string | null;
  onSelectPath: (path: string) => void;
}

export function FolderTreeItem({
  node,
  depth,
  selectedPath,
  onSelectPath,
}: FolderTreeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<DirectoryEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChildren = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fs?path=${encodeURIComponent(node.path)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "폴더를 읽을 수 없습니다.");
      setChildren(data.entries);
    } catch (e) {
      setError(e instanceof Error ? e.message : "폴더를 읽을 수 없습니다.");
      setChildren([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && children === null) {
      void loadChildren();
    }
  };

  const isSelected = selectedPath === node.path;
  const indent = depth * 16 + 4;

  return (
    <div>
      <div
        onClick={() => onSelectPath(node.path)}
        style={{ paddingLeft: indent }}
        className={`flex cursor-pointer items-center gap-1 truncate py-1 pr-2 text-sm ${
          isSelected
            ? "bg-blue-100 dark:bg-blue-900/40"
            : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand();
          }}
          className="w-4 shrink-0 text-center text-neutral-400"
        >
          {expanded ? "▾" : "▸"}
        </button>
        <span>📁</span>
        <span className="truncate">{node.name}</span>
      </div>

      {expanded && (
        <div>
          {loading && (
            <p
              style={{ paddingLeft: indent + 20 }}
              className="py-1 text-xs text-neutral-400"
            >
              불러오는 중...
            </p>
          )}
          {error && (
            <p
              style={{ paddingLeft: indent + 20 }}
              className="py-1 text-xs text-red-500"
            >
              {error}
            </p>
          )}
          {!loading && !error && children?.length === 0 && (
            <p
              style={{ paddingLeft: indent + 20 }}
              className="py-1 text-xs text-neutral-400"
            >
              하위 폴더 없음
            </p>
          )}
          {!loading &&
            !error &&
            children?.map((child) => (
              <FolderTreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelectPath={onSelectPath}
              />
            ))}
        </div>
      )}
    </div>
  );
}
