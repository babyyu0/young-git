# Git GUI Web

로컬 Git 저장소를 브라우저에서 다루는 웹 기반 Git GUI. 로컬 단일 사용자 사용을 목표로 하며, 서버와 클라이언트가 같은 머신에서 동작하는 것을 전제로 설계했다.

## 기술 스택

### Next.js (App Router) — 풀스택 프레임워크

로컬 단일 사용자 도구라서 인증/멀티테넌시를 고려할 필요가 없고, 서버(파일시스템·git 접근)와 클라이언트(UI)가 항상 같은 머신 위에서 함께 실행된다. 이런 경우 백엔드/프론트엔드를 별도 프로젝트로 분리하면 배포·개발 환경만 복잡해질 뿐 얻는 이득이 없으므로, 하나의 Next.js 앱에서 Route Handler/Server Action으로 API까지 처리하는 풀스택 구조를 선택했다.

### simple-git — Git 조작 라이브러리

로컬에 설치된 git CLI를 감싸는 Node 라이브러리로, log/diff/status/branch/stage/commit/stash/rebase 등 대부분의 git 기능을 안정적으로 지원한다. 순수 JS 구현체인 `isomorphic-git`도 검토했지만, 로컬 환경에서는 어차피 git CLI가 이미 설치되어 있으므로 기능 커버리지와 실제 git 동작과의 일치성이 더 중요하다고 판단해 `simple-git`을 선택했다. 저장소 경로는 화이트리스트로 제한하고, 항상 라이브러리의 API 메서드를 사용해 커맨드 인젝션을 방지한다.

### Tailwind CSS + shadcn/ui — UI 스타일링/컴포넌트

Tailwind는 create-next-app 기본 옵션으로 바로 사용 가능하고, shadcn/ui는 컴포넌트 코드를 프로젝트에 직접 복사해오는 방식이라 diff 뷰, 커밋 그래프처럼 커스터마이징이 잦은 화면에 맞게 자유롭게 수정하기 좋다.

> shadcn/ui CLI 초기화(`npx shadcn@latest init`)는 개발 환경의 네트워크 인증서 문제로 이번 초기 세팅에서는 보류했다. 정상 네트워크에서 한 번 실행해 붙이면 된다.

### react-diff-viewer-continued — Diff 뷰어

커밋/스테이징 변경사항을 line-by-line 또는 side-by-side로 보여주는 React 컴포넌트. React 트리에 그대로 끼워 넣을 수 있어 DOM을 직접 다뤄야 하는 `diff2html`보다 Next.js 컴포넌트 구조에 자연스럽게 맞는다.

### 커밋 그래프

적당한 기성 라이브러리가 없어서, 커밋 리스트 데이터를 기반으로 SVG/Canvas로 부모-자식 연결선을 직접 그리는 방식을 채택할 예정이다 (VS Code Git Graph 확장 방식 참고).

## Getting Started

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인.
