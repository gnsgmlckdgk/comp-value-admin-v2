import { useState, useEffect, useCallback } from 'react';
import { send } from '@/util/ClientUtil';
import PageTitle from '@/component/common/display/PageTitle';
import Button from '@/component/common/button/Button';

/**
 * 코인 자동매매 스케줄러 관리 페이지
 * v2.1 - 만료 임박, 급등 확률 정보 포함
 */
export default function CointradeScheduler() {
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [status, setStatus] = useState({
        buySchedulerEnabled: false,
        sellSchedulerEnabled: false,
        buyNextRun: null,
        buyCheckHours: 24,
        sellCheckSeconds: 10,
        priceMonitorSeconds: 10,
        holdings: [],
        totalInvestment: 0,
        totalValuation: 0,
        totalProfitRate: 0,
        expiringCount: 0,
        avgSurgeProbability: 0
    });

    // Toast auto-hide
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }, [toast]);

    // 상태 조회 함수
    const fetchStatus = useCallback(async () => {
        try {
            const { data, error } = await send('/dart/api/cointrade/status', {}, 'GET');

            if (error) {
                console.error('상태 조회 실패:', error);
            } else if (data?.success && data?.response) {
                const resp = data.response;
                setStatus({
                    buySchedulerEnabled: resp.buySchedulerEnabled || false,
                    sellSchedulerEnabled: resp.sellSchedulerEnabled || false,
                    buyNextRun: resp.buyNextRun || null,
                    buyCheckHours: resp.buyCheckHours || 24,
                    sellCheckSeconds: resp.sellCheckSeconds || 10,
                    priceMonitorSeconds: resp.priceMonitorSeconds || 10,
                    holdings: resp.holdings || [],
                    totalInvestment: resp.totalInvestment || 0,
                    totalValuation: resp.totalValuation || 0,
                    totalProfitRate: resp.totalProfitRate || 0,
                    expiringCount: resp.expiringCount || 0,
                    avgSurgeProbability: resp.avgSurgeProbability || 0
                });
            }
        } catch (e) {
            console.error('상태 조회 오류:', e);
        }
    }, []);

    // 페이지 로드 시 + 30초마다 자동 새로고침
    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // 30초
        return () => clearInterval(interval);
    }, [fetchStatus]);

    // 매수 스케줄러 토글
    const handleBuySchedulerToggle = async () => {
        const newValue = !status.buySchedulerEnabled;
        setLoading(true);

        try {
            const { data, error } = await send(
                '/dart/api/cointrade/scheduler/buy',
                { enabled: newValue },
                'PUT'
            );

            if (error) {
                setToast('매수 스케줄러 설정 실패: ' + error);
            } else if (data?.success) {
                setToast(`매수 스케줄러가 ${newValue ? '활성화' : '비활성화'} 되었습니다.`);
                await fetchStatus(); // 상태 갱신
            }
        } catch (e) {
            console.error('매수 스케줄러 토글 실패:', e);
            setToast('매수 스케줄러 설정 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 매도 스케줄러 토글
    const handleSellSchedulerToggle = async () => {
        const newValue = !status.sellSchedulerEnabled;
        setLoading(true);

        try {
            const { data, error } = await send(
                '/dart/api/cointrade/scheduler/sell',
                { enabled: newValue },
                'PUT'
            );

            if (error) {
                setToast('매도 스케줄러 설정 실패: ' + error);
            } else if (data?.success) {
                setToast(`매도 스케줄러가 ${newValue ? '활성화' : '비활성화'} 되었습니다.`);
                await fetchStatus(); // 상태 갱신
            }
        } catch (e) {
            console.error('매도 스케줄러 토글 실패:', e);
            setToast('매도 스케줄러 설정 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 수동 새로고침
    const handleRefresh = () => {
        fetchStatus();
        setToast('상태가 갱신되었습니다.');
    };

    // 다음 실행 시간 포맷
    const formatNextRun = (nextRun) => {
        if (!nextRun) return '-';
        const date = new Date(nextRun);
        const now = new Date();
        const diff = date - now;

        if (diff < 0) return '곧 실행 예정';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours}시간 ${minutes}분 후`;
    };

    return (
        <div className="container mx-auto max-w-6xl p-4">
            <PageTitle>스케줄러 관리</PageTitle>

            {/* 스케줄러 제어 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* 매수 스케줄러 */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                            매수 스케줄러
                        </h2>
                        <button
                            onClick={handleBuySchedulerToggle}
                            disabled={loading}
                            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${status.buySchedulerEnabled
                                ? 'bg-green-500 focus:ring-green-500'
                                : 'bg-slate-300 dark:bg-slate-600 focus:ring-slate-400'
                                } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${status.buySchedulerEnabled ? 'translate-x-8' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-400">상태</span>
                            <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${status.buySchedulerEnabled
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                    }`}
                            >
                                {status.buySchedulerEnabled ? '실행 중' : '중지'}
                            </span>
                        </div>

                        {status.buySchedulerEnabled && (
                            <>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">실행 주기</span>
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                        {status.buyCheckHours}시간마다
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">다음 실행</span>
                                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                        {formatNextRun(status.buyNextRun)}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* 매도 스케줄러 */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                            매도 스케줄러
                        </h2>
                        <button
                            onClick={handleSellSchedulerToggle}
                            disabled={loading}
                            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${status.sellSchedulerEnabled
                                ? 'bg-green-500 focus:ring-green-500'
                                : 'bg-slate-300 dark:bg-slate-600 focus:ring-slate-400'
                                } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${status.sellSchedulerEnabled ? 'translate-x-8' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-400">상태</span>
                            <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${status.sellSchedulerEnabled
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                    }`}
                            >
                                {status.sellSchedulerEnabled ? '실행 중' : '중지'}
                            </span>
                        </div>

                        {status.sellSchedulerEnabled && (
                            <>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">매도 체결확인 주기</span>
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                        {status.sellCheckSeconds}초마다
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">가격 모니터링 주기</span>
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                        {status.priceMonitorSeconds}초마다
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* 현재 상태 요약 */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                        현재 상태 요약
                    </h2>
                    <Button
                        onClick={handleRefresh}
                        className="px-4 py-2 text-sm"
                    >
                        새로고침
                    </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {/* 보유 종목 수 */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">보유 종목 수</div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                            {status.holdings.length}
                        </div>
                    </div>

                    {/* 총 투자금액 */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">총 투자금액</div>
                        <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                            {(status.totalInvestment / 10000).toFixed(0)}만원
                        </div>
                    </div>

                    {/* 총 평가금액 */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">총 평가금액</div>
                        <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                            {(status.totalValuation / 10000).toFixed(0)}만원
                        </div>
                    </div>

                    {/* 총 수익률 */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">총 수익률</div>
                        <div
                            className={`text-2xl font-bold ${status.totalProfitRate >= 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-blue-600 dark:text-blue-400'
                                }`}
                        >
                            {status.totalProfitRate >= 0 ? '+' : ''}
                            {status.totalProfitRate.toFixed(2)}%
                        </div>
                    </div>

                    {/* 만료 임박 (v2.1) */}
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800">
                        <div className="text-xs text-orange-700 dark:text-orange-400 mb-1">만료 임박 (3일내)</div>
                        <div className="text-2xl font-bold text-orange-800 dark:text-orange-300">
                            {status.expiringCount}
                        </div>
                    </div>

                    {/* 평균 급등 확률 (v2.1) */}
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
                        <div className="text-xs text-purple-700 dark:text-purple-400 mb-1">평균 급등 확률</div>
                        <div className="text-2xl font-bold text-purple-800 dark:text-purple-300">
                            {(status.avgSurgeProbability * 100).toFixed(0)}%
                        </div>
                    </div>
                </div>

                {/* 자동 새로고침 안내 */}
                <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 text-center">
                    ⏱️ 30초마다 자동으로 갱신됩니다
                </div>
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
