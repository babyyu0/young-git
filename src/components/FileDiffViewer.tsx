"use client";

import { useEffect, useRef, useState } from "react";
import ReactDiffViewer from "react-diff-viewer-continued";

interface FileDiffViewerProps {
  repoPath: string;
  filePath: string;
}

interface HeaderLayout {
  totalWidth: number;
  leftWidth: number;
  leftPadding: number;
  rightPadding: number;
}

export function FileDiffViewer({ repoPath, filePath }: FileDiffViewerProps) {
  const [oldContent, setOldContent] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isBinary, setIsBinary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layout, setLayout] = useState<HeaderLayout | null>(null);

  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/repo/file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: repoPath, filePath }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "파일을 읽을 수 없습니다.");
        setOldContent(data.oldContent);
        setNewContent(data.newContent);
        setIsBinary(data.isBinary);
      } catch (e) {
        setError(e instanceof Error ? e.message : "파일을 읽을 수 없습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [repoPath, filePath]);

  // react-diff-viewer-continued의 좌/우 컬럼 폭은 정확히 50:50이 아닐 수 있고
  // 줄번호+마커 폭도 폰트 측정에 따라 동적으로 정해진다. 값을 추정하지 않고
  // 실제로 렌더링된 좌/우 gutter·content 셀의 위치를 측정해서 헤더를 맞춘다.
  useEffect(() => {
    const wrapper = tableWrapperRef.current;
    if (!wrapper) return;

    const measure = () => {
      // 셀 클래스명(-gutter/-content)으로 좌/우를 구분하면, 추가되기만 한
      // 줄(왼쪽이 비어 "empty-line" 클래스가 덧붙는 경우)이나 fold 표시줄과
      // 뒤섞여 인덱스가 밀린다. 대신 실제 줄(tr.line)의 자식 <td>를
      // 고정된 위치(gutter, marker, content 순서)로 읽어 좌/우를 구분한다.
      const row = wrapper.querySelector('tr[class$="-line"]');
      if (!row || row.children.length < 6) return;

      const leftContent = row.children[2];
      const rightGutter = row.children[3];
      const rightContent = row.children[5];

      const wrapperRect = wrapper.getBoundingClientRect();
      if (wrapperRect.width === 0) return;

      const boundary =
        rightGutter.getBoundingClientRect().left - wrapperRect.left;
      const leftContentOffset =
        leftContent.getBoundingClientRect().left - wrapperRect.left;
      const rightContentOffset =
        rightContent.getBoundingClientRect().left - wrapperRect.left;
      // scrollWidth는 스크롤로 가려진 부분까지 포함한 테이블 전체 폭이다.
      // 헤더를 이 폭과 똑같이 맞춰야 가로 스크롤 시 같이 밀려도 어긋나지 않는다.
      const totalWidth = wrapper.scrollWidth;

      const next: HeaderLayout = {
        totalWidth,
        leftWidth: boundary,
        leftPadding: leftContentOffset,
        rightPadding: rightContentOffset - boundary,
      };

      setLayout((prev) =>
        prev &&
        prev.totalWidth === next.totalWidth &&
        prev.leftWidth === next.leftWidth &&
        prev.leftPadding === next.leftPadding &&
        prev.rightPadding === next.rightPadding
          ? prev
          : next,
      );
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(wrapper);
    const mutationObserver = new MutationObserver(measure);
    mutationObserver.observe(wrapper, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style"],
    });

    // 실제 가로 스크롤은 이 wrapper(div)에서 일어난다(라이브러리 내부 컨테이너는
    // infiniteLoading을 쓰지 않는 한 자체 overflow가 없다). 헤더는 별도 DOM이라
    // 스크롤에 맞춰 따로 옮겨줘야 한다.
    const headerScroll = headerScrollRef.current;
    const onScroll = () => {
      if (headerScroll) {
        headerScroll.style.transform = `translateX(-${wrapper.scrollLeft}px)`;
      }
    };
    wrapper.addEventListener("scroll", onScroll);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      wrapper.removeEventListener("scroll", onScroll);
    };
  }, [oldContent, newContent]);

  if (loading) {
    return <p className="p-3 text-sm text-neutral-500">불러오는 중...</p>;
  }
  if (error) {
    return <p className="p-3 text-sm text-red-500">{error}</p>;
  }
  if (isBinary) {
    return (
      <p className="p-3 text-sm text-neutral-500">
        바이너리 파일은 미리 볼 수 없습니다.
      </p>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden text-xs">
      <div className="shrink-0 overflow-hidden border-b border-neutral-200 bg-neutral-50 font-medium text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
        <div ref={headerScrollRef} className="flex" style={{ width: layout?.totalWidth }}>
          <div
            style={{
              width: layout?.leftWidth,
              paddingLeft: layout?.leftPadding ?? 78,
            }}
            className="shrink-0 border-r border-neutral-200 py-2 pr-2 dark:border-neutral-800"
          >
            변경 전
          </div>
          <div
            style={{
              width: layout ? layout.totalWidth - layout.leftWidth : undefined,
              paddingLeft: layout?.rightPadding ?? 78,
            }}
            className="shrink-0 py-2 pr-2"
          >
            변경 후
          </div>
        </div>
      </div>
      <div ref={tableWrapperRef} className="flex-1 overflow-auto">
        <ReactDiffViewer
          oldValue={oldContent}
          newValue={newContent}
          splitView
          disableWorker
          hideSummary
        />
      </div>
    </div>
  );
}
