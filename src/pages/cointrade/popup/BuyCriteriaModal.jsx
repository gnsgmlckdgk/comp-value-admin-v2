import { useEffect } from 'react';
import Button from '@/component/common/button/Button';
import useModalAnimation from '@/hooks/useModalAnimation';

export default function BuyCriteriaModal({ isOpen, onClose }) {
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
                        매수 기준 상세 케이스
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
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                        <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">매수 조건 논리</h4>
                        <div className="px-4 py-2 bg-white dark:bg-slate-800 rounded border border-blue-200 dark:border-blue-700 mb-3 text-center font-bold text-blue-600 dark:text-blue-400 text-sm leading-relaxed">
                            매수 조건: 기대 수익률 &gt;= 최소 익절률<br />
                            AND 상승 확률 &gt;= 최소 상승 확률<br />
                            AND 모델 일치도 &gt;= 최소값 (앙상블 모드)<br />
                            AND BTC 추세 필터 통과 (활성화 시)
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-200">
                            매수는 <strong>기대 수익률(<code>BUY_PROFIT_THRESHOLD</code>)</strong>이 설정값(<code>MIN_PROFIT_RATE</code>) 이상이면서, AI가 예측한 <strong>상승 확률(<code>MIN_UP_PROBABILITY</code>)</strong>이 높을 때 진행됩니다.
                            추가로 <strong>모델 일치도</strong>와 <strong>BTC 추세 필터</strong> 조건도 충족해야 합니다.
                        </p>
                    </div>

                    {/* 기대 수익률 상세 설명 */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">📊 기대 수익률 (Expected Return)</h4>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            AI가 예측한 '최고점'과 '최저점'을 종합하여 계산한 <strong>위험 조정 수익률</strong>입니다.
                        </p>

                        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                            <h5 className="font-semibold text-sm mb-2 text-slate-800 dark:text-slate-200">1. 계산 공식</h5>
                            <div className="flex flex-col items-center justify-center py-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 mb-3">
                                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                    기대 수익률 = (예상 최고 상승률 - 예상 최저 하락률) / 2
                                </span>
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400 pl-2 border-l-4 border-blue-200 dark:border-blue-800">
                                <div className="font-semibold mb-1">예시)</div>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>예상 최고가: <span className="text-blue-600 dark:text-blue-400 font-bold">+20%</span> (상승 잠재력)</li>
                                    <li>예상 최저가: <span className="text-red-600 dark:text-red-400 font-bold">10%</span> (하락 리스크)</li>
                                    <li>기대 수익률: (20 - 10) / 2 = <span className="font-bold text-slate-800 dark:text-slate-100">5%</span></li>
                                </ul>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h5 className="font-semibold text-sm text-slate-800 dark:text-slate-200">2. 왜 이렇게 계산하나요?</h5>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                단순히 "얼마나 오를까(최고가)"만 보고 매수하면, 변동성이 심해 하락 위험이 큰 종목에 물릴 수 있습니다.
                                이 방식은 <strong>상승폭이 크더라도 하락 위험이 너무 크면 기대값을 깎아서</strong>, '상방은 열려있고 하방은 닫힌' 꿀통 종목만 걸러내기 위함입니다.
                            </p>
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-100 dark:border-yellow-800">
                            <h5 className="font-bold text-sm text-yellow-800 dark:text-yellow-300 mb-2 flex items-center gap-1">
                                <span>⭐</span> 3. 설정 팁 (중요!)
                            </h5>
                            <p className="text-sm text-yellow-900 dark:text-yellow-200 leading-relaxed mb-2">
                                이 값은 하락분(마이너스)이 반영된 평균값이므로, <strong>실제 목표 수익률보다 낮게 설정해야 합니다.</strong>
                            </p>
                            <ul className="list-disc list-inside text-sm text-yellow-900 dark:text-yellow-200 space-y-1 ml-2">
                                <li>목표 수익이 10%라면? 👉 <strong>3% ~ 5%</strong> 로 설정하세요.</li>
                                <li>10%로 설정하면? 👉 실제로는 25% 이상 폭등할 종목만 찾게 되어 매수가 거의 안 됩니다.</li>
                            </ul>
                        </div>
                    </section>

                    {/* 모델 일치도 필터 */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">🤖 모델 일치도 필터 (Ensemble Agreement)</h4>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            앙상블 모드에서 여러 AI 모델(LSTM/GRU/CNN)의 <strong>예측 방향이 얼마나 일치하는지</strong> 확인하여, 신뢰도가 낮은 매수를 걸러냅니다.
                        </p>

                        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                            <h5 className="font-semibold text-sm mb-2 text-slate-800 dark:text-slate-200">동작 방식</h5>
                            <ul className="list-disc list-inside text-sm space-y-1.5 text-slate-700 dark:text-slate-300">
                                <li><strong>일치도 1.0:</strong> 모든 모델이 같은 방향(상승)을 예측 → 높은 신뢰도</li>
                                <li><strong>일치도 0.5:</strong> 절반의 모델만 상승 예측 → 중간 신뢰도</li>
                                <li><strong>일치도 0.0:</strong> 필터 비활성화 (모든 매수 허용)</li>
                                <li><strong>단일 모델 사용 시:</strong> 항상 1.0으로 계산되어 필터가 무효화됩니다</li>
                            </ul>
                        </div>

                        <div className="text-sm text-slate-600 dark:text-slate-400 pl-2 border-l-4 border-purple-200 dark:border-purple-800">
                            <div className="font-semibold mb-1">관련 파라미터</div>
                            <ul className="list-disc list-inside space-y-1">
                                <li><code>MIN_MODEL_AGREEMENT</code>: 모델 일치도 최소값 (0~1, 추천: 0.5)</li>
                                <li><code>ENSEMBLE_MODE</code>: 앙상블 모드 선택 (lstm_only/gru_only/cnn_only/ensemble)</li>
                            </ul>
                        </div>
                    </section>

                    {/* BTC 추세 필터 */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">₿ BTC 추세 필터 (Bitcoin Trend Filter)</h4>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            비트코인이 하락 추세일 때는 알트코인도 함께 떨어지는 경향이 있습니다.
                            BTC 추세 필터를 활성화하면 <strong>비트코인이 하락 추세일 때 모든 알트코인 매수를 중단</strong>합니다.
                        </p>

                        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                            <h5 className="font-semibold text-sm mb-2 text-slate-800 dark:text-slate-200">판단 기준</h5>
                            <div className="flex flex-col items-center justify-center py-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 mb-3">
                                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                                    BTC 종가 &lt; BTC 이동평균(MA) → 하락 추세 → 매수 중단
                                </span>
                            </div>
                            <ul className="list-disc list-inside text-sm space-y-1.5 text-slate-700 dark:text-slate-300">
                                <li><strong>MA 기간이 짧을수록</strong> (예: 10일) 빠르게 반응하지만, 잦은 온오프 발생</li>
                                <li><strong>MA 기간이 길수록</strong> (예: 50일) 안정적이지만, 반응이 느림</li>
                            </ul>
                        </div>

                        <div className="text-sm text-slate-600 dark:text-slate-400 pl-2 border-l-4 border-orange-200 dark:border-orange-800">
                            <div className="font-semibold mb-1">관련 파라미터</div>
                            <ul className="list-disc list-inside space-y-1">
                                <li><code>BTC_FILTER_ENABLED</code>: BTC 추세 필터 활성화 (true/false)</li>
                                <li><code>BTC_TREND_MA_PERIOD</code>: BTC 이동평균 계산 기간 (추천: 20일)</li>
                            </ul>
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-100 dark:border-yellow-800">
                            <h5 className="font-bold text-sm text-yellow-800 dark:text-yellow-300 mb-2 flex items-center gap-1">
                                <span>⭐</span> 설정 팁
                            </h5>
                            <p className="text-sm text-yellow-900 dark:text-yellow-200 leading-relaxed">
                                BTC가 강세장일 때는 필터를 꺼도 괜찮지만, <strong>불확실한 시장에서는 활성화하여 불필요한 매수를 방지</strong>하는 것이 좋습니다.
                            </p>
                        </div>
                    </section>

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
