import { useState, useEffect } from 'react';
import { send } from '@/util/ClientUtil';

/**
 * 가격 비교 차트 컴포넌트
 * 매수가, 현재가, 목표가를 시각적으로 비교
 */
function PriceComparisonChart({ buyPrice, currentPrice, targetPrice }) {
    if (!buyPrice || buyPrice <= 0) return null;

    // 최대값 계산 (목표가가 없거나 0이면 현재가와 매수가 중 큰 값 기준)
    const prices = [buyPrice, currentPrice];
    if (targetPrice > 0) prices.push(targetPrice);
    const maxPrice = Math.max(...prices) * 1.1; // 10% 여유

    const buyPercent = (buyPrice / maxPrice) * 100;
    const curPercent = (currentPrice / maxPrice) * 100;
    const targetPercent = targetPrice > 0 ? (targetPrice / maxPrice) * 100 : 0;

    const isProfit = currentPrice >= buyPrice;
    const isTargetHit = targetPrice > 0 && currentPrice >= targetPrice;

    return (
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-4">가격 비교</h4>
            <div className="space-y-3">
                {/* 매수가 */}
                <div className="flex items-center gap-3">
                    <div className="w-14 text-xs text-slate-500 dark:text-slate-400">매수가</div>
                    <div className="flex-1 relative h-6 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div
                            className="absolute left-0 top-0 h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${buyPercent}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-end pr-2">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                                ${buyPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 현재가 */}
                <div className="flex items-center gap-3">
                    <div className="w-14 text-xs text-slate-500 dark:text-slate-400">현재가</div>
                    <div className="flex-1 relative h-6 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div
                            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                                isProfit ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${curPercent}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-end pr-2">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                                ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 목표가 */}
                {targetPrice > 0 && (
                    <div className="flex items-center gap-3">
                        <div className="w-14 text-xs text-slate-500 dark:text-slate-400">목표가</div>
                        <div className="flex-1 relative h-6 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                            <div
                                className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                                    isTargetHit ? 'bg-amber-500' : 'bg-purple-500'
                                }`}
                                style={{ width: `${targetPercent}%` }}
                            />
                            <div className="absolute inset-0 flex items-center justify-end pr-2">
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                                    ${targetPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 범례 */}
            <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-slate-200 dark:border-slate-600">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">매수가</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-full ${isProfit ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        현재가 ({isProfit ? '수익' : '손실'})
                    </span>
                </div>
                {targetPrice > 0 && (
                    <div className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded-full ${isTargetHit ? 'bg-amber-500' : 'bg-purple-500'}`} />
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            목표가 {isTargetHit && '(도달!)'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * 종목 상세정보 모달
 * - 더블클릭으로 열림
 * - 현재 정보 표시 + 수정 가능 (일반 행만)
 * - "분석" 버튼으로 기업가치계산결과 모달 열기
 */
export default function TransactionDetailModal({
    isOpen,
    onClose,
    row,
    fx,
    onSave,
    onAnalyze,
    saving,
    isGroupRow = false, // 그룹 합계 행 여부
}) {
    const [formData, setFormData] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [companyProfile, setCompanyProfile] = useState(null);

    // row 데이터로 폼 초기화
    useEffect(() => {
        if (isOpen && row) {
            setFormData({
                symbol: row.symbol || '',
                companyName: row.companyName || '',
                buyDate: row.buyDate || '',
                buyPrice: row.buyPrice || '',
                totalBuyAmount: row.totalBuyAmount || row.totalQty || '',
                currentPrice: row.currentPrice || '',
                targetPrice: row.targetPrice || '',
                rmk: row.rmk || '',
            });
            setIsEditing(false);
            setCompanyProfile(null);
            // 프로파일 자동 조회
            if (row.symbol) {
                fetchCompanyProfile(row.symbol);
            }
        }
    }, [isOpen, row]);

    const fetchCompanyProfile = async (symbol) => {
        if (!symbol) return;
        setLoadingProfile(true);
        try {
            const { data, error } = await send(
                `/dart/abroad/company/search/profile?symbol=${encodeURIComponent(symbol.trim())}`,
                {},
                'GET'
            );
            if (!error && data?.success && data?.response?.length > 0) {
                setCompanyProfile(data.response[0]);
            }
        } catch (e) {
            console.error('프로파일 조회 실패:', e);
        } finally {
            setLoadingProfile(false);
        }
    };

    if (!isOpen || !row) return null;

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        // 변경된 필드만 저장
        const updates = {};
        if (formData.symbol !== row.symbol) updates.symbol = formData.symbol.trim().toUpperCase();
        if (formData.companyName !== row.companyName) updates.companyName = formData.companyName.trim();
        if (formData.buyDate !== row.buyDate) updates.buyDate = formData.buyDate;
        if (String(formData.buyPrice) !== String(row.buyPrice)) updates.buyPrice = formData.buyPrice;
        if (String(formData.totalBuyAmount) !== String(row.totalBuyAmount)) updates.totalBuyAmount = formData.totalBuyAmount;
        if (String(formData.targetPrice) !== String(row.targetPrice)) updates.targetPrice = formData.targetPrice;
        if (formData.rmk !== row.rmk) updates.rmk = formData.rmk.trim();

        if (Object.keys(updates).length === 0) {
            setIsEditing(false);
            return;
        }

        const success = await onSave(row.id, updates);
        if (success) {
            setIsEditing(false);
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleAnalyzeClick = () => {
        if (onAnalyze && formData.symbol) {
            onAnalyze(formData.symbol.trim());
        }
    };

    // 계산값
    const buyPrice = parseFloat(formData.buyPrice) || 0;
    const qty = parseInt(formData.totalBuyAmount) || 0;
    const curPrice = parseFloat(formData.currentPrice) || 0;
    const targetPrice = parseFloat(formData.targetPrice) || 0;
    const fxRate = fx || 0;

    const totalBuy = buyPrice * qty;
    const totalCurrent = curPrice * qty;
    const diff = totalCurrent - totalBuy;
    const diffPct = totalBuy > 0 ? ((totalCurrent - totalBuy) / totalBuy) * 100 : 0;
    const isProfit = diff >= 0;
    const isTargetHit = targetPrice > 0 && curPrice >= targetPrice;

    return (
        <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 dark:bg-black/70 p-4"
            onClick={handleOverlayClick}
        >
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-auto rounded-xl bg-white shadow-2xl dark:bg-slate-800">
                {/* 헤더 */}
                <div className="sticky top-0 z-10 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-4 dark:border-slate-700 dark:from-slate-800 dark:to-slate-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {companyProfile?.image && !companyProfile?.defaultImage && (
                                <img
                                    src={companyProfile.image}
                                    alt={formData.symbol}
                                    className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-200 dark:border-slate-600"
                                    onError={(e) => (e.target.style.display = 'none')}
                                />
                            )}
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    {formData.symbol}
                                    {isGroupRow && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full dark:bg-indigo-900/50 dark:text-indigo-400">
                                            합계
                                        </span>
                                    )}
                                    {isTargetHit && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full dark:bg-amber-900/50 dark:text-amber-400">
                                            목표가 도달
                                        </span>
                                    )}
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {formData.companyName}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300 transition-colors"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* 본문 */}
                <div className="p-6 space-y-6">
                    {/* 수익/손실 요약 카드 */}
                    <div className={`rounded-xl p-5 ${isProfit ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-rose-50 dark:bg-rose-900/20'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">평가손익</span>
                            <span className={`text-2xl font-bold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {isProfit ? '+' : ''}{diffPct.toFixed(2)}%
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">매수금액</div>
                                <div className="font-semibold text-slate-900 dark:text-white">
                                    ${totalBuy.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                {fxRate > 0 && (
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        ₩{(totalBuy * fxRate).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">평가금액</div>
                                <div className="font-semibold text-slate-900 dark:text-white">
                                    ${totalCurrent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                {fxRate > 0 && (
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        ₩{(totalCurrent * fxRate).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">손익금액</div>
                                <div className={`font-semibold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {isProfit ? '+' : ''}${diff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                {fxRate > 0 && (
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        {isProfit ? '+' : ''}₩{(diff * fxRate).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 가격 정보 - 순서: 매수가, 현재가, 목표가, 보유수량 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">매수가</div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                                ${buyPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">현재가</div>
                            <div className={`font-semibold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                ${curPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">목표가</div>
                            <div className={`font-semibold ${isTargetHit ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                                {targetPrice > 0 ? `$${targetPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">보유수량</div>
                            <div className="font-semibold text-slate-900 dark:text-white">{qty}주</div>
                        </div>
                    </div>

                    {/* 가격 비교 차트 */}
                    <PriceComparisonChart
                        buyPrice={buyPrice}
                        currentPrice={curPrice}
                        targetPrice={targetPrice}
                    />

                    {/* 편집 폼 - 그룹 행이 아닐 때만 표시 */}
                    {!isGroupRow && (
                        <>
                            {isEditing ? (
                                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-medium text-slate-900 dark:text-white">정보 수정</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">티커</label>
                                            <input
                                                type="text"
                                                value={formData.symbol}
                                                onChange={(e) => handleChange('symbol', e.target.value.toUpperCase())}
                                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">기업명</label>
                                            <input
                                                type="text"
                                                value={formData.companyName}
                                                onChange={(e) => handleChange('companyName', e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">매수일</label>
                                            <input
                                                type="date"
                                                value={formData.buyDate}
                                                onChange={(e) => handleChange('buyDate', e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">매수가 ($)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.buyPrice}
                                                onChange={(e) => handleChange('buyPrice', e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">수량</label>
                                            <input
                                                type="number"
                                                value={formData.totalBuyAmount}
                                                onChange={(e) => handleChange('totalBuyAmount', e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">목표가 ($)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.targetPrice}
                                                onChange={(e) => handleChange('targetPrice', e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">비고</label>
                                        <textarea
                                            value={formData.rmk}
                                            onChange={(e) => handleChange('rmk', e.target.value)}
                                            rows={2}
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white resize-none"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => {
                                                setFormData({
                                                    symbol: row.symbol || '',
                                                    companyName: row.companyName || '',
                                                    buyDate: row.buyDate || '',
                                                    buyPrice: row.buyPrice || '',
                                                    totalBuyAmount: row.totalBuyAmount || '',
                                                    currentPrice: row.currentPrice || '',
                                                    targetPrice: row.targetPrice || '',
                                                    rmk: row.rmk || '',
                                                });
                                                setIsEditing(false);
                                            }}
                                            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                                        >
                                            취소
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {saving ? '저장 중...' : '저장'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-medium text-slate-900 dark:text-white">상세 정보</h3>
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            수정
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 dark:text-slate-400">매수일</span>
                                            <span className="text-slate-900 dark:text-white font-medium">{formData.buyDate || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 dark:text-slate-400">비고</span>
                                            <span className="text-slate-900 dark:text-white font-medium truncate max-w-[150px]" title={formData.rmk}>
                                                {formData.rmk || '-'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* 기업 프로파일 */}
                    {loadingProfile && (
                        <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-2">
                            기업 정보 로딩 중...
                        </div>
                    )}
                    {companyProfile && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 rounded-lg p-4 border border-blue-100 dark:border-slate-600">
                            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">기업 정보</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                {companyProfile.exchange && (
                                    <div>
                                        <div className="text-slate-500 dark:text-slate-400">거래소</div>
                                        <div className="font-medium text-slate-900 dark:text-white">{companyProfile.exchange}</div>
                                    </div>
                                )}
                                {companyProfile.sector && (
                                    <div>
                                        <div className="text-slate-500 dark:text-slate-400">섹터</div>
                                        <div className="font-medium text-slate-900 dark:text-white">{companyProfile.sector}</div>
                                    </div>
                                )}
                                {companyProfile.marketCap && (
                                    <div>
                                        <div className="text-slate-500 dark:text-slate-400">시가총액</div>
                                        <div className="font-medium text-slate-900 dark:text-white">
                                            ${(companyProfile.marketCap / 1e9).toFixed(2)}B
                                        </div>
                                    </div>
                                )}
                                {companyProfile.beta && (
                                    <div>
                                        <div className="text-slate-500 dark:text-slate-400">베타</div>
                                        <div className="font-medium text-slate-900 dark:text-white">{companyProfile.beta.toFixed(2)}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 푸터 */}
                <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/80">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-white transition-colors dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                    >
                        닫기
                    </button>
                    <button
                        onClick={handleAnalyzeClick}
                        disabled={!formData.symbol}
                        className="px-5 py-2 text-sm bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        기업가치 분석
                    </button>
                </div>
            </div>
        </div>
    );
}
