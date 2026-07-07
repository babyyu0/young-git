"use client";

import { useEffect, useState } from "react";
import { BadgeLegend } from "@/components/BadgeLegend";
import { BranchSelect } from "@/components/BranchSelect";
import { BranchSwitchConflictModal } from "@/components/BranchSwitchConflictModal";
import { CommitModal } from "@/components/CommitModal";
import { CreateBranchModal } from "@/components/CreateBranchModal";
import { FileDiffViewer } from "@/components/FileDiffViewer";
import {
  collectCheckablePaths,
  FileTree,
  type RepoFileNode,
} from "@/components/FileTree";
import { FolderBrowserModal } from "@/components/FolderBrowserModal";
import { PushConfirmModal } from "@/components/PushConfirmModal";

const LAST_REPO_PATH_KEY = "young-git:last-repo-path";

export default function Home() {
  const [isBrowserOpen, setBrowserOpen] = useState(false);
  const [repoPath, setRepoPath] = useState<string | null>(null);
  const [tree, setTree] = useState<RepoFileNode[] | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(
    null,
  );
  const [checkedPaths, setCheckedPaths] = useState<Set<string>>(new Set());
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [isCommitModalOpen, setCommitModalOpen] = useState(false);
  const [isCreateBranchModalOpen, setCreateBranchModalOpen] = useState(false);
  const [isPushConfirmOpen, setPushConfirmOpen] = useState(false);
  const [unpushedCommitTitles, setUnpushedCommitTitles] = useState<string[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [branchSwitchConflict, setBranchSwitchConflict] = useState<{
    branch: string;
    changedFiles: string[];
  } | null>(null);

  const handleSelect = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "저장소를 불러올 수 없습니다.");
      setRepoPath(data.path);
      setTree(data.tree);
      setCurrentBranch(data.current);
      setBranches(data.branches);
      setSelectedFilePath(null);
      setCheckedPaths(new Set());
      setBrowserOpen(false);
      localStorage.setItem(LAST_REPO_PATH_KEY, data.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장소를 불러올 수 없습니다.");
      localStorage.removeItem(LAST_REPO_PATH_KEY);
    } finally {
      setLoading(false);
    }
  };

  // 새로고침해도 마지막으로 연 저장소를 자동으로 다시 불러온다.
  useEffect(() => {
    (async () => {
      const lastPath = localStorage.getItem(LAST_REPO_PATH_KEY);
      if (lastPath) await handleSelect(lastPath);
    })();
  }, []);

  const handleToggleCheck = (filePath: string, checked: boolean) => {
    setCheckedPaths((prev) => {
      const next = new Set(prev);
      if (checked) next.add(filePath);
      else next.delete(filePath);
      return next;
    });
  };

  const checkablePaths = tree ? collectCheckablePaths(tree) : [];
  const allChecked =
    checkablePaths.length > 0 && checkedPaths.size === checkablePaths.length;

  const handleToggleCheckAll = (checked: boolean) => {
    setCheckedPaths(checked ? new Set(checkablePaths) : new Set());
  };

  const handleBatchStage = async (staged: boolean) => {
    if (!repoPath || checkedPaths.size === 0) return;
    setError(null);
    try {
      const res = await fetch("/api/repo/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: repoPath,
          filePaths: Array.from(checkedPaths),
          staged,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "작업을 수행할 수 없습니다.");
      setTree(data.tree);
      setCheckedPaths(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "작업을 수행할 수 없습니다.");
    }
  };

  const handleCommit = async (title: string, message: string) => {
    if (!repoPath) return;
    setError(null);
    try {
      const res = await fetch("/api/repo/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: repoPath, title, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "커밋할 수 없습니다.");
      setTree(data.tree);
      setCommitModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "커밋할 수 없습니다.");
    }
  };

  const handleCheckoutBranch = async (
    branch: string,
    mode?: "stash" | "discard",
  ) => {
    if (!repoPath) return;
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/repo/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: repoPath, branch, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "브랜치를 전환할 수 없습니다.");

      if (data.status === "needs-decision") {
        setBranchSwitchConflict({ branch, changedFiles: data.changedFiles });
        return;
      }

      setBranchSwitchConflict(null);
      setTree(data.tree);
      setCurrentBranch(data.current);
      setBranches(data.branches);
      setSelectedFilePath(null);
      setCheckedPaths(new Set());
      if (data.stashed) {
        setNotice(
          "변경사항을 stash하고 브랜치를 전환했습니다. git stash pop으로 복원할 수 있습니다.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "브랜치를 전환할 수 없습니다.");
    }
  };

  const handleCreateBranch = async (name: string) => {
    if (!repoPath) return;
    setError(null);
    try {
      const res = await fetch("/api/repo/branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: repoPath, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "브랜치를 만들 수 없습니다.");
      setTree(data.tree);
      setCurrentBranch(data.current);
      setBranches(data.branches);
      setSelectedFilePath(null);
      setCheckedPaths(new Set());
      setCreateBranchModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "브랜치를 만들 수 없습니다.");
    }
  };

  const handleOpenPushConfirm = async () => {
    if (!repoPath) return;
    setError(null);
    try {
      const res = await fetch("/api/repo/unpushed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: repoPath }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error ?? "커밋 목록을 불러올 수 없습니다.");
      setUnpushedCommitTitles(data.commitTitles);
      setPushConfirmOpen(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "커밋 목록을 불러올 수 없습니다.",
      );
    }
  };

  const handleConfirmPush = async () => {
    if (!repoPath) return;
    setError(null);
    try {
      const res = await fetch("/api/repo/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: repoPath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "푸시할 수 없습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "푸시할 수 없습니다.");
    } finally {
      setPushConfirmOpen(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-8 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
            young-git
          </h1>
          <button
            onClick={() => setBrowserOpen(true)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            저장소 열기
          </button>
        </div>

        {repoPath && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm text-zinc-500">{repoPath}</p>
              {currentBranch && (
                <BranchSelect
                  current={currentBranch}
                  branches={branches}
                  onChange={handleCheckoutBranch}
                  onCreateBranchRequest={() => setCreateBranchModalOpen(true)}
                />
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => setCommitModalOpen(true)}
                className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                커밋하기
              </button>
              <button
                onClick={handleOpenPushConfirm}
                className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                푸쉬하기
              </button>
            </div>
          </div>
        )}
        {loading && <p className="text-sm text-zinc-500">불러오는 중...</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {notice && <p className="text-sm text-blue-600">{notice}</p>}

        {tree && (
          <div className="flex min-h-0 flex-1 gap-4">
            <div className="flex w-64 shrink-0 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 p-2 dark:border-zinc-800">
                <input
                  type="checkbox"
                  title="전체선택"
                  disabled={checkablePaths.length === 0}
                  checked={allChecked}
                  onChange={(e) => handleToggleCheckAll(e.target.checked)}
                  className="shrink-0"
                />
                <button
                  disabled={checkedPaths.size === 0}
                  onClick={() => handleBatchStage(true)}
                  className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-40"
                >
                  Add{checkedPaths.size > 0 ? ` (${checkedPaths.size})` : ""}
                </button>
                <button
                  disabled={checkedPaths.size === 0}
                  onClick={() => handleBatchStage(false)}
                  className="rounded border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Reset
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                <FileTree
                  nodes={tree}
                  selectedPath={selectedFilePath}
                  checkedPaths={checkedPaths}
                  onFileClick={setSelectedFilePath}
                  onToggleCheck={handleToggleCheck}
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              {selectedFilePath && repoPath ? (
                <FileDiffViewer
                  key={selectedFilePath}
                  repoPath={repoPath}
                  filePath={selectedFilePath}
                />
              ) : (
                <p className="p-3 text-sm text-zinc-500">
                  왼쪽에서 파일을 선택하세요.
                </p>
              )}
            </div>
          </div>
        )}

        {!tree && !loading && (
          <p className="text-sm text-zinc-500">
            &quot;저장소 열기&quot; 버튼을 눌러 로컬 git 저장소 폴더를
            선택하세요.
          </p>
        )}

        {tree && <BadgeLegend />}
      </main>

      {isBrowserOpen && (
        <FolderBrowserModal
          onSelect={handleSelect}
          onClose={() => setBrowserOpen(false)}
        />
      )}

      {isCommitModalOpen && (
        <CommitModal
          onCommit={handleCommit}
          onClose={() => setCommitModalOpen(false)}
        />
      )}

      {isPushConfirmOpen && (
        <PushConfirmModal
          commitTitles={unpushedCommitTitles}
          onConfirm={handleConfirmPush}
          onCancel={() => setPushConfirmOpen(false)}
        />
      )}

      {isCreateBranchModalOpen && (
        <CreateBranchModal
          onCreate={handleCreateBranch}
          onClose={() => setCreateBranchModalOpen(false)}
        />
      )}

      {branchSwitchConflict && (
        <BranchSwitchConflictModal
          branch={branchSwitchConflict.branch}
          changedFiles={branchSwitchConflict.changedFiles}
          onStash={() =>
            handleCheckoutBranch(branchSwitchConflict.branch, "stash")
          }
          onDiscard={() =>
            handleCheckoutBranch(branchSwitchConflict.branch, "discard")
          }
          onCancel={() => setBranchSwitchConflict(null)}
        />
      )}
    </div>
  );
}
