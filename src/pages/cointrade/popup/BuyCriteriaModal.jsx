import { useEffect } from 'react';
import Button from '@/component/common/button/Button';

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
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
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
                        <div className="px-4 py-2 bg-white dark:bg-slate-800 rounded border border-blue-200 dark:border-blue-700 mb-3 text-center font-bold text-blue-600 dark:text-blue-400">
                            매수 조건: (수익률 &gt;= X% OR 급등확률 &gt;= S%) AND 점수 &gt;= 최소 매수 점수
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-200">
                            매수는 기본적으로 <strong>예측 수익률(<code>BUY_PROFIT_THRESHOLD</code>)</strong> 또는 <strong>급등 확률(<code>MIN_SURGE_PROBABILITY</code>)</strong> 중 하나라도 조건을 만족하면 진행됩니다.
                            <br/>
                            <span className="text-xs opacity-80">(단, 모든 경우에 최소 매수 점수(<code>MIN_BUY_SCORE</code>)는 넘어야 합니다.)</span>
                        </p>
                    </div>

                    {/* 케이스 표 */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">매수 판단 케이스 예시</h4>
                            <div className="text-xs text-slate-500 dark:text-slate-400 text-right">
                                * 예시 기준: 수익률 10%↑ / 급등확률 60%↑
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-600">
                                    <tr>
                                        <th className="px-4 py-3 text-center w-20">구분</th>
                                        <th className="px-4 py-3 text-center w-32">예측 수익률</th>
                                        <th className="px-4 py-3 text-center w-32">급등 확률</th>
                                        <th className="px-4 py-3 text-center w-20">결과</th>
                                        <th className="px-4 py-3">비고</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    <tr className="bg-green-50/50 dark:bg-green-900/10">
                                        <td className="px-4 py-3 text-center font-medium">케이스 1</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-bold text-blue-600 dark:text-blue-400">15%</span>
                                            <span className="text-xs text-slate-500 block">(기준 10%↑)</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-slate-600 dark:text-slate-400">10%</span>
                                            <span className="text-xs text-slate-500 block">(기준 60%↑)</span>
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold text-green-600 dark:text-green-400">매수</td>
                                        <td className="px-4 py-3">수익률 조건으로 통과</td>
                                    </tr>
                                    <tr className="bg-green-50/50 dark:bg-green-900/10">
                                        <td className="px-4 py-3 text-center font-medium">케이스 2</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-slate-600 dark:text-slate-400">5%</span>
                                            <span className="text-xs text-slate-500 block">(기준 10%↑)</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-bold text-purple-600 dark:text-purple-400">80%</span>
                                            <span className="text-xs text-slate-500 block">(기준 60%↑)</span>
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold text-green-600 dark:text-green-400">매수</td>
                                        <td className="px-4 py-3">급등 확률 조건으로 통과</td>
                                    </tr>
                                    <tr className="bg-green-100/50 dark:bg-green-900/30">
                                        <td className="px-4 py-3 text-center font-medium">케이스 3</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-bold text-blue-600 dark:text-blue-400">20%</span>
                                            <span className="text-xs text-slate-500 block">(기준 10%↑)</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-bold text-purple-600 dark:text-purple-400">90%</span>
                                            <span className="text-xs text-slate-500 block">(기준 60%↑)</span>
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold text-green-600 dark:text-green-400">매수</td>
                                        <td className="px-4 py-3">우량 종목 (점수 매우 높음)</td>
                                    </tr>
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                                        <td className="px-4 py-3 text-center font-medium">케이스 4</td>
                                        <td className="px-4 py-3 text-center text-slate-500">5%</td>
                                        <td className="px-4 py-3 text-center text-slate-500">10%</td>
                                        <td className="px-4 py-3 text-center font-medium text-slate-500">패스</td>
                                        <td className="px-4 py-3 text-slate-500">조건 미충족</td>
                                    </tr>
                                </tbody>
                            </table>
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
