"use client";

import { useState } from "react";

interface CommitModalProps {
  onCommit: (title: string, message: string) => void;
  onClose: () => void;
}

export function CommitModal({ onCommit, onClose }: CommitModalProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const canSubmit = title.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex w-[32rem] flex-col overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-2 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            커밋
          </h2>
          <button
            onClick={onClose}
            className="rounded px-2 py-0.5 text-sm text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              제목
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="커밋 제목"
              className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              메시지 (선택)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="자세한 설명"
              className="w-full resize-none rounded border border-neutral-300 px-2 py-1.5 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <button
            disabled={!canSubmit}
            onClick={() => onCommit(title.trim(), message.trim())}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            커밋
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
