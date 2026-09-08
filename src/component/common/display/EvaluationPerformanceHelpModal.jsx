import useModalAnimation from '@/hooks/useModalAnimation';

/**
 * 성과 추적 페이지 설명 모달
 * - 수익률 계산 방식(스냅샷 간 가격 비교), 집계 기준, 해석 방법, 한계 설명
 */
export default function EvaluationPerformanceHelpModal({ isOpen, onClose }) {
    const { shouldRender, isAnimatingOut } = useModalAnimation(isOpen, 250);

    if (!shouldRender) return null;

    return (
        <div
            className={`fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm p-4 animate__animated ${isAnimatingOut ? 'animate__fadeOut' : 'animate__fadeIn'}`}
            style={{ animationDuration: '0.25s' }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                className={`bg-white dark:bg-slate-800 rounded-2xl shadow-xl ring-1 ring-slate-900/5 dark:ring-slate-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto animate__animated ${isAnimatingOut ? 'animate__zoomOut' : 'animate__zoomIn'}`}
                style={{ animationDuration: '0.25s' }}
            >
                {/* 헤더 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        성과 추적 — 페이지 설명
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                        aria-label="닫기"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* 콘텐츠 */}
                <div className="p-6 space-y-6 text-sm">
                    {/* 한 줄 요약 */}
                    <section className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-100 mb-1">이 페이지는?</div>
                        <div className="text-slate-700 dark:text-slate-300">
                            <strong>"오늘의 매수후보"의 판정이 실제로 맞았는지 사후 검증</strong>하는 화면입니다.
                            과거 특정 날짜(기준일)에 내려진 투자판정·가치등급별로, 그 이후 주가가 실제로 어떻게 움직였는지 집계합니다.
                            개별 종목 수익이 아니라 <strong>판정 로직 자체의 신뢰도</strong>를 보는 용도입니다.
                        </div>
                    </section>

                    {/* 계산 방식 */}
                    <section>
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">수익률 계산 방식</h4>
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 mb-3">
                            <code className="text-xs text-slate-800 dark:text-slate-200">
                                수익률(%) = (최신 스냅샷의 주가 − 기준일 스냅샷의 주가) ÷ 기준일 스냅샷의 주가 × 100
                            </code>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                            <li><strong>기준일</strong>: 내가 선택한 날짜의 평가 스냅샷 (기본값은 7일 전)</li>
                            <li><strong>비교 시점</strong>: 항상 <strong>가장 최근 평가일</strong>. 즉 "기준일 → 오늘까지"의 성과입니다</li>
                            <li>가격은 야간 평가가 이미 저장해 둔 값을 그대로 사용합니다 — <strong>조회 시 외부 시세 API를 다시 호출하지 않습니다</strong> (그래서 빠르고 FMP 호출량도 늘지 않음)</li>
                            <li>기준일 또는 최신일 스냅샷에 가격이 없거나 기준가가 0 이하인 종목은 집계에서 제외됩니다</li>
                        </ul>
                    </section>

                    {/* 컬럼 설명 */}
                    <section>
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">컬럼 설명</h4>
                        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                            <table className="min-w-full text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-900/40">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">컬럼</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">설명</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    <tr className="bg-white dark:bg-slate-800">
                                        <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">그룹</td>
                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                                            기준일의 투자판정(매수 후보/관심목록/관망) 또는 가치등급(S~F). 값이 없던 종목은 "(미분류)"
                                        </td>
                                    </tr>
                                    <tr className="bg-white dark:bg-slate-800">
                                        <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">종목수</td>
                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">해당 그룹에서 실제로 수익률이 계산된 종목 수 (표본 크기)</td>
                                    </tr>
                                    <tr className="bg-white dark:bg-slate-800">
                                        <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">평균수익률</td>
                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                                            그룹 내 종목 수익률의 <strong>단순 평균</strong> (금액 가중 아님 — 동일 비중으로 샀다고 가정)
                                        </td>
                                    </tr>
                                    <tr className="bg-white dark:bg-slate-800">
                                        <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">승률</td>
                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">수익률이 <strong>0%보다 큰</strong> 종목의 비율 (0%는 승으로 치지 않음)</td>
                                    </tr>
                                    <tr className="bg-white dark:bg-slate-800">
                                        <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">최고 / 최저</td>
                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">그룹 내 개별 종목의 최대·최소 수익률 (편차 확인용)</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            색상은 색각이상 친화 팔레트를 사용합니다 — <span className="text-blue-600 dark:text-blue-400 font-semibold">파랑 = 플러스</span>,
                            <span className="text-orange-600 dark:text-orange-400 font-semibold"> 주황 = 마이너스</span>.
                        </p>
                    </section>

                    {/* 해석 방법 */}
                    <section>
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">어떻게 읽나</h4>
                        <div className="space-y-2">
                            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                                <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">판정 로직이 잘 작동하는 경우</div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">
                                    <strong>매수 후보 &gt; 관심목록 &gt; 관망</strong> 순으로 평균수익률·승률이 높게 나오고,
                                    가치등급도 <strong>S/A가 D/F보다</strong> 높게 나옵니다. 순서가 이렇게 유지되면 선별 기준이 유효하다는 신호입니다.
                                </div>
                            </div>
                            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                                <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">순서가 뒤집힌 경우</div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">
                                    관망이 매수 후보보다 잘 나온다면 평가 기준(가치등급 임계값, 타이밍 판정)을 재검토할 신호입니다.
                                    다만 <strong>기간이 짧거나 표본이 적으면 우연</strong>일 수 있으니 여러 기준일로 반복 확인하세요.
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 한계 */}
                    <section className="rounded-lg bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 p-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 mb-2">이 수치의 한계 (꼭 알고 볼 것)</div>
                        <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400">
                            <li>
                                <strong>양쪽 스냅샷에 모두 있는 종목만</strong> 집계됩니다. 기준일 이후 추천 목록에서 빠진 종목은 통째로 사라지므로
                                <strong> 생존 편향</strong>이 생길 수 있습니다.
                            </li>
                            <li><strong>배당·액면분할·합병은 반영되지 않습니다</strong>. 단순 주가 비교라 분할 종목은 큰 마이너스로 왜곡될 수 있습니다.</li>
                            <li>실제 매매(체결가·수수료·세금)가 아닌 <strong>평가 시점 종가 기준</strong>입니다.</li>
                            <li>기준일에 스냅샷이 없거나 기준일이 최신일과 같으면 경과 기간이 0이라 빈 결과 + 안내 문구가 표시됩니다.</li>
                            <li>며칠 수준의 짧은 구간은 노이즈가 큽니다. 최소 수 주 이상 데이터가 쌓인 뒤 보는 것을 권장합니다.</li>
                        </ul>
                    </section>
                </div>

                {/* 푸터 */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
}
