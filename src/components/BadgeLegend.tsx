export function BadgeLegend() {
  return (
    <div className="border-t border-zinc-200 px-1 py-3 text-xs text-zinc-500 dark:border-zinc-800">
      <span className="mr-4">
        <span className="mr-1 text-green-600 dark:text-green-400">●</span>
        스테이징됨
      </span>
      <span>
        <span className="mr-1 text-neutral-400 dark:text-neutral-600">○</span>
        스테이징 안 됨
      </span>
    </div>
  );
}
