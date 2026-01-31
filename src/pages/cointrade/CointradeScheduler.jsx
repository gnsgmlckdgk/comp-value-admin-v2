import { useState, useEffect, useCallback, useRef } from 'react';
import { send } from '@/util/ClientUtil';
import PageTitle from '@/component/common/display/PageTitle';
import Button from '@/component/common/button/Button';

// 숫자를 천 단위 콤마 포맷으로 변환
const formatNumberWithComma = (value) => {
    if (value === null || value === '' || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    return num.toLocaleString('en-US');
};

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
        avgUpProbability: 0
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
            // 1. 스케줄러 상태 조회
            const statusResponse = await send('/dart/api/cointrade/status', {}, 'GET');
            let schedulerStatus = {};

            if (statusResponse.data?.success && statusResponse.data?.response) {
                schedulerStatus = statusResponse.data.response;
            }

            // 2. 보유 종목 조회 (별도 API 호출)
            const holdingsResponse = await send('/dart/api/cointrade/holdings', {}, 'GET');
            let holdings = [];

            if (holdingsResponse.data?.success && holdingsResponse.data?.response) {
                holdings = holdingsResponse.data.response;
            }

            // 초기값 설정
            let totalInvestment = 0;
            let totalValuation = 0;
            let totalProfitRate = 0;

            // 3. 보유 종목이 있는 경우 현재가 조회하여 평가금액 갱신
            let totalUpProb = 0;
            let probCount = 0;

            if (holdings.length > 0) {
                try {
                    const marketCodes = holdings.map(h => h.coinCode).join(',');
                    const tickerResponse = await send(`/dart/api/upbit/v1/ticker?markets=${marketCodes}`, {}, 'GET');

                    if (tickerResponse.data?.success && tickerResponse.data?.response) {
                        const tickerMap = {};
                        tickerResponse.data.response.forEach(ticker => {
                            tickerMap[ticker.market] = ticker.trade_price;
                        });

                        // 재계산
                        holdings = holdings.map(holding => {
                            const currentPrice = tickerMap[holding.coinCode] || holding.currentPrice;
                            const valuation = currentPrice ? currentPrice * holding.quantity : (holding.totalAmount || 0);

                            totalInvestment += (holding.totalAmount || 0);
                            totalValuation += valuation;

                            // 상승 확률 합계 계산
                            if (holding.upProbability !== undefined && holding.upProbability !== null) {
                                totalUpProb += holding.upProbability;
                                probCount++;
                            }

                            return { ...holding, currentPrice };
                        });

                        totalProfitRate = totalInvestment > 0
                            ? ((totalValuation - totalInvestment) / totalInvestment) * 100
                            : 0;
                    } else {
                        // 티커 조회 실패 시 기존 데이터로 계산
                        holdings.forEach(holding => {
                            totalInvestment += (holding.totalAmount || 0);
                            const valuation = holding.currentPrice ? holding.currentPrice * holding.quantity : (holding.totalAmount || 0);
                            totalValuation += valuation;

                            // 상승 확률 합계 계산
                            if (holding.upProbability !== undefined && holding.upProbability !== null) {
                                totalUpProb += holding.upProbability;
                                probCount++;
                            }
                        });
                    }
                } catch (tickerError) {
                    console.error('현재가 조회 실패:', tickerError);
                }
            }

            // 평균 상승 확률 계산
            const calculatedAvgUpProb = probCount > 0 ? totalUpProb / probCount : 0;

            // 상태 업데이트
            setStatus({
                buySchedulerEnabled: schedulerStatus.buySchedulerEnabled || false,
                sellSchedulerEnabled: schedulerStatus.sellSchedulerEnabled || false,
                buyNextRun: schedulerStatus.buyNextRun || null,
                buyCheckHours: schedulerStatus.buyCheckHours || 24,
                sellCheckSeconds: schedulerStatus.sellCheckSeconds || 10,
                priceMonitorSeconds: schedulerStatus.priceMonitorSeconds || 10,
                holdings: holdings,
                totalInvestment: totalInvestment,
                totalValuation: totalValuation,
                totalProfitRate: totalProfitRate,
                avgUpProbability: calculatedAvgUpProb
            });

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

    // 로그 복사
    const handleCopyLogs = async (logs) => {
        if (!logs || logs.length === 0) {
            setToast('복사할 로그가 없습니다.');
            return;
        }

        try {
            const logText = logs.map(log => `[${log.time}] ${log.message}`).join('\n');
            await navigator.clipboard.writeText(logText);
            setToast('로그가 클립보드에 복사되었습니다.');
        } catch (err) {
            console.error('로그 복사 실패:', err);
            setToast('로그 복사에 실패했습니다.');
        }
    };

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

                // 스케줄러 재로딩 호출
                try {
                    await send('/dart/api/cointrade/scheduler/reload', {}, 'POST');
                } catch (reloadError) {
                    console.error('스케줄러 재로딩 실패:', reloadError);
                }

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

                // 스케줄러 재로딩 호출
                try {
                    await send('/dart/api/cointrade/scheduler/reload', {}, 'POST');
                } catch (reloadError) {
                    console.error('스케줄러 재로딩 실패:', reloadError);
                }

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

    // 매수 프로세스 상태 모니터링
    const [buyProcessStatus, setBuyProcessStatus] = useState({
        status: 'idle',
        percent: 0,
        message: '',
        last_updated: '',
        logs: []
    });
    const [buyProcessLogs, setBuyProcessLogs] = useState([]);
    const buyLogContainerRef = useRef(null);
    const buyLastServerLogsRef = useRef([]);

    // 매도 프로세스 상태 모니터링
    const [sellProcessStatus, setSellProcessStatus] = useState({
        status: 'idle',
        percent: 0,
        message: '',
        last_updated: '',
        logs: []
    });
    const [sellProcessLogs, setSellProcessLogs] = useState([]);
    const sellLogContainerRef = useRef(null);
    const sellLastServerLogsRef = useRef([]);

    // 로그 자동 스크롤
    useEffect(() => {
        if (buyLogContainerRef.current) {
            buyLogContainerRef.current.scrollTop = buyLogContainerRef.current.scrollHeight;
        }
    }, [buyProcessLogs]);

    useEffect(() => {
        if (sellLogContainerRef.current) {
            sellLogContainerRef.current.scrollTop = sellLogContainerRef.current.scrollHeight;
        }
    }, [sellProcessLogs]);

    // 프로세스 상태 폴링 (500ms 간격으로 단축하여 로그 누락 방지)
    useEffect(() => {
        const fetchProcessStatus = async (mode) => {
            try {
                const { data } = await send(`/dart/api/cointrade/log/process/status?mode=${mode}`, {}, 'GET');
                if (data?.success && data?.response) {
                    const resp = data.response;
                    const serverLogs = resp.logs || [];

                    const setStatus = mode === 'buy' ? setBuyProcessStatus : setSellProcessStatus;
                    const setLogs = mode === 'buy' ? setBuyProcessLogs : setSellProcessLogs;
                    const lastServerLogsRef = mode === 'buy' ? buyLastServerLogsRef : sellLastServerLogsRef;

                    // 상태 업데이트
                    setStatus(resp);

                    // 초기화 로직 개선: setState 콜백 사용
                    if (resp.percent === 0 || resp.message?.includes('스케줄러 초기화 완료')) {
                        setLogs(prev => {
                            if (prev.length > 0 && resp.percent === 0) {
                                console.log(`[${mode}] 🔄 로그 초기화: ${prev.length}개 삭제`);
                                lastServerLogsRef.current = [];
                                return [];
                            }
                            return prev;
                        });
                    }

                    // 로그 처리 (개선된 로직)
                    const prevServerLogs = lastServerLogsRef.current;

                    // 서버 로그가 변경되었는지 확인
                    if (JSON.stringify(prevServerLogs) === JSON.stringify(serverLogs)) {
                        // 변경 없음 - 스킵
                        return;
                    }

                    console.log(`[${mode}] 로그 변경 감지: prev=${prevServerLogs.length}, server=${serverLogs.length}`);

                    let newLogsToAdd = [];

                    // Case 1: 최초 로그 수신
                    if (prevServerLogs.length === 0 && serverLogs.length > 0) {
                        console.log(`[${mode}] Case 1: 최초 로그 수신 (${serverLogs.length}개)`);
                        newLogsToAdd = serverLogs;
                    }
                    // Case 2: 서버 로그가 늘어난 경우 (정상적인 append)
                    else if (serverLogs.length > prevServerLogs.length) {
                        // 이전 로그가 서버 로그의 앞부분과 일치하는지 확인
                        const isSequential = prevServerLogs.every((log, idx) => log === serverLogs[idx]);

                        if (isSequential) {
                            // 순차적 증가: 새로운 로그만 추가
                            const newCount = serverLogs.length - prevServerLogs.length;
                            console.log(`[${mode}] Case 2-1: 순차 증가 (새 로그 ${newCount}개 추가)`);
                            newLogsToAdd = serverLogs.slice(prevServerLogs.length);
                        } else {
                            console.log(`[${mode}] Case 2-2: 비순차 증가 - 겹치는 부분 찾기 시작`);
                            // 버퍼가 롤링됨: 겹치는 부분 찾기
                            let overlapFound = false;
                            for (let i = Math.max(0, prevServerLogs.length - 100); i < prevServerLogs.length; i++) {
                                const searchText = prevServerLogs[i];
                                const serverIdx = serverLogs.indexOf(searchText);
                                if (serverIdx !== -1 && serverIdx < serverLogs.length - 1) {
                                    // 겹치는 지점 발견: 그 이후만 추가
                                    const newCount = serverLogs.length - serverIdx - 1;
                                    console.log(`[${mode}] 겹침 발견: serverIdx=${serverIdx}, 새 로그 ${newCount}개 추가`);
                                    newLogsToAdd = serverLogs.slice(serverIdx + 1);
                                    overlapFound = true;
                                    break;
                                }
                            }

                            // 겹치는 부분 없음: 전체 교체 (로그 누락 발생했을 가능성)
                            if (!overlapFound) {
                                console.warn(`[${mode}] ⚠️ 로그 누락 감지: 서버 버퍼 롤오버 - 전체 교체 (${serverLogs.length}개)`);
                                newLogsToAdd = serverLogs;
                            }
                        }
                    }
                    // Case 3: 서버 로그가 줄어든 경우 (리셋)
                    else if (serverLogs.length < prevServerLogs.length) {
                        console.log(`[${mode}] Case 3: 서버 로그 감소 (리셋) - 전체 교체 (${serverLogs.length}개)`);
                        newLogsToAdd = serverLogs;
                    }

                    if (newLogsToAdd.length > 0) {
                        const timeStr = new Date().toLocaleTimeString('ko-KR', { hour12: false });
                        const formattedLogs = newLogsToAdd.map(msg => ({
                            time: timeStr,
                            message: msg
                        }));

                        console.log(`[${mode}] 프론트 로그 추가: ${formattedLogs.length}개`);

                        setLogs(prev => {
                            const combined = [...prev, ...formattedLogs];
                            const result = combined.slice(-1000);
                            console.log(`[${mode}] 프론트 총 로그: ${prev.length} → ${result.length}`);
                            return result; // 최대 1000개 유지
                        });
                    } else {
                        console.log(`[${mode}] 추가할 로그 없음`);
                    }

                    lastServerLogsRef.current = serverLogs;
                }
            } catch (e) {
                console.error(`${mode} 프로세스 상태 조회 실패:`, e);
            }
        };

        const interval = setInterval(() => {
            fetchProcessStatus('buy');
            fetchProcessStatus('sell');
        }, 500); // 1000ms -> 500ms로 단축하여 로그 누락 확률 감소

        return () => clearInterval(interval);
    }, []); // 의존성 배열 제거 - 인터벌 재설정 방지 (가장 중요한 수정!)

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

            {/* 프로세스 진행도 (매수/매도 분리) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* 매수 프로세스 진행도 */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                            매수 프로세스 진행도
                        </h2>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${buyProcessStatus.status === 'running' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 animate-pulse' :
                            buyProcessStatus.status === 'finished' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                            }`}>
                            {buyProcessStatus.status}
                        </span>
                    </div>

                    <div className={`space-y-4 ${buyProcessStatus.status === 'idle' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        {/* 프로그레스 바 */}
                        <div className="relative pt-1">
                            <div className="flex mb-2 items-center justify-between">
                                <div>
                                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200 dark:bg-blue-900 dark:text-blue-200">
                                        Progress
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-semibold inline-block text-blue-600 dark:text-blue-400">
                                        {buyProcessStatus.percent.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200 dark:bg-blue-900/50">
                                <div
                                    style={{ width: `${buyProcessStatus.percent}%` }}
                                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500 ease-out"
                                ></div>
                            </div>
                        </div>

                        {/* 로그 창 */}
                        <div className="relative">
                            <div className="absolute top-2 right-4 flex items-center gap-2 z-10">
                                <span className="text-[10px] text-slate-500 font-mono">
                                    {buyProcessLogs.length.toLocaleString()} / 1,000 lines
                                </span>
                                <button
                                    onClick={() => handleCopyLogs(buyProcessLogs)}
                                    className="text-slate-500 hover:text-slate-300 transition-colors"
                                    title="로그 복사"
                                >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>
                            <div
                                ref={buyLogContainerRef}
                                className="bg-slate-900 text-slate-300 rounded-md p-4 h-48 overflow-y-auto font-mono text-xs border border-slate-700 shadow-inner"
                            >
                                {buyProcessLogs.length === 0 ? (
                                    <div className="text-slate-500 text-center mt-16 italic">대기 중...</div>
                                ) : (
                                    buyProcessLogs.map((log, index) => (
                                        <div key={index} className="mb-1 last:mb-0 hover:bg-slate-800/50 px-1 rounded whitespace-pre-wrap break-all">
                                            <span className="text-slate-500 mr-2">[{log.time}]</span>
                                            <span className={log.message.includes('완료') || log.message.includes('성공') ? 'text-green-400' : 'text-slate-200'}>
                                                {log.message}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 매도 프로세스 진행도 */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                            매도 프로세스 진행도
                        </h2>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${sellProcessStatus.status === 'running' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 animate-pulse' :
                            sellProcessStatus.status === 'finished' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                            }`}>
                            {sellProcessStatus.status}
                        </span>
                    </div>

                    <div className={`space-y-4 ${sellProcessStatus.status === 'idle' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        {/* 프로그레스 바 */}
                        <div className="relative pt-1">
                            <div className="flex mb-2 items-center justify-between">
                                <div>
                                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-orange-600 bg-orange-200 dark:bg-orange-900 dark:text-orange-200">
                                        Progress
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-semibold inline-block text-orange-600 dark:text-orange-400">
                                        {sellProcessStatus.percent.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-orange-200 dark:bg-orange-900/50">
                                <div
                                    style={{ width: `${sellProcessStatus.percent}%` }}
                                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-orange-500 transition-all duration-500 ease-out"
                                ></div>
                            </div>
                        </div>

                        {/* 로그 창 */}
                        <div className="relative">
                            <div className="absolute top-2 right-4 flex items-center gap-2 z-10">
                                <span className="text-[10px] text-slate-500 font-mono">
                                    {sellProcessLogs.length.toLocaleString()} / 1,000 lines
                                </span>
                                <button
                                    onClick={() => handleCopyLogs(sellProcessLogs)}
                                    className="text-slate-500 hover:text-slate-300 transition-colors"
                                    title="로그 복사"
                                >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>
                            <div
                                ref={sellLogContainerRef}
                                className="bg-slate-900 text-slate-300 rounded-md p-4 h-48 overflow-y-auto font-mono text-xs border border-slate-700 shadow-inner"
                            >
                                {sellProcessLogs.length === 0 ? (
                                    <div className="text-slate-500 text-center mt-16 italic">대기 중...</div>
                                ) : (
                                    sellProcessLogs.map((log, index) => (
                                        <div key={index} className="mb-1 last:mb-0 hover:bg-slate-800/50 px-1 rounded whitespace-pre-wrap break-all">
                                            <span className="text-slate-500 mr-2">[{log.time}]</span>
                                            <span className={log.message.includes('완료') || log.message.includes('성공') ? 'text-green-400' : 'text-slate-200'}>
                                                {log.message}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
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
                            {formatNumberWithComma(Math.floor(status.totalInvestment))}원
                        </div>
                    </div>

                    {/* 총 평가금액 */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">총 평가금액</div>
                        <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                            {formatNumberWithComma(Math.floor(status.totalValuation))}원
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

                    {/* 평균 상승 확률 */}
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
                        <div className="text-xs text-red-700 dark:text-red-400 mb-1">평균 상승 확률</div>
                        <div className="text-2xl font-bold text-red-800 dark:text-red-300">
                            {status.avgUpProbability ? (status.avgUpProbability * 100).toFixed(1) : '0.0'}%
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
