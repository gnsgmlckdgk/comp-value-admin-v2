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

    // 쿨타임 상태 (타임스탬프)
    const [cooldowns, setCooldowns] = useState({
        buy: 0,
        sell: 0,
        stop: 0
    });
    
    // 남은 시간 상태 (초)
    const [remainingTimes, setRemainingTimes] = useState({
        buy: 0,
        sell: 0,
        stop: 0
    });

    // 쿨타임 타이머
    useEffect(() => {
        const timer = setInterval(() => {
            const now = Date.now();
            setRemainingTimes({
                buy: Math.max(0, Math.ceil((cooldowns.buy - now) / 1000)),
                sell: Math.max(0, Math.ceil((cooldowns.sell - now) / 1000)),
                stop: Math.max(0, Math.ceil((cooldowns.stop - now) / 1000))
            });
        }, 100); // 0.1초마다 갱신하여 반응성 향상

        return () => clearInterval(timer);
    }, [cooldowns]);

    // 매수 프로세스 수동 실행
    const handleManualBuy = async () => {
        if (Date.now() < cooldowns.buy) return;

        // 쿨타임 설정 (10초)
        setCooldowns(prev => ({ ...prev, buy: Date.now() + 10000 }));
        
        try {
            const { data, error } = await send('/dart/api/cointrade/trade/buy/start', {}, 'GET');
            if (error) {
                setToast('매수 프로세스 실행 실패: ' + error);
            } else if (data?.success) {
                setToast(data.response?.message || '매수 프로세스가 시작되었습니다.');
            } else {
                setToast(data?.message || '실행에 실패했습니다.');
            }
        } catch (e) {
            console.error(e);
            setToast('요청 처리 중 오류가 발생했습니다.');
        }
    };

    // 매도 프로세스 수동 실행
    const handleManualSell = async () => {
        if (Date.now() < cooldowns.sell) return;

        // 쿨타임 설정 (10초)
        setCooldowns(prev => ({ ...prev, sell: Date.now() + 10000 }));

        try {
            const { data, error } = await send('/dart/api/cointrade/trade/sell/start', {}, 'GET');
            if (error) {
                setToast('매도 프로세스 실행 실패: ' + error);
            } else if (data?.success) {
                setToast(data.response?.message || '매도 프로세스가 시작되었습니다.');
            } else {
                setToast(data?.message || '실행에 실패했습니다.');
            }
        } catch (e) {
            console.error(e);
            setToast('요청 처리 중 오류가 발생했습니다.');
        }
    };

    // 프로세스 강제 중단
    const handleForceStop = async () => {
        if (Date.now() < cooldowns.stop) return;

        // 쿨타임 설정 (10초)
        setCooldowns(prev => ({ ...prev, stop: Date.now() + 10000 }));

        try {
            const { data, error } = await send('/dart/api/cointrade/trade/stop', {}, 'GET');
            if (error) {
                setToast('중단 요청 실패: ' + error);
            } else if (data?.success) {
                setToast(data.response?.message || '중단 요청이 접수되었습니다.');
            } else {
                setToast(data?.message || '요청에 실패했습니다.');
            }
        } catch (e) {
            console.error(e);
            setToast('요청 처리 중 오류가 발생했습니다.');
        }
    };

    // 다음 실행 시간 포맷
    // const formatNextRun = (nextRun) => {
    //     if (!nextRun) return '-';
    //     const date = new Date(nextRun);
    //     const now = new Date();
    //     const diff = date - now;

    //     if (diff < 0) return '곧 실행 예정';

    //     const hours = Math.floor(diff / (1000 * 60 * 60));
    //     const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    //     return `${hours}시간 ${minutes}분 후`;
    // };

    const formatNextRun = (nextRun) => {
        if (!nextRun) return '-';

        // v2.1 변경: 백엔드에서 포맷팅된 메시지(display_message)를 포함한 객체를 반환함
        if (nextRun.display_message) {
            return nextRun.display_message;
        }

        // 기존 로직 (문자열인 경우)
        if (typeof nextRun === 'string') {
            const date = new Date(nextRun);
            const now = new Date(
                new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })
            );
            const diff = date - now;

            // 절대 시간 (시:분) 계산
            const HH = String(date.getHours()).padStart(2, '0');
            const mm = String(date.getMinutes()).padStart(2, '0');
            const absoluteTime = `${HH}:${mm}`;

            if (diff < 0) return `곧 실행 예정 (${absoluteTime})`;

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            // 결과: "2시간 15분 후 (18:00)" 형태
            return `${hours}시간 ${minutes}분 후 (${absoluteTime})`;
        }

        return '-';
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

            {/* 프로세스 수동 제어 (v2.2 추가) */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
                    프로세스 수동 제어
                </h2>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-md p-3 mb-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>
                            <strong>주의:</strong> 스케줄러 설정과 무관하게 프로세스를 즉시 실행하거나 중단합니다.<br />
                            매수/매도 프로세스는 시스템 자원을 많이 사용할 수 있으므로 필요한 경우에만 실행해주세요.<br />
                            강제 중단 시 현재 진행 중인 작업이 완료된 후 종료됩니다.
                        </span>
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Button 
                        onClick={handleManualBuy} 
                        disabled={remainingTimes.buy > 0}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
                    >
                        {remainingTimes.buy > 0 ? `대기 (${remainingTimes.buy}s)` : '매수 프로세스 실행'}
                    </Button>

                    <Button 
                        onClick={handleManualSell} 
                        disabled={remainingTimes.sell > 0}
                        className="bg-amber-600 hover:bg-amber-700 text-white min-w-[140px]"
                    >
                        {remainingTimes.sell > 0 ? `대기 (${remainingTimes.sell}s)` : '매도 프로세스 실행'}
                    </Button>

                    <Button 
                        onClick={handleForceStop} 
                        disabled={remainingTimes.stop > 0}
                        variant="danger"
                        className="min-w-[140px]"
                    >
                        {remainingTimes.stop > 0 ? `대기 (${remainingTimes.stop}s)` : '강제 중단'}
                    </Button>
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
