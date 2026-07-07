"use client";

import { useState } from "react";

interface CreateBranchModalProps {
  onCreate: (name: string) => void;
  onClose: () => void;
}

export function CreateBranchModal({ onCreate, onClose }: CreateBranchModalProps) {
  const [name, setName] = useState("");

  const canSubmit = name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex w-96 flex-col overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-2 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            브랜치 생성
          </h2>
          <button
            onClick={onClose}
            className="rounded px-2 py-0.5 text-sm text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            새 브랜치 이름
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit) onCreate(name.trim());
            }}
            placeholder="feature/my-branch"
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          />
          <p className="mt-1 text-xs text-neutral-500">
            현재 브랜치에서 새 브랜치를 만들고 바로 전환합니다.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <button
            disabled={!canSubmit}
            onClick={() => onCreate(name.trim())}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            생성
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
