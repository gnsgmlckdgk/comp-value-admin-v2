import useModalAnimation from '@/hooks/useModalAnimation';

/**
 * 거래 필터 도움말 모달
 * - 유형(BUY/SELL) 및 사유(reason) 필터 입력값 안내
 * - CointradeHistory, CointradeDashboard 공용
 */
export default function TradeFilterHelpModal({ isOpen, onClose }) {
    const { shouldRender, isAnimatingOut } = useModalAnimation(isOpen, 250);

    if (!shouldRender) return null;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate__animated ${isAnimatingOut ? 'animate__fadeOut' : 'animate__fadeIn'}`}
            style={{ animationDuration: '0.25s' }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate__animated ${isAnimatingOut ? 'animate__zoomOut' : 'animate__zoomIn'}`} style={{ animationDuration: '0.25s' }}>
                {/* 헤더 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        필터 도움말
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* 콘텐츠 */}
                <div className="p-6 space-y-6">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        테이블 컬럼 필터에서 <strong>표시되는 값</strong> 또는 <strong>원본 값</strong> 모두 사용할 수 있습니다.
                    </p>

                    {/* 유형 필터 */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                            유형 (tradeType)
                        </h4>
                        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100 dark:bg-slate-700">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">입력값</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">매칭 데이터</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    <tr className="bg-white dark:bg-slate-800">
                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">매수</td>
                                        <td className="px-4 py-2">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">BUY</span>
                                        </td>
                                    </tr>
                                    <tr className="bg-white dark:bg-slate-800">
                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">매도</td>
                                        <td className="px-4 py-2">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">SELL</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 사유 필터 */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                            사유 (reason)
                        </h4>
                        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100 dark:bg-slate-700">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">입력값</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">매칭 데이터</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    <tr className="bg-white dark:bg-slate-800">
                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">모멘텀 진입</td>
                                        <td className="px-4 py-2">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">MOMENTUM_SIGNAL</span>
                                        </td>
                                    </tr>
                                    <tr className="bg-white dark:bg-slate-800">
                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">익절</td>
                                        <td className="px-4 py-2">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">TAKE_PROFIT</span>
                                        </td>
                                    </tr>
                                    <tr className="bg-white dark:bg-slate-800">
                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">손절</td>
                                        <td className="px-4 py-2">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">STOP_LOSS</span>
                                        </td>
                                    </tr>
                                    <tr className="bg-white dark:bg-slate-800">
                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">트레일링스탑</td>
                                        <td className="px-4 py-2">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300">TRAILING_STOP</span>
                                        </td>
                                    </tr>
                                    <tr className="bg-white dark:bg-slate-800">
                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">수동매도</td>
                                        <td className="px-4 py-2">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">MANUAL</span>
                                        </td>
                                    </tr>
                                    <tr className="bg-white dark:bg-slate-800">
                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">수동정리</td>
                                        <td className="px-4 py-2">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">MANUAL_CLEANUP</span>
                                        </td>
                                    </tr>
                                    <tr className="bg-white dark:bg-slate-800">
                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">잔고정리</td>
                                        <td className="px-4 py-2">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-200 dark:bg-slate-600/30 text-slate-700 dark:text-slate-300">CLEANUP_NO_BALANCE</span>
                                        </td>
                                    </tr>
                                    <tr className="bg-white dark:bg-slate-800">
                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">강제청산</td>
                                        <td className="px-4 py-2">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">MAX_HOLD_EXPIRED</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                        * 원본 값(BUY, SELL, MOMENTUM_SIGNAL 등)으로 입력해도 필터링됩니다.<br/>
                        * 과거 데이터에 SIGNAL, MAX_HOLDING_EXPIRED 등 레거시 값이 남아있을 수 있으며, 해당 값으로도 필터링됩니다.
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
