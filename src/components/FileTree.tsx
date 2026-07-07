"use client";

import { useState } from "react";

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

interface TreeNodeProps {
  node: RepoFileNode;
  selectedPath: string | null;
  onFileClick: (filePath: string) => void;
}

function TreeNode({ node, selectedPath, onFileClick }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);

  if (node.type === "file") {
    const isChanged = node.status !== undefined;
    const isSelected = node.path === selectedPath;
    return (
      <button
        onClick={() => onFileClick(node.path)}
        className={`flex w-full items-center gap-1 truncate py-0.5 pl-5 text-left text-sm text-neutral-700 dark:text-neutral-300 ${
          isSelected
            ? "bg-blue-100 dark:bg-blue-900/40"
            : isChanged
              ? "bg-red-100 dark:bg-red-950/40"
              : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
        }`}
      >
        📄 {node.name}
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-1 truncate py-0.5 text-left text-sm font-medium"
      >
        <span className="w-3">{expanded ? "▾" : "▸"}</span>
        📁 {node.name}
      </button>
      {expanded && node.children && (
        <div className="ml-3 border-l border-neutral-200 pl-2 dark:border-neutral-700">
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FileTreeProps {
  nodes: RepoFileNode[];
  selectedPath: string | null;
  onFileClick: (filePath: string) => void;
}

export function FileTree({ nodes, selectedPath, onFileClick }: FileTreeProps) {
  if (nodes.length === 0) {
    return <p className="text-sm text-neutral-500">파일이 없습니다.</p>;
  }

  return (
    <div className="text-sm">
      {nodes.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          selectedPath={selectedPath}
          onFileClick={onFileClick}
        />
      ))}
    </div>
  );
}
