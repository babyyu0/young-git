"use client";

const CREATE_BRANCH_VALUE = "__create_branch__";

interface BranchSelectProps {
  current: string;
  branches: string[];
  onChange: (branch: string) => void;
  onCreateBranchRequest: () => void;
}

export function BranchSelect({
  current,
  branches,
  onChange,
  onCreateBranchRequest,
}: BranchSelectProps) {
  return (
    <select
      value={current}
      onChange={(e) => {
        if (e.target.value === CREATE_BRANCH_VALUE) {
          onCreateBranchRequest();
          return;
        }
        onChange(e.target.value);
      }}
      className="shrink-0 rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
    >
      {branches.map((branch) => (
        <option key={branch} value={branch}>
          {branch}
        </option>
      ))}
      <option disabled>──────────</option>
      <option value={CREATE_BRANCH_VALUE}>+ 브랜치 생성하기</option>
    </select>
  );
}
