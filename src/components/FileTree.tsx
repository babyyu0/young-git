"use client";

import { useState } from "react";

export interface RepoFileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: RepoFileNode[];
}

function TreeNode({ node }: { node: RepoFileNode }) {
  const [expanded, setExpanded] = useState(true);

  if (node.type === "file") {
    return (
      <div className="truncate py-0.5 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
        📄 {node.name}
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
            <TreeNode key={child.path} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({ nodes }: { nodes: RepoFileNode[] }) {
  if (nodes.length === 0) {
    return <p className="text-sm text-neutral-500">파일이 없습니다.</p>;
  }

  return (
    <div className="text-sm">
      {nodes.map((node) => (
        <TreeNode key={node.path} node={node} />
      ))}
    </div>
  );
}
