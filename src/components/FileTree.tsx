"use client";

import { useState } from "react";

export interface FileGitState {
  staged: boolean;
}

export interface RepoFileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  status?: FileGitState;
  children?: RepoFileNode[];
}

function StatusBadge({ state }: { state: FileGitState }) {
  return (
    <span
      title={state.staged ? "스테이징됨" : "스테이징 안 됨"}
      className={`shrink-0 text-xs leading-none ${
        state.staged
          ? "text-green-600 dark:text-green-400"
          : "text-neutral-400 dark:text-neutral-600"
      }`}
    >
      {state.staged ? "●" : "○"}
    </span>
  );
}

interface TreeNodeProps {
  node: RepoFileNode;
  selectedPath: string | null;
  checkedPaths: Set<string>;
  onFileClick: (filePath: string) => void;
  onToggleCheck: (filePath: string, checked: boolean) => void;
}

function TreeNode({
  node,
  selectedPath,
  checkedPaths,
  onFileClick,
  onToggleCheck,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);

  if (node.type === "file") {
    const status = node.status;
    const isSelected = node.path === selectedPath;
    return (
      <div
        className={`flex items-center gap-1 py-0.5 pr-2 pl-5 text-sm text-neutral-700 dark:text-neutral-300 ${
          isSelected
            ? "bg-blue-100 dark:bg-blue-900/40"
            : status
              ? "bg-red-100 dark:bg-red-950/40"
              : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
        }`}
      >
        {status && (
          <input
            type="checkbox"
            checked={checkedPaths.has(node.path)}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onToggleCheck(node.path, e.target.checked)}
            className="shrink-0"
          />
        )}
        <button
          onClick={() => onFileClick(node.path)}
          className="flex flex-1 items-center gap-1 truncate text-left"
        >
          📄 {node.name}
        </button>
        {status && <StatusBadge state={status} />}
      </div>
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
              checkedPaths={checkedPaths}
              onFileClick={onFileClick}
              onToggleCheck={onToggleCheck}
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
  checkedPaths: Set<string>;
  onFileClick: (filePath: string) => void;
  onToggleCheck: (filePath: string, checked: boolean) => void;
}

export function FileTree({
  nodes,
  selectedPath,
  checkedPaths,
  onFileClick,
  onToggleCheck,
}: FileTreeProps) {
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
          checkedPaths={checkedPaths}
          onFileClick={onFileClick}
          onToggleCheck={onToggleCheck}
        />
      ))}
    </div>
  );
}

/** 트리에서 체크박스가 붙는(=변경된) 파일 경로를 모두 모은다. "전체선택"에 쓰인다. */
export function collectCheckablePaths(nodes: RepoFileNode[]): string[] {
  const paths: string[] = [];
  const walk = (list: RepoFileNode[]) => {
    for (const node of list) {
      if (node.type === "file" && node.status) paths.push(node.path);
      if (node.children) walk(node.children);
    }
  };
  walk(nodes);
  return paths;
}
