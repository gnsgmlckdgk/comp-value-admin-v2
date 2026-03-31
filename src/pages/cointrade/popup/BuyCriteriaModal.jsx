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
                        매수 기준 상세 (모멘텀 스캘핑)
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
                        <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">매수 흐름</h4>
                        <div className="px-4 py-3 bg-white dark:bg-slate-800 rounded border border-blue-200 dark:border-blue-700 mb-3 text-center font-bold text-blue-600 dark:text-blue-400 text-sm leading-relaxed">
                            1. 스캐너가 모멘텀 감지<br />
                            2. ML 모델이 상승 지속 확률 확인<br />
                            3. BTC 필터 통과 확인<br />
                            4. 시장가 매수 실행
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-200">
                            스캐너가 거래량 급증 + 가격 상승 패턴을 감지하면, LightGBM ML 모델이 해당 모멘텀의 <strong>지속 확률</strong>을 계산합니다.
                            확률이 설정값(<code>ML_MIN_CONFIDENCE</code>) 이상이면 즉시 시장가로 매수합니다.
                        </p>
                    </div>

                    {/* 1단계: 스캐너 */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">1단계: 모멘텀 스캐너</h4>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            전체 마켓을 주기적으로 스캔하여 <strong>거래량 급증 + 가격 상승</strong> 패턴이 동시에 나타나는 종목을 감지합니다.
                        </p>

                        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                            <h5 className="font-semibold text-sm mb-2 text-slate-800 dark:text-slate-200">감지 조건</h5>
                            <ul className="list-disc list-inside text-sm space-y-1.5 text-slate-700 dark:text-slate-300">
                                <li><strong>거래량 배율:</strong> 최근 거래량이 평균 대비 <code>SCANNER_VOLUME_RATIO_MIN</code>배 이상</li>
                                <li><strong>가격 변화율:</strong> 감지 시간창 내 <code>SCANNER_PRICE_CHANGE_MIN</code>% 이상 상승</li>
                                <li><strong>RSI 범위:</strong> RSI가 <code>SCANNER_RSI_MIN</code> ~ <code>SCANNER_RSI_MAX</code> 사이</li>
                                <li><strong>VWAP 이탈:</strong> VWAP 대비 이탈률이 <code>SCANNER_VWAP_DEVIATION_MAX</code>% 이내</li>
                                <li><strong>거래대금:</strong> 최소 <code>SCANNER_MIN_TRADE_VALUE</code>원 이상</li>
                            </ul>
                        </div>
                    </section>

                    {/* 2단계: ML 확인 */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">2단계: ML 모델 확인 (LightGBM)</h4>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            스캐너가 감지한 시그널에 대해 LightGBM 모델이 <strong>모멘텀 지속 확률</strong>을 계산합니다.
                        </p>

                        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                            <h5 className="font-semibold text-sm mb-2 text-slate-800 dark:text-slate-200">동작 방식</h5>
                            <ul className="list-disc list-inside text-sm space-y-1.5 text-slate-700 dark:text-slate-300">
                                <li><strong>ML 활성화 시:</strong> 매수 직전 즉석 학습 후, 확률이 <code>ML_MIN_CONFIDENCE</code> 이상이면 매수 진행</li>
                                <li><strong>ML 비활성화 시:</strong> 스캐너 시그널만으로 바로 매수</li>
                            </ul>
                        </div>
                    </section>

                    {/* 3단계: BTC 필터 */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">3단계: BTC 추세 필터</h4>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            비트코인이 하락 추세일 때는 알트코인도 함께 떨어지는 경향이 있습니다.
                            BTC 추세 필터를 활성화하면 <strong>비트코인이 하락 추세일 때 모든 알트코인 매수를 중단</strong>합니다.
                        </p>

                        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                            <div className="flex flex-col items-center justify-center py-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 mb-3">
                                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                                    BTC 현재가 &lt; BTC MA(이동평균) → 하락 추세 → 매수 중단
                                </span>
                            </div>
                            <ul className="list-disc list-inside text-sm space-y-1.5 text-slate-700 dark:text-slate-300">
                                <li><code>BTC_FILTER_ENABLED</code>: BTC 추세 필터 활성화 (true/false)</li>
                                <li><code>BTC_TREND_MA_PERIOD</code>: BTC 이동평균 계산 기간</li>
                            </ul>
                        </div>
                    </section>

                    {/* 설정 팁 */}
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-100 dark:border-yellow-800">
                        <h5 className="font-bold text-sm text-yellow-800 dark:text-yellow-300 mb-2 flex items-center gap-1">
                            설정 팁
                        </h5>
                        <ul className="list-disc list-inside text-sm text-yellow-900 dark:text-yellow-200 space-y-1 ml-2">
                            <li>스캐너 감도를 낮추려면 거래량 배율과 가격 변화율 최소값을 높이세요.</li>
                            <li>ML 확률이 높을수록 시그널 수는 줄지만 정확도가 올라갑니다.</li>
                            <li>불안정한 시장에서는 BTC 필터를 활성화하세요.</li>
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
