import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { send } from '@/util/ClientUtil';
import useModalAnimation from '@/hooks/useModalAnimation';
import Toast from '@/component/common/display/Toast';
import PageTitle from '@/component/common/display/PageTitle';
import Button from '@/component/common/button/Button';

// 숫자를 천 단위 콤마 포맷으로 변환
const formatNumber = (value) => {
    if (value === null || value === '' || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    return num.toLocaleString('en-US');
};

// 날짜 포맷 (MM-DD HH:MM)
const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
    });
};

// 날짜 포맷 풀 (YYYY-MM-DD HH:MM:SS)
const formatDateTimeFull = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
};

// 초를 읽기 좋은 형식으로 변환
const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '-';
    const sec = Number(seconds);
    if (isNaN(sec)) return '-';
    if (sec < 60) return `${sec}초`;
    if (sec < 3600) return `${Math.floor(sec / 60)}분`;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
};

// 사유 색상 (색각이상 친화: 파랑/주황/노랑 팔레트)
const getReasonColor = (reason) => {
    const colors = {
        'SIGNAL': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
        'PARTIAL_SIGNAL': 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
        'TAKE_PROFIT': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
        'STOP_LOSS': 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
        'PARTIAL_TAKE_PROFIT': 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
        'PARTIAL_STOP_LOSS': 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
        'TRAILING_STOP': 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300',
        'PARTIAL_TRAILING_STOP': 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400',
        'MANUAL': 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
        'MAX_HOLD_EXPIRED': 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
        'MAX_HOLDING_EXPIRED': 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
    };
    if (colors[reason]) return colors[reason];
    if (/^\d+DAY_PROFIT$/.test(reason)) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
    return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400';
};

// 사유 라벨
const getReasonLabel = (reason) => {
    const labels = {
        'SIGNAL': '매수', 'PARTIAL_SIGNAL': '부분매수',
        'TAKE_PROFIT': '익절', 'STOP_LOSS': '손절',
        'PARTIAL_TAKE_PROFIT': '부분익절', 'PARTIAL_STOP_LOSS': '부분손절',
        'TRAILING_STOP': '트레일링스탑', 'PARTIAL_TRAILING_STOP': '부분트레일링',
        'MANUAL': '수동매도', 'PARTIAL_MANUAL': '부분수동',
        'MAX_HOLDING_EXPIRED': '강제청산', 'MAX_HOLD_EXPIRED': '강제청산',
    };
    if (labels[reason]) return labels[reason];
    const m = reason?.match(/^(\d+)DAY_PROFIT$/);
    if (m) return `${m[1]}일수익`;
    return reason;
};

// 손익 색상 (색각이상 친화: 파랑=수익, 주황=손실)
const plColor = (val) => {
    if (val == null) return '';
    return val >= 0
        ? 'text-blue-600 dark:text-blue-400'
        : 'text-orange-600 dark:text-orange-400';
};

/**
 * 페이퍼 트레이딩 페이지
 */
export default function Backtest() {
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // 설정 상태
    const [paperEnabled, setPaperEnabled] = useState(false);
    const [configLoading, setConfigLoading] = useState(false);
    const [paperStartedAt, setPaperStartedAt] = useState(null);

    // 데이터
    const [holdings, setHoldings] = useState([]);
    const [history, setHistory] = useState([]);
    const [currentPrices, setCurrentPrices] = useState({});

    // 필터
    const [typeFilter, setTypeFilter] = useState('ALL'); // ALL | BUY | SELL
    const [reasonFilter, setReasonFilter] = useState('ALL');

    // 초기화 확인 모달
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const { shouldRender: renderResetModal, isAnimatingOut: isResetClosing } = useModalAnimation(isResetModalOpen, 250);

    // 자동 새로고침
    const refreshIntervalRef = useRef(null);

    // Toast auto-hide
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }, [toast]);

    // 페이지 로드 시 데이터 조회 + 자동 새로고침 설정
    useEffect(() => {
        fetchAll();
        refreshIntervalRef.current = setInterval(() => fetchAll(true), 15000);
        return () => clearInterval(refreshIntervalRef.current);
    }, []);

    // 전체 데이터 조회
    const fetchAll = useCallback(async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            await Promise.all([fetchConfig(), fetchHoldings(), fetchHistory(), fetchPrices()]);
        } catch (e) {
            console.error('데이터 조회 실패:', e);
        } finally {
            if (!isBackground) setLoading(false);
        }
    }, []);

    // 설정 조회
    const fetchConfig = async () => {
        const { data, error } = await send('/dart/api/cointrade/config', {}, 'GET');
        if (error || !data?.success) return;
        const configList = data.response || [];
        const configMap = {};
        configList.forEach(c => {
            configMap[c.configKey || c.paramName] = c.configValue || c.paramValue;
        });
        // PAPER_TRADING + SCANNER_ENABLED + SELL_ENABLED 모두 true여야 실행 중
        const isRunning = configMap.PAPER_TRADING === 'true'
            && configMap.SCANNER_ENABLED === 'true'
            && configMap.SELL_ENABLED === 'true';
        setPaperEnabled(isRunning);
        if (configMap.PAPER_TRADING_STARTED_AT) {
            setPaperStartedAt(configMap.PAPER_TRADING_STARTED_AT);
        }
    };

    // 보유종목 조회
    const fetchHoldings = async () => {
        const { data, error } = await send('/dart/api/cointrade/paper/holdings', {}, 'GET');
        if (error || !data?.success) return;
        setHoldings(data.response || []);
    };

    // 거래내역 조회
    const fetchHistory = async () => {
        const { data, error } = await send('/dart/api/cointrade/paper/history', { limit: 200 }, 'GET');
        if (error || !data?.success) return;
        setHistory(data.response || []);
    };

    // 현재가 조회 (보유종목 손익 계산용)
    const fetchPrices = async () => {
        const { data, error } = await send('/dart/api/upbit/v1/ticker', {}, 'GET');
        if (error || !data?.success) return;
        const priceMap = {};
        (data.response || []).forEach(t => {
            priceMap[t.market] = t.tradePrice || t.trade_price;
        });
        setCurrentPrices(priceMap);
    };

    // 페이퍼 트레이딩 시작
    const handleStart = async () => {
        setConfigLoading(true);
        try {
            const configList = [
                { configKey: 'PAPER_TRADING', configValue: 'true' },
                { configKey: 'SCANNER_ENABLED', configValue: 'true' },
                { configKey: 'SELL_ENABLED', configValue: 'true' },
            ];
            const { data, error } = await send('/dart/api/cointrade/config', configList, 'PUT');
            if (error) {
                setToast('시작 실패: ' + error);
            } else if (data?.success) {
                setPaperEnabled(true);
                setPaperStartedAt(new Date().toISOString());
                setToast('페이퍼 트레이딩이 시작되었습니다.');
                fetchAll(true);
            }
        } catch (e) {
            setToast('시작 중 오류 발생');
        } finally {
            setConfigLoading(false);
        }
    };

    // 페이퍼 트레이딩 중지
    const handleStop = async () => {
        setConfigLoading(true);
        try {
            const configList = [
                { configKey: 'PAPER_TRADING', configValue: 'false' },
                { configKey: 'SCANNER_ENABLED', configValue: 'false' },
                { configKey: 'SELL_ENABLED', configValue: 'false' },
            ];
            const { data, error } = await send('/dart/api/cointrade/config', configList, 'PUT');
            if (error) {
                setToast('중지 실패: ' + error);
            } else if (data?.success) {
                setPaperEnabled(false);
                setToast('페이퍼 트레이딩이 중지되었습니다.');
            }
        } catch (e) {
            setToast('중지 중 오류 발생');
        } finally {
            setConfigLoading(false);
        }
    };

    // 데이터 초기화
    const handleReset = async () => {
        setIsResetModalOpen(false);
        try {
            const { data, error } = await send('/dart/api/cointrade/paper/reset', {}, 'DELETE');
            if (error) {
                setToast('초기화 실패: ' + error);
            } else {
                setToast('페이퍼 트레이딩 데이터가 초기화되었습니다.');
                setHoldings([]);
                setHistory([]);
            }
        } catch (e) {
            setToast('초기화 중 오류 발생');
        }
    };

    // 성과 지표 계산
    const metrics = useMemo(() => {
        const sellTrades = history.filter(h => h.tradeType === 'SELL' || h.trade_type === 'SELL');
        const totalTrades = history.length;
        const wins = sellTrades.filter(h => (h.profitLoss || h.profit_loss || 0) > 0).length;
        const winRate = sellTrades.length > 0 ? (wins / sellTrades.length) * 100 : 0;
        const totalPL = sellTrades.reduce((sum, h) => sum + (h.profitLoss || h.profit_loss || 0), 0);
        const holdDurations = sellTrades
            .map(h => h.holdDurationSec || h.hold_duration_sec)
            .filter(d => d != null);
        const avgHoldMin = holdDurations.length > 0
            ? holdDurations.reduce((s, d) => s + d, 0) / holdDurations.length / 60
            : 0;

        return { totalTrades, winRate, totalPL, avgHoldMin, sellCount: sellTrades.length };
    }, [history]);

    // 경과 시간 표시
    const [elapsed, setElapsed] = useState('');
    useEffect(() => {
        if (!paperEnabled || !paperStartedAt) {
            setElapsed('');
            return;
        }
        const update = () => {
            const diff = Math.floor((Date.now() - new Date(paperStartedAt).getTime()) / 1000);
            if (diff < 0) { setElapsed(''); return; }
            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff % 3600) / 60);
            setElapsed(h > 0 ? `${h}시간 ${m}분 경과` : `${m}분 경과`);
        };
        update();
        const timer = setInterval(update, 60000);
        return () => clearInterval(timer);
    }, [paperEnabled, paperStartedAt]);

    // 필터링된 거래내역
    const filteredHistory = useMemo(() => {
        let list = [...history];
        if (typeFilter !== 'ALL') {
            list = list.filter(h => (h.tradeType || h.trade_type) === typeFilter);
        }
        if (reasonFilter !== 'ALL') {
            list = list.filter(h => (h.reason || h.sell_reason) === reasonFilter);
        }
        // 최신순 정렬
        list.sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
        return list;
    }, [history, typeFilter, reasonFilter]);

    // 사유 목록 (필터 드롭다운용)
    const reasonOptions = useMemo(() => {
        const reasons = new Set();
        history.forEach(h => {
            const r = h.reason || h.sell_reason;
            if (r) reasons.add(r);
        });
        return Array.from(reasons).sort();
    }, [history]);

    // 보유종목의 현재 손익률 계산
    const getHoldingPL = (holding) => {
        const market = holding.coinCode || holding.coin_code;
        const buyPrice = holding.avgBuyPrice || holding.avg_buy_price;
        const currentPrice = currentPrices[market];
        if (!buyPrice || !currentPrice) return null;
        return ((currentPrice - buyPrice) / buyPrice) * 100;
    };

    return (
        <div className="space-y-6">
            <PageTitle />

            {/* 서브타이틀 */}
            <p className="text-sm text-slate-500 dark:text-slate-400 -mt-4">
                실제 주문 없이 실시간 스캐너+ML로 가상 매매 기록
            </p>

            {/* 1. 컨트롤 섹션 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex flex-wrap items-center gap-4">
                    {/* 상태 표시 */}
                    <div className="flex items-center gap-2">
                        <span className={`inline-block w-3 h-3 rounded-full ${paperEnabled ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'}`} />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {paperEnabled ? 'ON' : 'OFF'}
                        </span>
                        {elapsed && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">({elapsed})</span>
                        )}
                    </div>

                    {/* 버튼들 */}
                    <div className="flex flex-wrap gap-2 ml-auto">
                        {!paperEnabled ? (
                            <Button onClick={handleStart} disabled={configLoading} size="sm">
                                페이퍼 트레이딩 시작
                            </Button>
                        ) : (
                            <Button onClick={handleStop} disabled={configLoading} variant="secondary" size="sm">
                                페이퍼 트레이딩 중지
                            </Button>
                        )}
                        <Button
                            onClick={() => setIsResetModalOpen(true)}
                            variant="danger"
                            size="sm"
                            disabled={paperEnabled}
                        >
                            데이터 초기화
                        </Button>
                        <Button onClick={() => fetchAll()} variant="ghost" size="sm" disabled={loading}>
                            새로고침
                        </Button>
                    </div>
                </div>
            </div>

            {/* 2. 성과 요약 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard label="총 거래 수" value={metrics.totalTrades} suffix="건" />
                <SummaryCard
                    label="승률"
                    value={metrics.sellCount > 0 ? metrics.winRate.toFixed(1) : '-'}
                    suffix={metrics.sellCount > 0 ? '%' : ''}
                    sub={metrics.sellCount > 0 ? `${metrics.sellCount}건 중` : '매도 없음'}
                />
                <SummaryCard
                    label="총 손익"
                    value={metrics.sellCount > 0 ? formatNumber(Math.round(metrics.totalPL)) : '-'}
                    suffix={metrics.sellCount > 0 ? '원' : ''}
                    valueColor={plColor(metrics.totalPL)}
                />
                <SummaryCard
                    label="평균 보유시간"
                    value={metrics.sellCount > 0 ? metrics.avgHoldMin.toFixed(0) : '-'}
                    suffix={metrics.sellCount > 0 ? '분' : ''}
                />
            </div>

            {/* 3. 현재 보유종목 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                        현재 보유종목
                        <span className="ml-2 text-sm font-normal text-slate-500">{holdings.length}건</span>
                    </h2>
                    <span className="text-xs text-slate-400">15초마다 자동 새로고침</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">
                                <th className="px-4 py-3 text-left font-semibold">종목</th>
                                <th className="px-4 py-3 text-right font-semibold">매수가</th>
                                <th className="px-4 py-3 text-right font-semibold">수량</th>
                                <th className="px-4 py-3 text-right font-semibold">금액</th>
                                <th className="px-4 py-3 text-center font-semibold">모멘텀</th>
                                <th className="px-4 py-3 text-center font-semibold">ML확률</th>
                                <th className="px-4 py-3 text-left font-semibold">진입사유</th>
                                <th className="px-4 py-3 text-center font-semibold">남은시간</th>
                                <th className="px-4 py-3 text-right font-semibold">현재손익%</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {holdings.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                                        보유종목이 없습니다
                                    </td>
                                </tr>
                            ) : holdings.map((h, i) => {
                                const pl = getHoldingPL(h);
                                const coinCode = h.coinCode || h.coin_code || '';
                                const avgPrice = h.avgBuyPrice || h.avg_buy_price;
                                const qty = h.quantity || h.amount;
                                const totalAmt = avgPrice && qty ? avgPrice * qty : null;
                                const momentum = h.momentumScore ?? h.momentum_score;
                                const mlProb = h.mlProbability ?? h.ml_probability;
                                const reason = h.entryReason || h.entry_reason || h.reason;
                                const maxHold = h.maxHoldUntil || h.max_hold_until;

                                return (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                                            {coinCode.replace('KRW-', '')}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                                            {avgPrice != null ? formatNumber(Math.round(avgPrice)) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                                            {qty != null ? Number(qty).toFixed(4) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                                            {totalAmt != null ? formatNumber(Math.round(totalAmt)) + '원' : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                                            {momentum != null ? Number(momentum).toFixed(1) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                                            {mlProb != null ? (Number(mlProb) * 100).toFixed(1) + '%' : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-left">
                                            {reason ? (
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getReasonColor(reason)}`}>
                                                    {getReasonLabel(reason)}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                                            {maxHold ? formatRemainingTime(maxHold) : '-'}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-medium ${plColor(pl)}`}>
                                            {pl != null ? `${pl >= 0 ? '+' : ''}${pl.toFixed(2)}%` : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 4. 거래내역 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                        거래내역
                        <span className="ml-2 text-sm font-normal text-slate-500">{filteredHistory.length}건</span>
                    </h2>
                    <div className="flex items-center gap-2 ml-auto">
                        {/* 유형 필터 */}
                        <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        >
                            <option value="ALL">전체</option>
                            <option value="BUY">매수</option>
                            <option value="SELL">매도</option>
                        </select>
                        {/* 사유 필터 */}
                        <select
                            value={reasonFilter}
                            onChange={e => setReasonFilter(e.target.value)}
                            className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        >
                            <option value="ALL">사유 전체</option>
                            {reasonOptions.map(r => (
                                <option key={r} value={r}>{getReasonLabel(r)}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">
                                <th className="px-4 py-3 text-left font-semibold">시간</th>
                                <th className="px-4 py-3 text-left font-semibold">종목</th>
                                <th className="px-4 py-3 text-center font-semibold">유형</th>
                                <th className="px-4 py-3 text-right font-semibold">가격</th>
                                <th className="px-4 py-3 text-right font-semibold">수량</th>
                                <th className="px-4 py-3 text-right font-semibold">손익</th>
                                <th className="px-4 py-3 text-right font-semibold">손익률</th>
                                <th className="px-4 py-3 text-center font-semibold">사유</th>
                                <th className="px-4 py-3 text-center font-semibold">모멘텀</th>
                                <th className="px-4 py-3 text-center font-semibold">ML확률</th>
                                <th className="px-4 py-3 text-center font-semibold">보유시간</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredHistory.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
                                        거래내역이 없습니다
                                    </td>
                                </tr>
                            ) : filteredHistory.map((h, i) => {
                                const tradeType = h.tradeType || h.trade_type;
                                const coinCode = h.coinCode || h.coin_code || '';
                                const price = h.price || h.trade_price;
                                const qty = h.quantity || h.amount;
                                const pl = h.profitLoss || h.profit_loss;
                                const plRate = h.profitLossRate || h.profit_loss_rate;
                                const reason = h.reason || h.sell_reason;
                                const momentum = h.momentumScore ?? h.momentum_score;
                                const mlProb = h.mlProbability ?? h.ml_probability;
                                const holdSec = h.holdDurationSec || h.hold_duration_sec;
                                const createdAt = h.createdAt || h.created_at;

                                return (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                        <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                                            {formatDateTime(createdAt)}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                                            {coinCode.replace('KRW-', '')}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                tradeType === 'BUY'
                                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                            }`}>
                                                {tradeType === 'BUY' ? '매수' : '매도'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                                            {price != null ? formatNumber(Math.round(price)) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                                            {qty != null ? Number(qty).toFixed(4) : '-'}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-medium ${plColor(pl)}`}>
                                            {pl != null ? `${pl >= 0 ? '+' : ''}${formatNumber(Math.round(pl))}` : '-'}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-medium ${plColor(plRate)}`}>
                                            {plRate != null ? `${plRate >= 0 ? '+' : ''}${Number(plRate).toFixed(2)}%` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {reason ? (
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getReasonColor(reason)}`}>
                                                    {getReasonLabel(reason)}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                                            {momentum != null ? Number(momentum).toFixed(1) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                                            {mlProb != null ? (Number(mlProb) * 100).toFixed(1) + '%' : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                                            {holdSec != null ? formatDuration(holdSec) : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 초기화 확인 모달 */}
            {renderResetModal && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-250 ${isResetClosing ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="absolute inset-0 bg-black/50" onClick={() => setIsResetModalOpen(false)} />
                    <div className={`relative bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 transition-transform duration-250 ${isResetClosing ? 'scale-95' : 'scale-100'}`}>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">데이터 초기화</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
                            모든 페이퍼 트레이딩 데이터(보유종목, 거래내역)가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" size="sm" onClick={() => setIsResetModalOpen(false)}>
                                취소
                            </Button>
                            <Button variant="danger" size="sm" onClick={handleReset}>
                                초기화
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && <Toast message={toast} />}
        </div>
    );
}

/**
 * 요약 카드 컴포넌트
 */
function SummaryCard({ label, value, suffix = '', sub = '', valueColor = '' }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</div>
            <div className={`text-xl font-bold ${valueColor || 'text-slate-800 dark:text-white'}`}>
                {value}{suffix}
            </div>
            {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
        </div>
    );
}

/**
 * 남은시간 계산
 */
function formatRemainingTime(dateStr) {
    if (!dateStr) return '-';
    const target = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((target - now) / 1000);
    if (diffSec <= 0) return <span className="text-orange-600 dark:text-orange-400 font-medium">만료</span>;
    const m = Math.floor(diffSec / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}시간 ${m % 60}분`;
    return `${m}분`;
}
