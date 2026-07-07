"use client";

interface PushConfirmModalProps {
  commitTitles: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function PushConfirmModal({
  commitTitles,
  onConfirm,
  onCancel,
}: PushConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex w-[28rem] flex-col overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-neutral-900">
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            푸시 확인
          </h2>
        </div>

        <div className="flex flex-col gap-3 p-4">
          {commitTitles.length > 0 ? (
            <>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                다음 커밋이 푸시됩니다.
              </p>
              <ul className="max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-neutral-800 dark:text-neutral-200">
                {commitTitles.map((title, index) => (
                  <li key={index}>{title}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-neutral-500">
              업스트림 대비 푸시할 새 커밋이 없습니다.
            </p>
          )}
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            정말 푸시 하시겠습니까?
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <button
            onClick={onConfirm}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            확인
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
