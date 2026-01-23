import { useEffect } from 'react';
import Button from '@/component/common/button/Button';

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

    if (!isOpen) return null;

    // 배경 클릭 시 닫기
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
            onClick={handleBackdropClick}
        >
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg md:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
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
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                        <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">목표가 vs 급등기준 결정표</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-200">
                            사용자 혼동을 방지하기 위해 <strong>예측 최고가(개별 목표)</strong>와 <strong>급등 기준(<code>SURGE_THRESHOLD</code>, 전역 정책)</strong>에 따른 매도 결정 로직을 정리합니다.
                            <br />
                            <span className="text-xs opacity-80">(예시 가정: 급등 기준 20%)</span>
                        </p>
                    </div>

                    {/* 시나리오 A */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">[시나리오 A] 목표가 높음</h4>
                            <span className="text-sm px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                예측 30% / 급등 기준 20%
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 italic">목표: "크게 먹자"</p>

                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                            {/* Header */}
                            <div className="hidden md:grid md:grid-cols-12 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-600">
                                <div className="md:col-span-2 px-4 py-3 text-center">현재 수익률</div>
                                <div className="md:col-span-2 px-4 py-3 text-center">만료일 여부</div>
                                <div className="md:col-span-2 px-4 py-3 text-center">결정</div>
                                <div className="md:col-span-6 px-4 py-3">설명</div>
                            </div>

                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {/* Rows */}
                                <div className="grid grid-cols-1 md:grid-cols-12 md:items-center gap-2 md:gap-0 p-3 md:p-0 bg-green-50/50 dark:bg-green-900/10 md:border-b md:border-slate-100 md:dark:border-slate-700">
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center font-bold text-red-600 dark:text-red-400"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">현재 수익률:</span>32%</div>
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center text-slate-500"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">만료일 여부:</span>상관없음</div>
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center font-bold text-green-600 dark:text-green-400"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">결정:</span>익절 매도</div>
                                    <div className="md:col-span-6 md:px-4 md:py-3"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">설명:</span>예측가(30%) 초과 달성. (가장 먼저 체크됨)</div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-12 md:items-center gap-2 md:gap-0 p-3 md:p-0 md:border-b md:border-slate-100 md:dark:border-slate-700">
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center font-medium"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">현재 수익률:</span>25%</div>
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center text-orange-600 font-medium"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">만료일 여부:</span>지남</div>
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center font-bold text-blue-600 dark:text-blue-400"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">결정:</span>보유 유보</div>
                                    <div className="md:col-span-6 md:px-4 md:py-3"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">설명:</span>목표가(30%) 미달이지만, 급등 기준(<code>SURGE_THRESHOLD</code>, 20%)을 넘겨 상승세 인정.</div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-12 md:items-center gap-2 md:gap-0 p-3 md:p-0 bg-slate-50/50 dark:bg-slate-800/50 md:border-b md:border-slate-100 md:dark:border-slate-700">
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">현재 수익률:</span>15%</div>
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center text-orange-600 font-medium"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">만료일 여부:</span>지남</div>
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center font-medium text-slate-600 dark:text-slate-400"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">결정:</span>만료 매도</div>
                                    <div className="md:col-span-6 md:px-4 md:py-3"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">설명:</span>목표가 실패, 급등 기준 미달. "예측 실패"로 간주.</div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-12 md:items-center gap-2 md:gap-0 p-3 md:p-0">
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">현재 수익률:</span>15%</div>
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center text-slate-500"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">만료일 여부:</span>안 지남</div>
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center font-medium text-slate-600 dark:text-slate-400"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">결정:</span>보유 유지</div>
                                    <div className="md:col-span-6 md:px-4 md:py-3"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">설명:</span>아직 기회가 남았으므로 목표가(30%) 대기.</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 시나리오 B */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">[시나리오 B] 목표가 낮음</h4>
                            <span className="text-sm px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                예측 10% / 급등 기준 20%
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 italic">목표: "소박하게 먹자"</p>

                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                            {/* Header */}
                            <div className="hidden md:grid md:grid-cols-12 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-600">
                                <div className="md:col-span-2 px-4 py-3 text-center">현재 수익률</div>
                                <div className="md:col-span-2 px-4 py-3 text-center">만료일 여부</div>
                                <div className="md:col-span-2 px-4 py-3 text-center">결정</div>
                                <div className="md:col-span-6 px-4 py-3">설명</div>
                            </div>

                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {/* Rows */}
                                <div className="grid grid-cols-1 md:grid-cols-12 md:items-center gap-2 md:gap-0 p-3 md:p-0 bg-green-50/50 dark:bg-green-900/10 md:border-b md:border-slate-100 md:dark:border-slate-700">
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center font-bold text-red-600 dark:text-red-400"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">현재 수익률:</span>25%</div>
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center text-slate-500"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">만료일 여부:</span>상관없음</div>
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center font-bold text-green-600 dark:text-green-400"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">결정:</span>익절 매도</div>
                                    <div className="md:col-span-6 md:px-4 md:py-3"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">설명:</span>목표가(10%)를 넘었으므로 진작에 매도됨.</div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-12 md:items-center gap-2 md:gap-0 p-3 md:p-0 bg-green-50/50 dark:bg-green-900/10 md:border-b md:border-slate-100 md:dark:border-slate-700">
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center font-bold text-red-600 dark:text-red-400"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">현재 수익률:</span>15%</div>
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center text-slate-500"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">만료일 여부:</span>상관없음</div>
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center font-bold text-green-600 dark:text-green-400"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">결정:</span>익절 매도</div>
                                    <div className="md:col-span-6 md:px-4 md:py-3"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">설명:</span>이미 목표가(10%)를 초과 달성함. 급등 기준과 무관하게 수익 확정.</div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-12 md:items-center gap-2 md:gap-0 p-3 md:p-0 bg-slate-50/50 dark:bg-slate-800/50 md:border-b md:border-slate-100 md:dark:border-slate-700">
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">현재 수익률:</span>5%</div>
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center text-orange-600 font-medium"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">만료일 여부:</span>지남</div>
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center font-medium text-slate-600 dark:text-slate-400"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">결정:</span>만료 매도</div>
                                    <div className="md:col-span-6 md:px-4 md:py-3"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">설명:</span>목표가(10%) 실패, 급등 기준(<code>SURGE_THRESHOLD</code>, 20%) 미달.</div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-12 md:items-center gap-2 md:gap-0 p-3 md:p-0">
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">현재 수익률:</span>5%</div>
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center text-slate-500"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">만료일 여부:</span>안 지남</div>
                                    <div className="md:col-span-2 md:px-4 md:py-3 md:text-center font-medium text-slate-600 dark:text-slate-400"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">결정:</span>보유 유지</div>
                                    <div className="md:col-span-6 md:px-4 md:py-3"><span className="font-semibold text-xs text-slate-500 dark:text-slate-400 md:hidden mr-2">설명:</span>목표가(10%) 도달 대기.</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 핵심 요약 */}
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-5 rounded-lg border border-yellow-100 dark:border-yellow-800">
                        <h4 className="font-bold text-yellow-800 dark:text-yellow-300 mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            핵심 요약
                        </h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-900 dark:text-yellow-200">
                            <li>
                                <strong>익절(목표가 달성)</strong>이 최우선입니다. (급등 기준보다 낮아도 목표가만 넘으면 팝니다.)
                            </li>
                            <li>
                                <strong>유보(패자부활전)</strong>는 만료일이 되었을 때 <strong>"목표가는 못 갔지만 급등 기준(<code>SURGE_THRESHOLD</code>)은 넘은"</strong> 특수 상황에서만 작동합니다.
                            </li>
                        </ol>
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
