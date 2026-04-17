import useModalAnimation from '@/hooks/useModalAnimation';

/**
 * Scanner Signals 용어 설명 모달
 * - 시그널 유형(MR/WS), 각 컬럼(현재가/가격변화율/ML확률/거래량/결과/감지시각) 설명
 */
export default function ScannerSignalsHelpModal({ isOpen, onClose }) {
    const { shouldRender, isAnimatingOut } = useModalAnimation(isOpen, 250);

    if (!shouldRender) return null;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate__animated ${isAnimatingOut ? 'animate__fadeOut' : 'animate__fadeIn'}`}
            style={{ animationDuration: '0.25s' }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                className={`bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate__animated ${isAnimatingOut ? 'animate__zoomOut' : 'animate__zoomIn'}`}
                style={{ animationDuration: '0.25s' }}
            >
                {/* 헤더 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        Scanner Signals 용어 설명
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
                    {/* 시그널 유형 */}
                    <section>
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                            시그널 유형 (Signal Type)
                        </h4>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800">
                                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 shrink-0 mt-0.5">
                                    MR
                                </span>
                                <div className="text-slate-700 dark:text-slate-300">
                                    <div className="font-semibold mb-1">Mean Reversion (평균회귀 전략)</div>
                                    <div className="text-xs text-slate-600 dark:text-slate-400">
                                        최근 N봉 중 M봉 이상 하락 + 하락폭이 지정 범위(예: -0.3% ~ -2%)에 있고
                                        호가 매수세(bid/ask)가 충분할 때 발생. <strong>과매도 후 반등</strong>을 노리는 전략.
                                        분봉 스캐너가 주기적으로 실행합니다.
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 shrink-0 mt-0.5">
                                    WS
                                </span>
                                <div className="text-slate-700 dark:text-slate-300">
                                    <div className="font-semibold mb-1">WebSocket Momentum (실시간 모멘텀)</div>
                                    <div className="text-xs text-slate-600 dark:text-slate-400">
                                        업비트 <strong>WebSocket 실시간 체결</strong>을 분석하여, 최근 N초 동안
                                        매수 체결 비율이 임계치(예: 80%) 이상 + 거래량이 평균 대비 급증(예: 3배) +
                                        가격이 상승 중일 때 즉시 매수 시그널 발생. 단기 상승 진입 포착.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 컬럼 설명 */}
                    <section>
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                            컬럼 설명
                        </h4>
                        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-100 dark:bg-slate-700">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300 w-24">컬럼</th>
                                        <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">의미</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                                    <tr>
                                        <td className="px-3 py-2 align-top font-semibold text-slate-700 dark:text-slate-300">종목</td>
                                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                                            업비트 마켓 코드(예: <code className="px-1 bg-slate-100 dark:bg-slate-700 rounded">BTC</code> — 원본은 <code className="px-1 bg-slate-100 dark:bg-slate-700 rounded">KRW-BTC</code>)
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-2 align-top font-semibold text-slate-700 dark:text-slate-300">유형</td>
                                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                                            시그널 발생 전략 — <strong>MR</strong>(평균회귀) 또는 <strong>WS</strong>(실시간 모멘텀)
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-2 align-top font-semibold text-slate-700 dark:text-slate-300">현재가</td>
                                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                                            시그널 감지 순간의 체결가 (KRW 단위)
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-2 align-top font-semibold text-slate-700 dark:text-slate-300">가격변화율</td>
                                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                                            시그널 관찰 구간 내 가격 변화율(%).
                                            <br/>
                                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 text-[10px]">MR</span>
                                            {' '}최근 N분봉 동안의 누적 변화율 (주로 <span className="text-orange-600 dark:text-orange-400 font-medium">음수</span> = 과매도 진입).
                                            <br/>
                                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-[10px]">WS</span>
                                            {' '}최근 N초 윈도우 내 변화율 (주로 <span className="text-blue-600 dark:text-blue-400 font-medium">양수</span> = 상승 진행 중).
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-2 align-top font-semibold text-slate-700 dark:text-slate-300">ML 확률</td>
                                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                                            LightGBM 예측 모델이 판단한 <strong>상승 확률</strong> (0~100%).
                                            임계값(예: 60%) 미만은 매수에서 제외됩니다.
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-2 align-top font-semibold text-slate-700 dark:text-slate-300">거래량</td>
                                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                                            <strong>WS 전용</strong> — 최근 N초 체결량이 해당 종목의 1분 평균 대비 몇 배인지(배수).
                                            예: <code className="px-1 bg-slate-100 dark:bg-slate-700 rounded">3.2x</code> = 평균의 3.2배.
                                            MR은 거래량 비교를 사용하지 않아 <code className="px-1 bg-slate-100 dark:bg-slate-700 rounded">-</code>로 표시됩니다.
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-2 align-top font-semibold text-slate-700 dark:text-slate-300">결과</td>
                                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                                            시그널 후속 처리 결과.
                                            <ul className="mt-1 space-y-0.5 ml-4 list-disc">
                                                <li><strong>매수체결</strong>: 실제 매수 주문 체결</li>
                                                <li><strong>모의매수</strong>: Paper 모드 가상 매수</li>
                                                <li><strong>스킵됨</strong>: 보유중/쿨다운/슬롯부족/ML 미달 등 사유로 진입하지 않음</li>
                                            </ul>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-2 align-top font-semibold text-slate-700 dark:text-slate-300">감지시각</td>
                                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                                            시그널이 감지된 시각 (HH:MM:SS, 24시간제)
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* 필터 */}
                    <section>
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                            상단 필터
                        </h4>
                        <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400 ml-4 list-disc">
                            <li><strong>전체 / MR / WS</strong> — 시그널 유형으로 필터링</li>
                            <li><strong>전체 / 매수체결 / 스킵됨</strong> — 처리 결과로 필터링</li>
                        </ul>
                    </section>

                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        * 실제 임계값(N초, 매수비율, 거래량 배수 등)은 설정 페이지의 값에 따라 달라집니다.
                    </p>
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
