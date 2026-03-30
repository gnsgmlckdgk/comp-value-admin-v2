import { useEffect } from 'react';
import Button from '@/component/common/button/Button';
import useModalAnimation from '@/hooks/useModalAnimation';

export default function SellCriteriaModal({ isOpen, onClose }) {
    // ESC 키로 모달 닫기
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden'; // 스크롤 방지
        }
        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    const { shouldRender, isAnimatingOut } = useModalAnimation(isOpen);

    if (!shouldRender) return null;

    // 배경 클릭 시 닫기
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate__animated ${isAnimatingOut ? 'animate__fadeOut' : 'animate__fadeIn'}`}
            style={{ animationDuration: '0.25s' }}
            onClick={handleBackdropClick}
        >
            <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg md:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col animate__animated ${isAnimatingOut ? 'animate__fadeOutDown' : 'animate__fadeInUp'}`} style={{ animationDuration: '0.25s' }}>
                {/* 헤더 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        매도 기준 상세 (모멘텀 스캘핑)
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
                <div className="p-6 space-y-8 text-slate-800 dark:text-slate-200">

                    {/* 개요 */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-lg border border-blue-100 dark:border-blue-800">
                        <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2 text-lg">
                            매도 전략 가이드 (단기 스캘핑)
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-200 leading-relaxed">
                            스캘핑 전략에서는 <strong>빠른 수익 확정과 손실 제한</strong>이 핵심입니다.
                            4가지 조건 중 하나라도 충족되면 즉시 시장가 매도가 실행됩니다.
                        </p>
                    </div>

                    {/* 전략 1: 익절 */}
                    <section className="space-y-3">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            1. 목표 수익률 익절 (Take Profit)
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            현재 수익률이 설정한 목표에 도달하면 즉시 매도하여 수익을 확정합니다.
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-1.5 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <li><strong>조건:</strong> 현재 수익률 >= <code>TAKE_PROFIT_PCT</code></li>
                            <li><strong>실행:</strong> 시장가 전량 매도</li>
                            <li className="list-none pt-2 font-semibold text-blue-600 dark:text-blue-400 italic">"목표 수익에 도달하면 욕심 부리지 않고 확정합니다."</li>
                        </ul>
                    </section>

                    {/* 전략 2: 손절 */}
                    <section className="space-y-3">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            2. 손절 (Stop Loss)
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            모멘텀이 예상과 다르게 반전되었을 때 손실을 빠르게 차단합니다.
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-1.5 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <li><strong>조건:</strong> 현재 수익률 &lt;= -<code>STOP_LOSS_PCT</code></li>
                            <li><strong>실행:</strong> 시장가 전량 매도</li>
                            <li className="list-none pt-2 font-semibold text-orange-600 dark:text-orange-400 italic">"소나기는 피하고, 다음 기회를 위해 투자금을 보존합니다."</li>
                        </ul>
                    </section>

                    {/* 전략 3: 트레일링 스탑 */}
                    <section className="space-y-3">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            3. 트레일링 스탑 (Trailing Stop)
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            수익이 일정 수준 이상 발생하면, 최고점을 추적하다가 하락 전환 시 매도합니다.
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-1.5 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <li><strong>활성화:</strong> 수익률이 <code>TRAILING_STOP_ACTIVATION_PCT</code> 이상일 때 추적 시작</li>
                            <li><strong>매도:</strong> 추적 중 최고가 대비 <code>TRAILING_STOP_RATE_PCT</code> 하락 시 매도</li>
                            <li className="list-none pt-2 font-semibold text-purple-600 dark:text-purple-400 italic">"상승은 끝까지 따라가고, 하락 전환 시 놓치지 않고 빠져나옵니다."</li>
                        </ul>
                        <div className="text-sm text-slate-600 dark:text-slate-400 pl-2 border-l-4 border-purple-200 dark:border-purple-800 mt-2">
                            <div className="font-semibold mb-1">관련 파라미터</div>
                            <ul className="list-disc list-inside space-y-1">
                                <li><code>TRAILING_STOP_ENABLED</code>: 트레일링 스탑 활성화 (true/false)</li>
                                <li><code>TRAILING_STOP_ACTIVATION_PCT</code>: 추적 시작 수익률 (추천: 1~2%)</li>
                                <li><code>TRAILING_STOP_RATE_PCT</code>: 최고가 대비 하락률 (추천: 0.5~1%)</li>
                            </ul>
                        </div>
                    </section>

                    {/* 전략 4: 최대 보유 시간 */}
                    <section className="space-y-3">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            4. 최대 보유 시간 (Max Hold Time)
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            스캘핑은 단기 전략이므로, 일정 시간이 지나면 손익에 관계없이 포지션을 청산합니다.
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-1.5 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <li><strong>조건:</strong> 매수 후 <code>MAX_HOLD_MINUTES</code>분 경과</li>
                            <li><strong>실행:</strong> 시장가 전량 매도</li>
                            <li className="list-none pt-2 font-semibold text-amber-600 dark:text-amber-400 italic">"모멘텀이 사라진 종목에 묶이지 않고 빠르게 회전합니다."</li>
                        </ul>
                    </section>

                    {/* 설정 팁 */}
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-100 dark:border-yellow-800">
                        <h5 className="font-bold text-sm text-yellow-800 dark:text-yellow-300 mb-2 flex items-center gap-1">
                            설정 팁
                        </h5>
                        <ul className="list-disc list-inside text-sm text-yellow-900 dark:text-yellow-200 space-y-1 ml-2">
                            <li>스캘핑에서는 익절/손절 비율을 좁게 설정하세요 (익절 1~3%, 손절 1~2%)</li>
                            <li>트레일링 스탑을 활성화하면 강한 모멘텀에서 추가 수익을 기대할 수 있습니다</li>
                            <li>최대 보유 시간은 분봉 단위에 맞춰 설정하세요 (5분봉이면 30~60분 추천)</li>
                        </ul>
                    </div>

                </div>

                {/* 하단 닫기 버튼 */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                    <Button onClick={onClose} className="bg-slate-600 hover:bg-slate-700 text-white">
                        닫기
                    </Button>
                </div>
            </div>
        </div>
    );
}
