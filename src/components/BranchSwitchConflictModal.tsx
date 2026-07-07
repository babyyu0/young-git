"use client";

interface BranchSwitchConflictModalProps {
  branch: string;
  changedFiles: string[];
  onStash: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function BranchSwitchConflictModal({
  branch,
  changedFiles,
  onStash,
  onDiscard,
  onCancel,
}: BranchSwitchConflictModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex w-[28rem] flex-col overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-neutral-900">
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            변경사항이 있습니다
          </h2>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            <span className="font-medium">{branch}</span> 브랜치로 전환하려면
            다음 변경사항을 먼저 처리해야 합니다.
          </p>
          <ul className="max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-neutral-800 dark:text-neutral-200">
            {changedFiles.map((file) => (
              <li key={file}>{file}</li>
            ))}
          </ul>
          <p className="text-xs text-neutral-500">
            스태시: 변경사항을 임시 보관하고 전환합니다 (나중에 git stash
            pop으로 복원 가능). 버리기: 변경사항을 완전히 삭제하고
            전환합니다(복구 불가).
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <button
            onClick={onStash}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            스태시
          </button>
          <button
            onClick={onDiscard}
            className="rounded bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            버리기
          </button>
          <button
            onClick={onCancel}
            className="rounded border border-neutral-300 px-4 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
