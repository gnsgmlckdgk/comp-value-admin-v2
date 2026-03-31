import { useState, useEffect, useCallback, useRef } from 'react';
import { send } from '@/util/ClientUtil';
import Toast from '@/component/common/display/Toast';
import PageTitle from '@/component/common/display/PageTitle';
import Button from '@/component/common/button/Button';

// 숫자를 천 단위 콤마 포맷으로 변환
const formatNumberWithComma = (value) => {
    if (value === null || value === '' || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    return num.toLocaleString('en-US');
};

// 토글 버튼 — 컴포넌트 외부 정의 (인라인이면 re-render마다 DOM 재생성되어 클릭 씹힘)
const ToggleSwitch = ({ enabled, onClick, loading }) => (
    <button
        onClick={onClick}
        disabled={loading}
        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            enabled
                ? 'bg-blue-500 focus:ring-blue-500'
                : 'bg-slate-300 dark:bg-slate-600 focus:ring-slate-400'
        } ${loading ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
    >
        <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-8' : 'translate-x-1'
            } ${loading ? 'animate-pulse' : ''}`}
        />
    </button>
);

/**
 * 코인 자동매매 스케줄러 관리 페이지
 * v3.1 - 토글 race condition 수정, 로딩 인디케이터 추가
 */
export default function CointradeScheduler() {
    const [toast, setToast] = useState(null);
    const [status, setStatus] = useState({
        scannerEnabled: false,
        sellEnabled: false,
        paperTrading: false,
        holdings: [],
        totalInvestment: 0,
        totalValuation: 0,
        totalProfitRate: 0,
    });

    // fetchStatus가 stale 데이터로 덮어쓰는 것을 방지하는 버전 카운터
    // 토글할 때마다 증가 → 실행 중이던 fetchStatus는 자기가 시작할 때 캡처한 버전과 현재 버전이 다르면 setStatus 스킵
    const statusVersionRef = useRef(0);
    // 어떤 토글이 처리 중인지 추적 (key: stateKey, 스피너 표시용)
    const [togglingKey, setTogglingKey] = useState(null);
    // 쿨타임 상태 (타임스탬프)
    const [cooldowns, setCooldowns] = useState({ buy: 0, sell: 0, stop: 0 });
    // 남은 시간 상태 (초)
    const [remainingTimes, setRemainingTimes] = useState({ buy: 0, sell: 0, stop: 0 });

    // Toast auto-hide
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }, [toast]);

    // 상태 조회 함수
    const fetchStatus = useCallback(async () => {
        const myVersion = statusVersionRef.current;
        try {
            // 1. Config에서 SCANNER_ENABLED, SELL_ENABLED, PAPER_TRADING 읽기
            let scannerEnabled = false;
            let sellEnabled = false;
            let paperTrading = false;

            const configResponse = await send('/dart/api/cointrade/config', {}, 'GET');
            if (configResponse.data?.success && configResponse.data?.response) {
                const configMap = {};
                configResponse.data.response.forEach(config => {
                    const key = config.configKey || config.paramName;
                    const value = config.configValue || config.paramValue;
                    configMap[key] = value;
                });
                scannerEnabled = configMap.SCANNER_ENABLED === 'true';
                sellEnabled = configMap.SELL_ENABLED === 'true';
                paperTrading = configMap.PAPER_TRADING === 'true';
            }

            // 2. 보유 종목 조회
            const holdingsResponse = await send('/dart/api/cointrade/holdings', {}, 'GET');
            let holdings = [];
            if (holdingsResponse.data?.success && holdingsResponse.data?.response) {
                holdings = holdingsResponse.data.response;
            }

            let totalInvestment = 0;
            let totalValuation = 0;
            let totalProfitRate = 0;

            // 3. 보유 종목이 있는 경우 현재가 조회하여 평가금액 갱신
            if (holdings.length > 0) {
                try {
                    const marketCodes = holdings.map(h => h.coinCode).join(',');
                    const tickerResponse = await send(`/dart/api/upbit/v1/ticker?markets=${marketCodes}`, {}, 'GET');

                    if (tickerResponse.data?.success && tickerResponse.data?.response) {
                        const tickerMap = {};
                        tickerResponse.data.response.forEach(ticker => {
                            tickerMap[ticker.market] = ticker.trade_price;
                        });

                        holdings = holdings.map(holding => {
                            const currentPrice = tickerMap[holding.coinCode] || holding.currentPrice;
                            const valuation = currentPrice ? currentPrice * holding.quantity : (holding.totalAmount || 0);
                            totalInvestment += (holding.totalAmount || 0);
                            totalValuation += valuation;
                            return { ...holding, currentPrice };
                        });

                        totalProfitRate = totalInvestment > 0
                            ? ((totalValuation - totalInvestment) / totalInvestment) * 100
                            : 0;
                    } else {
                        holdings.forEach(holding => {
                            totalInvestment += (holding.totalAmount || 0);
                            const valuation = holding.currentPrice ? holding.currentPrice * holding.quantity : (holding.totalAmount || 0);
                            totalValuation += valuation;
                        });
                        totalProfitRate = totalInvestment > 0
                            ? ((totalValuation - totalInvestment) / totalInvestment) * 100
                            : 0;
                    }
                } catch (tickerError) {
                    console.error('현재가 조회 실패:', tickerError);
                }
            }

            // 실행 도중 토글이 발생했으면 stale 데이터로 덮어쓰지 않음
            if (myVersion !== statusVersionRef.current) return;

            setStatus({
                scannerEnabled,
                sellEnabled,
                paperTrading,
                holdings,
                totalInvestment,
                totalValuation,
                totalProfitRate,
            });
        } catch (e) {
            console.error('상태 조회 오류:', e);
        }
    }, []);

    // 페이지 로드 시 + 15초마다 자동 새로고침
    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 15000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    // 쿨타임 타이머 (값이 바뀔 때만 re-render)
    useEffect(() => {
        const hasCooldown = cooldowns.buy > 0 || cooldowns.sell > 0 || cooldowns.stop > 0;
        if (!hasCooldown) return;
        const timer = setInterval(() => {
            const now = Date.now();
            const next = {
                buy: Math.max(0, Math.ceil((cooldowns.buy - now) / 1000)),
                sell: Math.max(0, Math.ceil((cooldowns.sell - now) / 1000)),
                stop: Math.max(0, Math.ceil((cooldowns.stop - now) / 1000)),
            };
            setRemainingTimes(prev => {
                if (prev.buy === next.buy && prev.sell === next.sell && prev.stop === next.stop) return prev;
                return next;
            });
        }, 200);
        return () => clearInterval(timer);
    }, [cooldowns]);

    // Config API를 통한 토글 핸들러 — 항상 즉시 반응, fetchStatus와 충돌 없음
    const handleConfigToggle = async (paramName, currentValue, label) => {
        if (togglingKey) return; // 다른 토글 처리 중이면 스킵
        const stateKey = paramName === 'SCANNER_ENABLED' ? 'scannerEnabled'
            : paramName === 'SELL_ENABLED' ? 'sellEnabled' : 'paperTrading';
        const newValue = !currentValue;

        // 실행 중인 fetchStatus의 stale 데이터 무효화
        statusVersionRef.current++;
        setTogglingKey(stateKey);

        try {
            // UI 즉시 반영 (낙관적 업데이트)
            setStatus(prev => ({ ...prev, [stateKey]: newValue }));

            const configList = [{ configKey: paramName, configValue: String(newValue) }];
            const { data, error } = await send('/dart/api/cointrade/config', configList, 'PUT');
            if (error) {
                setStatus(prev => ({ ...prev, [stateKey]: currentValue }));
                setToast(`${label} 설정 실패: ${error}`);
            } else if (data?.success) {
                setToast(`${label}${newValue ? ' 활성화' : ' 비활성화'}`);
            } else {
                setStatus(prev => ({ ...prev, [stateKey]: currentValue }));
                setToast(data?.message || '설정 변경에 실패했습니다.');
            }
        } catch (e) {
            setStatus(prev => ({ ...prev, [stateKey]: currentValue }));
            setToast(`${label} 설정 중 오류가 발생했습니다.`);
        } finally {
            setTogglingKey(null);
        }
    };

    const handleScannerToggle = () => handleConfigToggle('SCANNER_ENABLED', status.scannerEnabled, '스캐너');
    const handleSellToggle = () => handleConfigToggle('SELL_ENABLED', status.sellEnabled, '매도');
    // 페이퍼 트레이딩은 별도 페이지에서 관리

    // 매수 프로세스 수동 실행
    const handleManualBuy = async () => {
        if (Date.now() < cooldowns.buy) return;
        setCooldowns(prev => ({ ...prev, buy: Date.now() + 10000 }));
        try {
            const { data, error } = await send('/dart/api/cointrade/trade/buy/start', {}, 'POST');
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
        setCooldowns(prev => ({ ...prev, sell: Date.now() + 10000 }));
        try {
            const { data, error } = await send('/dart/api/cointrade/trade/sell/start', {}, 'POST');
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
        setCooldowns(prev => ({ ...prev, stop: Date.now() + 10000 }));
        try {
            const { data, error } = await send('/dart/api/cointrade/trade/stop', {}, 'POST');
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

    // 보유종목의 남은 보유시간 계산 (분)
    const getHoldingRemainingMinutes = (holding) => {
        if (!holding.buyDate) return null;
        const buyTime = new Date(holding.buyDate).getTime();
        const now = Date.now();
        const elapsedMinutes = (now - buyTime) / (1000 * 60);
        const maxHold = holding.maxHoldMinutes || 60;
        return Math.max(0, Math.round(maxHold - elapsedMinutes));
    };

    return (
        <div className="p-2 md:p-4">
            <PageTitle>스케줄러 관리</PageTitle>

            {/* 토글 제어 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* 스캐너/매수 토글 */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">스캐너 / 매수</h2>
                            <span className={`text-xs font-medium ${
                                status.scannerEnabled
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-slate-500 dark:text-slate-400'
                            }`}>
                                {togglingKey === 'scannerEnabled' ? '처리 중...' : status.scannerEnabled ? '활성' : '비활성'}
                            </span>
                        </div>
                        <ToggleSwitch enabled={status.scannerEnabled} onClick={handleScannerToggle} loading={togglingKey === 'scannerEnabled'} />
                    </div>
                </div>

                {/* 매도 토글 */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">매도</h2>
                            <span className={`text-xs font-medium ${
                                status.sellEnabled
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-slate-500 dark:text-slate-400'
                            }`}>
                                {togglingKey === 'sellEnabled' ? '처리 중...' : status.sellEnabled ? '활성' : '비활성'}
                            </span>
                        </div>
                        <ToggleSwitch enabled={status.sellEnabled} onClick={handleSellToggle} loading={togglingKey === 'sellEnabled'} />
                    </div>
                </div>

                {/* 페이퍼 트레이딩은 별도 페이지에서 관리 */}
            </div>

            {/* 요약 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">보유 종목 수</div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                        {status.holdings.length}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">총 투자금액</div>
                    <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                        {formatNumberWithComma(Math.floor(status.totalInvestment))}원
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">총 평가금액</div>
                    <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                        {formatNumberWithComma(Math.floor(status.totalValuation))}원
                    </div>
                    {status.totalInvestment > 0 && (() => {
                        const diff = Math.floor(status.totalValuation - status.totalInvestment);
                        const isPositive = diff >= 0;
                        return (
                            <div className={`text-xs font-medium mt-1 ${isPositive ? 'text-blue-500 dark:text-blue-400' : 'text-orange-500 dark:text-orange-400'}`}>
                                {isPositive ? '+' : ''}{formatNumberWithComma(diff)}원
                            </div>
                        );
                    })()}
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">총 수익률</div>
                    <div className={`text-2xl font-bold ${
                        status.totalProfitRate >= 0
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-orange-600 dark:text-orange-400'
                    }`}>
                        {status.totalProfitRate >= 0 ? '+' : ''}
                        {status.totalProfitRate.toFixed(2)}%
                    </div>
                </div>
            </div>

            {/* 보유종목 테이블 */}
            {status.holdings.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 mb-6 overflow-x-auto">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">보유 종목</h2>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                                <th className="text-left p-3 font-medium">종목</th>
                                <th className="text-right p-3 font-medium">매수가</th>
                                <th className="text-right p-3 font-medium">현재가</th>
                                <th className="text-right p-3 font-medium">수익률</th>
                                <th className="text-right p-3 font-medium">남은시간</th>
                            </tr>
                        </thead>
                        <tbody>
                            {status.holdings.map((holding, idx) => {
                                const avgPrice = holding.totalAmount && holding.quantity
                                    ? holding.totalAmount / holding.quantity
                                    : 0;
                                const profitRate = avgPrice > 0 && holding.currentPrice
                                    ? ((holding.currentPrice - avgPrice) / avgPrice) * 100
                                    : 0;
                                const remainingMin = getHoldingRemainingMinutes(holding);
                                const isPositive = profitRate >= 0;

                                return (
                                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                                            {holding.coinCode?.replace('KRW-', '') || '-'}
                                        </td>
                                        <td className="p-3 text-right text-slate-700 dark:text-slate-300">
                                            {formatNumberWithComma(Math.floor(avgPrice))}
                                        </td>
                                        <td className="p-3 text-right text-slate-700 dark:text-slate-300">
                                            {formatNumberWithComma(Math.floor(holding.currentPrice || 0))}
                                        </td>
                                        <td className={`p-3 text-right font-medium ${isPositive ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                            {isPositive ? '+' : ''}{profitRate.toFixed(2)}%
                                        </td>
                                        <td className="p-3 text-right text-slate-600 dark:text-slate-400">
                                            {remainingMin !== null ? `${remainingMin}분` : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 액션 버튼 */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-3">
                    수동 제어
                </h2>
                <div className="flex flex-wrap gap-3">
                    <Button
                        onClick={handleManualBuy}
                        disabled={remainingTimes.buy > 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
                    >
                        {remainingTimes.buy > 0 ? `대기 (${remainingTimes.buy}s)` : '수동 스캔+매수'}
                    </Button>

                    <Button
                        onClick={handleManualSell}
                        disabled={remainingTimes.sell > 0}
                        className="bg-amber-600 hover:bg-amber-700 text-white min-w-[140px]"
                    >
                        {remainingTimes.sell > 0 ? `대기 (${remainingTimes.sell}s)` : '수동 매도 체크'}
                    </Button>

                    <Button
                        onClick={handleForceStop}
                        disabled={remainingTimes.stop > 0}
                        variant="danger"
                        className="min-w-[140px]"
                    >
                        {remainingTimes.stop > 0 ? `대기 (${remainingTimes.stop}s)` : '비상 정지'}
                    </Button>
                </div>

                {/* 자동 새로고침 안내 */}
                <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                    15초마다 자동 갱신
                </div>
            </div>

            {/* Toast 메시지 */}
            <Toast message={toast} />
        </div>
    );
}
