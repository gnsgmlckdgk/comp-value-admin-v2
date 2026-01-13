import { useState, useEffect } from 'react';
import { send } from '@/util/ClientUtil';

export default function SellRecordDetailModal({ isOpen, data, fxRate, onClose }) {
    const [companyProfile, setCompanyProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);

    useEffect(() => {
        if (isOpen && data?.symbol) {
            fetchCompanyProfile(data.symbol);
        }
    }, [isOpen, data?.symbol]);

    const fetchCompanyProfile = async (symbol) => {
        if (!symbol) return;

        setProfileLoading(true);
        try {
            const { data: response, error } = await send(`/dart/abroad/company/search/profile?symbol=${encodeURIComponent(symbol)}`, {}, 'GET');
            if (!error && response?.success && response?.response && response.response.length > 0) {
                const profile = response.response[0];
                setCompanyProfile(profile);
            } else {
                setCompanyProfile(null);
            }
        } catch (e) {
            console.error('회사 프로필 조회 실패:', e);
            setCompanyProfile(null);
        } finally {
            setProfileLoading(false);
        }
    };

    if (!isOpen) return null;

    const sellAmount = data.sellPrice * data.sellQty;
    // 매도당시환율 우선, 없으면 현재환율 사용
    const sellRate = data.sellExchangeRateAtTrade || fxRate;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                {/* 헤더 */}
                <div className="sticky top-0 bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        매도 기록 상세보기
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* 기본 정보 */}
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">기본 정보</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">티커</label>
                                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{data.symbol}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">매도일</label>
                                <div className="text-lg font-semibold text-slate-900 dark:text-white">{data.sellDate}</div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">기업명</label>
                            <div className="text-lg font-semibold text-slate-900 dark:text-white">{data.companyName}</div>
                        </div>
                    </div>

                    {/* 매도 상세 정보 */}
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">매도 상세</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">매도가 (USD)</label>
                                <div className="text-lg font-semibold text-slate-900 dark:text-white">
                                    ${data.sellPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                {sellRate && (
                                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                        ₩{Math.round(data.sellPrice * sellRate).toLocaleString()}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">매도 수량</label>
                                <div className="text-lg font-semibold text-slate-900 dark:text-white">
                                    {data.sellQty.toLocaleString()}주
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">매도 금액</label>
                            <div className="text-xl font-bold text-slate-900 dark:text-white">
                                ${sellAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            {sellRate && (
                                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    ₩{Math.round(sellAmount * sellRate).toLocaleString()}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">실현 손익</label>
                            <div className={`text-xl font-bold ${data.realizedPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {data.realizedPnl >= 0 ? '+' : ''}${data.realizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            {sellRate && (
                                <div className={`text-sm mt-1 ${data.realizedPnl >= 0 ? 'text-emerald-600/70 dark:text-emerald-400/70' : 'text-red-600/70 dark:text-red-400/70'}`}>
                                    {data.realizedPnl >= 0 ? '+' : ''}₩{Math.round(data.realizedPnl * sellRate).toLocaleString()}
                                </div>
                            )}
                        </div>

                        {/* 환율 정보 */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">매수당시환율</label>
                                <div className="text-lg font-semibold text-slate-900 dark:text-white">
                                    {data.buyExchangeRateAtTrade ? `₩${data.buyExchangeRateAtTrade.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}` : '-'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">매도당시환율</label>
                                <div className="text-lg font-semibold text-slate-900 dark:text-white">
                                    {data.sellExchangeRateAtTrade ? `₩${data.sellExchangeRateAtTrade.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}` : '-'}
                                </div>
                            </div>
                        </div>

                        {data.rmk && (
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">비고</label>
                                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                    {data.rmk}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 회사 프로필 */}
                    {profileLoading ? (
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                            <div className="flex items-center justify-center py-8">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400"></div>
                            </div>
                        </div>
                    ) : companyProfile ? (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 rounded-lg p-4 border border-blue-200 dark:border-slate-600">
                            <div className="flex items-start gap-3 mb-3">
                                {companyProfile.image && !companyProfile.defaultImage && (
                                    <img
                                        src={companyProfile.image}
                                        alt={companyProfile.symbol}
                                        className="w-12 h-12 rounded-lg object-contain bg-white"
                                        onError={(e) => e.target.style.display = 'none'}
                                    />
                                )}
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-900 dark:text-white">{companyProfile.companyName}</h3>
                                    <p className="text-xs text-slate-600 dark:text-slate-300">{companyProfile.exchange} · {companyProfile.sector}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                {companyProfile.price && (
                                    <div>
                                        <div className="text-slate-600 dark:text-slate-400">현재가</div>
                                        <div className="font-semibold text-slate-900 dark:text-white">${companyProfile.price.toFixed(2)}</div>
                                    </div>
                                )}
                                {companyProfile.beta && (
                                    <div>
                                        <div className="text-slate-600 dark:text-slate-400">베타</div>
                                        <div className="font-semibold text-slate-900 dark:text-white">{companyProfile.beta.toFixed(2)}</div>
                                    </div>
                                )}
                                {companyProfile.marketCap && (
                                    <div>
                                        <div className="text-slate-600 dark:text-slate-400">시가총액</div>
                                        <div className="font-semibold text-slate-900 dark:text-white">
                                            ${(companyProfile.marketCap / 1e9).toFixed(2)}B
                                        </div>
                                    </div>
                                )}
                                {companyProfile.lastDividend > 0 && (
                                    <div>
                                        <div className="text-slate-600 dark:text-slate-400">배당</div>
                                        <div className="font-semibold text-slate-900 dark:text-white">${companyProfile.lastDividend.toFixed(2)}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}

                    {/* 환율 정보 */}
                    {fxRate && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>환율: 1 USD = ₩{Math.round(fxRate).toLocaleString()}</span>
                        </div>
                    )}
                </div>

                {/* 푸터 */}
                <div className="sticky bottom-0 bg-slate-50 dark:bg-slate-700/50 px-6 py-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-lg hover:from-sky-600 hover:to-indigo-600 transition-all shadow-sm font-medium"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}
