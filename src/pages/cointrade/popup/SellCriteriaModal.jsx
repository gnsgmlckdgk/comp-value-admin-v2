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
                        매도 기준 상세 시나리오
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
                            💰 매도 전략 가이드 (AI 자동 매도)
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-200 leading-relaxed">
                            자산을 안전하게 보호하고 수익을 확정하기 위해 <strong>3단계 매도 필터</strong>를 사용합니다. 
                            모든 매도는 체결 가능성을 높이기 위해 <span className="font-bold underline">시장가</span>로 실행됩니다.
                        </p>
                    </div>

                    {/* 전략 1 */}
                    <section className="space-y-3">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            1. AI 예측 기반 익절 (어깨에서 파는 전략) 📈
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            AI가 예측한 최고가에 도달하기 직전에 미리 매도하여 수익을 실현합니다.
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-1.5 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <li><strong>목표가 계산:</strong> AI 예측 최고가에서 <strong>익절 버퍼(<code>TAKE_PROFIT_BUFFER</code>)</strong>만큼 차감한 가격</li>
                            <li><strong>안전장치:</strong> 만약 예측가가 너무 높더라도, <strong>최대 이익률(<code>MAX_PROFIT_RATE</code>)</strong>에 도달하면 즉시 매도하여 과도한 욕심을 방지합니다.</li>
                            <li className="list-none pt-2 font-semibold text-blue-600 dark:text-blue-400 italic">"머리(최고점)가 아닌 어깨에서 확실하게 수익을 챙깁니다."</li>
                        </ul>
                    </section>

                    {/* 전략 2 */}
                    <section className="space-y-3">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            2. 7일 보유 수익 확정 (시간 기반 익절) ⏳
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            종목을 매수한 지 7일이 지났을 때, 무작정 기다리지 않고 수익을 확정 짓습니다.
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-1.5 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <li><strong>조건:</strong> 매수 후 7일 이상 경과 + 수익률이 <strong>최소 익절률(<code>MIN_PROFIT_RATE</code>)</strong> 이상일 때</li>
                            <li><strong>이유:</strong> 기회비용을 고려하여, 일주일간 충분한 수익이 났다면 다음 꿀통 종목으로 교체하기 위함입니다.</li>
                            <li className="list-none pt-2 font-semibold text-green-600 dark:text-green-400 italic">"7일간 공들인 종목, 목표 수익 달성 시 기분 좋게 이별합니다."</li>
                        </ul>
                    </section>

                    {/* 전략 3 */}
                    <section className="space-y-3">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            3. 손절 관리 (리스크 최소화) 🛡️
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            예측과 달리 시장 상황이 악화될 경우 손실을 짧게 끊어냅니다.
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-1.5 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <li><strong>조건:</strong> 수익률이 <strong>손절 기준(<code>STOP_LOSS_THRESHOLD</code>)</strong> 이하로 하락할 때</li>
                            <li><strong>설명:</strong> 추가 하락으로 인한 큰 손실을 막기 위해 정해진 기준에서 과감하게 매도합니다.</li>
                            <li className="list-none pt-2 font-semibold text-red-600 dark:text-red-400 italic">"소나기는 피하고, 다음 기회를 위해 투자금을 보존합니다."</li>
                        </ul>
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
