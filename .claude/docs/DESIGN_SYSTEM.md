# CompValue 디자인 시스템

## 디자인 방향
- **미니멀리즘**: 불필요한 장식 요소 제거, 여백 넉넉하게, 콘텐츠에 집중
- **부드러운 인터랙션**: hover/클릭/페이지 전환에 자연스러운 애니메이션
- **사용감 우선**: 직관적인 피드백, 명확한 상태 변화, 로딩/에러 상태 처리

## 색상
- Primary: sky-500 / indigo-500
- Background/Text/Border: slate 계열
- 다크모드: 모든 컴포넌트에 `dark:` variant 필수
- **접근성**: 적록색약 고려 — 빨강↔초록 대비 금지, 파랑↔노랑↔주황 사용

## 타이포그래피
- 폰트: BinggraeMelona.otf (14px 기본)

## 애니메이션
- 페이지 전환: fade-in (200~300ms)
- hover: scale/opacity 트랜지션 (150ms)
- 모달/드롭다운: slide-up + fade (200ms)
- easing: ease-out 기본
- **과도한 애니메이션 금지, 목적 있는 모션만 사용**

## 반응형
- sm(640) / md(768) / lg(1024) / xl(1280)

## 컴포넌트 스타일 원칙
- 둥근 모서리 최소화 (rounded-md 이하)
- 그림자 절제 (shadow-sm 정도)
- border는 얇고 연하게 (border-slate-200 / dark:border-slate-700)
- 여백은 넉넉하게 (p-4 이상, gap-4 이상)