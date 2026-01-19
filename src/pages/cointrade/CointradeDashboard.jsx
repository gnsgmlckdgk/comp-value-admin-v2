import { useState, useEffect, useCallback } from 'react';
import { send } from '@/util/ClientUtil';
import PageTitle from '@/component/common/display/PageTitle';
import Button from '@/component/common/button/Button';

/**
 * 코인 자동매매 대시보드 (v2.1)
 */
export default function CointradeDashboard() {
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // 상태 정보
    const [status, setStatus] = useState({
        buySchedulerEnabled: false,
        sellSchedulerEnabled: false,
        totalInvestment: 0,
        totalValuation: 0,
        totalProfitRate: 0,
        holdingsCount: 0
    });

    // 보유 종목
    const [holdings, setHoldings] = useState([]);

    // 최근 거래 내역
    const [recentTrades, setRecentTrades] = useState([]);

    // 예측 성능 요약
    const [performance, setPerformance] = useState({
        takeProfitRate: 0,
        stopLossRate: 0,
        expiredRate: 0,
        avgProfitRate: 0,
        totalTrades: 0
    });

    // Toast auto-hide
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }, [toast]);

    // 데이터 조회
    const fetchData = useCallback(async () => {
        try {
            // 1. 상태 조회
            const statusResponse = await send('/dart/api/cointrade/status', {}, 'GET');
            if (statusResponse.data?.success && statusResponse.data?.response) {
                const resp = statusResponse.data.response;
                setStatus({
                    buySchedulerEnabled: resp.buySchedulerEnabled || false,
                    sellSchedulerEnabled: resp.sellSchedulerEnabled || false,
                    totalInvestment: resp.totalInvestment || 0,
                    totalValuation: resp.totalValuation || 0,
                    totalProfitRate: resp.totalProfitRate || 0,
                    holdingsCount: resp.holdings?.length || 0
                });
            }

            // 2. 보유 종목 조회
            const holdingsResponse = await send('/dart/api/cointrade/holdings', {}, 'GET');
            if (holdingsResponse.data?.success && holdingsResponse.data?.response) {
                setHoldings(holdingsResponse.data.response);
            }

            // 3. 최근 거래 내역 조회 (10건)
            const today = new Date();
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);

            // 날짜와 시간 조립 (ISO 8601 형식)
            const startDateTime = `${thirtyDaysAgo.toISOString().split('T')[0]}T00:00:00`;
            const endDateTime = `${today.toISOString().split('T')[0]}T23:59:59`;

            const historyResponse = await send(
                `/dart/api/cointrade/history?startDate=${startDateTime}&endDate=${endDateTime}`,
                {},
                'GET'
            );
            if (historyResponse.data?.success && historyResponse.data?.response) {
                const allTrades = historyResponse.data.response;
                setRecentTrades(allTrades.slice(0, 10)); // 최근 10건

                // 예측 성능 계산
                calculatePerformance(allTrades);
            }
        } catch (e) {
            console.error('데이터 조회 실패:', e);
        }
    }, []);

    // 예측 성능 계산
    const calculatePerformance = (trades) => {
        const sellTrades = trades.filter(t => t.tradeType === 'SELL');
        const totalSells = sellTrades.length;

        if (totalSells === 0) {
            setPerformance({
                takeProfitRate: 0,
                stopLossRate: 0,
                expiredRate: 0,
                avgProfitRate: 0,
                totalTrades: 0
            });
            return;
        }

        const takeProfitCount = sellTrades.filter(t => t.reason === 'TAKE_PROFIT').length;
        const stopLossCount = sellTrades.filter(t => t.reason === 'STOP_LOSS').length;
        const expiredCount = sellTrades.filter(t => t.reason === 'EXPIRED').length;

        const totalProfit = sellTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
        const totalAmount = sellTrades.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
        const avgProfitRate = totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0;

        setPerformance({
            takeProfitRate: (takeProfitCount / totalSells) * 100,
            stopLossRate: (stopLossCount / totalSells) * 100,
            expiredRate: (expiredCount / totalSells) * 100,
            avgProfitRate,
            totalTrades: totalSells
        });
    };

    // 페이지 로드 시 + 30초마다 자동 새로고침
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // 30초
        return () => clearInterval(interval);
    }, [fetchData]);

    // 수동 새로고침
    const handleRefresh = () => {
        setLoading(true);
        fetchData().finally(() => {
            setLoading(false);
            setToast('데이터가 갱신되었습니다.');
        });
    };

    // D-day 계산
    const calculateDday = (date) => {
        if (!date) return '-';
        const targetDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);
        const diff = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

        if (diff < 0) return <span className="text-red-600 dark:text-red-400 font-bold">만료</span>;
        if (diff === 0) return <span className="text-red-600 dark:text-red-400 font-bold">D-Day</span>;
        if (diff <= 3) return <span className="text-orange-600 dark:text-orange-400 font-medium">D-{diff}</span>;
        return <span className="text-slate-600 dark:text-slate-400">D-{diff}</span>;
    };

    // 사유 색상
    const getReasonColor = (reason) => {
        const colors = {
            'SIGNAL': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
            'TAKE_PROFIT': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
            'STOP_LOSS': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
            'EXPIRED': 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
        };
        return colors[reason] || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400';
    };

    // 사유 라벨
    const getReasonLabel = (reason) => {
        const labels = {
            'SIGNAL': '매수',
            'TAKE_PROFIT': '익절',
            'STOP_LOSS': '손절',
            'EXPIRED': '만료'
        };
        return labels[reason] || reason;
    };

    return (
        <div className="container mx-auto max-w-7xl p-4">
            <div className="flex items-center justify-between mb-6">
                <PageTitle>자동매매 대시보드</PageTitle>
                <Button onClick={handleRefresh} disabled={loading} className="px-4 py-2">
                    {loading ? '갱신 중...' : '새로고침'}
                </Button>
            </div>

            {/* 상단 카드 영역 */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                {/* 스케줄러 상태 */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">스케줄러 상태</div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600 dark:text-slate-400">매수</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                status.buySchedulerEnabled
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}>
                                {status.buySchedulerEnabled ? 'ON' : 'OFF'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600 dark:text-slate-400">매도</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                status.sellSchedulerEnabled
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}>
                                {status.sellSchedulerEnabled ? 'ON' : 'OFF'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 보유 종목 수 */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">보유 종목 수</div>
                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-200">
                        {status.holdingsCount}
                    </div>
                </div>

                {/* 총 투자금액 */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">총 투자금액</div>
                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                        {(status.totalInvestment / 10000).toFixed(0)}만원
                    </div>
                </div>

                {/* 총 평가금액 */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">총 평가금액</div>
                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                        {(status.totalValuation / 10000).toFixed(0)}만원
                    </div>
                </div>

                {/* 총 수익률 */}
                <div className={`rounded-lg shadow-sm border p-4 ${
                    status.totalProfitRate >= 0
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'
                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'
                }`}>
                    <div className={`text-xs mb-1 ${
                        status.totalProfitRate >= 0
                            ? 'text-red-700 dark:text-red-400'
                            : 'text-blue-700 dark:text-blue-400'
                    }`}>
                        총 수익률
                    </div>
                    <div className={`text-3xl font-bold ${
                        status.totalProfitRate >= 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-blue-600 dark:text-blue-400'
                    }`}>
                        {status.totalProfitRate >= 0 ? '+' : ''}{status.totalProfitRate.toFixed(2)}%
                    </div>
                </div>
            </div>

            {/* 보유 종목 테이블 */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                        보유 종목 ({holdings.length})
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">종목</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">매수가</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">현재가</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">수량</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">평가금액</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">수익률</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">급등확률</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">급등예상일</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">만료일</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">매수점수</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">매수일</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {holdings.length === 0 ? (
                                <tr>
                                    <td colSpan="11" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                        보유 종목이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                holdings.map((holding, index) => {
                                    const profitRate = holding.currentPrice
                                        ? ((holding.currentPrice - holding.buyPrice) / holding.buyPrice * 100)
                                        : 0;
                                    const valuation = holding.currentPrice
                                        ? holding.currentPrice * holding.quantity
                                        : holding.totalAmount;

                                    // 만료 임박 여부 (3일 이내)
                                    const isExpiring = holding.expireDate &&
                                        (new Date(holding.expireDate) - new Date()) / (1000 * 60 * 60 * 24) <= 3;

                                    return (
                                        <tr
                                            key={index}
                                            className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                                                isExpiring ? 'bg-orange-50 dark:bg-orange-900/10' : ''
                                            }`}
                                        >
                                            {/* 종목 */}
                                            <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                                                {holding.coinCode}
                                            </td>

                                            {/* 매수가 */}
                                            <td className="px-4 py-3 text-sm text-right text-slate-900 dark:text-slate-100">
                                                {holding.buyPrice.toLocaleString()}원
                                            </td>

                                            {/* 현재가 */}
                                            <td className="px-4 py-3 text-sm text-right font-medium text-slate-900 dark:text-slate-100">
                                                {holding.currentPrice ? `${holding.currentPrice.toLocaleString()}원` : '-'}
                                            </td>

                                            {/* 수량 */}
                                            <td className="px-4 py-3 text-sm text-right text-slate-900 dark:text-slate-100">
                                                {holding.quantity.toFixed(8)}
                                            </td>

                                            {/* 평가금액 */}
                                            <td className="px-4 py-3 text-sm text-right font-medium text-slate-900 dark:text-slate-100">
                                                {valuation.toLocaleString()}원
                                            </td>

                                            {/* 수익률 */}
                                            <td className="px-4 py-3 text-sm text-right">
                                                <span className={`font-bold ${
                                                    profitRate >= 0
                                                        ? 'text-red-600 dark:text-red-400'
                                                        : 'text-blue-600 dark:text-blue-400'
                                                }`}>
                                                    {profitRate >= 0 ? '+' : ''}{profitRate.toFixed(2)}%
                                                </span>
                                            </td>

                                            {/* 급등확률 (프로그레스바) */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                                                        <div
                                                            className="bg-purple-500 dark:bg-purple-400 h-2 rounded-full"
                                                            style={{ width: `${(holding.surgeProbability || 0) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400 w-10 text-right">
                                                        {((holding.surgeProbability || 0) * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                            </td>

                                            {/* 급등예상일 */}
                                            <td className="px-4 py-3 text-sm text-center text-slate-900 dark:text-slate-100">
                                                {holding.surgeDay ? `D+${holding.surgeDay}` : '-'}
                                            </td>

                                            {/* 만료일 */}
                                            <td className="px-4 py-3 text-sm text-center">
                                                {calculateDday(holding.expireDate)}
                                            </td>

                                            {/* 매수점수 */}
                                            <td className="px-4 py-3 text-sm text-right text-slate-700 dark:text-slate-300">
                                                {holding.buyScore ? `${holding.buyScore.toFixed(2)}점` : '-'}
                                            </td>

                                            {/* 매수일 */}
                                            <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                                {new Date(holding.buyDate).toLocaleDateString('ko-KR', {
                                                    month: '2-digit',
                                                    day: '2-digit'
                                                })}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 최근 거래 내역 */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                            최근 거래 내역 (10건)
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300">일시</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300">종목</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 dark:text-slate-300">유형</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 dark:text-slate-300">사유</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300">손익률</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {recentTrades.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                            최근 거래 내역이 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    recentTrades.map((trade, index) => (
                                        <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <td className="px-4 py-2 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                {new Date(trade.createdAt).toLocaleString('ko-KR', {
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="px-4 py-2 text-xs font-medium text-slate-900 dark:text-slate-100">
                                                {trade.coinCode}
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    trade.tradeType === 'BUY'
                                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                                }`}>
                                                    {trade.tradeType === 'BUY' ? '매수' : '매도'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                {trade.reason && (
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getReasonColor(trade.reason)}`}>
                                                        {getReasonLabel(trade.reason)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-xs text-right">
                                                {trade.profitLossRate != null ? (
                                                    <span className={trade.profitLossRate >= 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-blue-600 dark:text-blue-400 font-medium'}>
                                                        {trade.profitLossRate >= 0 ? '+' : ''}{trade.profitLossRate.toFixed(2)}%
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 dark:text-slate-500">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 예측 성능 요약 */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                        예측 성능 요약 (최근 30일)
                    </h2>

                    <div className="space-y-4">
                        {/* 총 거래 건수 */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <span className="text-sm text-slate-600 dark:text-slate-400">총 매도 건수</span>
                            <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                {performance.totalTrades}건
                            </span>
                        </div>

                        {/* 익절 성공률 */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-600 dark:text-slate-400">익절 성공률</span>
                                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                    {performance.takeProfitRate.toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                                <div
                                    className="bg-green-500 dark:bg-green-400 h-2 rounded-full"
                                    style={{ width: `${performance.takeProfitRate}%` }}
                                />
                            </div>
                        </div>

                        {/* 손절률 */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-600 dark:text-slate-400">손절률</span>
                                <span className="text-sm font-bold text-red-600 dark:text-red-400">
                                    {performance.stopLossRate.toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                                <div
                                    className="bg-red-500 dark:bg-red-400 h-2 rounded-full"
                                    style={{ width: `${performance.stopLossRate}%` }}
                                />
                            </div>
                        </div>

                        {/* 만료 매도율 */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-600 dark:text-slate-400">만료 매도율</span>
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                    {performance.expiredRate.toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                                <div
                                    className="bg-slate-500 dark:bg-slate-400 h-2 rounded-full"
                                    style={{ width: `${performance.expiredRate}%` }}
                                />
                            </div>
                        </div>

                        {/* 평균 수익률 */}
                        <div className={`flex items-center justify-between p-4 rounded-lg ${
                            performance.avgProfitRate >= 0
                                ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800'
                                : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800'
                        }`}>
                            <span className={`text-sm font-medium ${
                                performance.avgProfitRate >= 0
                                    ? 'text-red-700 dark:text-red-400'
                                    : 'text-blue-700 dark:text-blue-400'
                            }`}>
                                평균 수익률
                            </span>
                            <span className={`text-2xl font-bold ${
                                performance.avgProfitRate >= 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-blue-600 dark:text-blue-400'
                            }`}>
                                {performance.avgProfitRate >= 0 ? '+' : ''}{performance.avgProfitRate.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 자동 새로고침 안내 */}
            <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
                ⏱️ 30초마다 자동으로 갱신됩니다
            </div>

            {/* Toast 메시지 */}
            {toast && (
                <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
                    <div className="bg-slate-800 dark:bg-slate-700 text-white px-6 py-3 rounded-lg shadow-lg max-w-md">
                        <p className="text-sm whitespace-pre-line">{toast}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
