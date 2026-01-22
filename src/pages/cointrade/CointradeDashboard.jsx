import { useState, useEffect, useCallback, useMemo } from 'react';
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

// 날짜 포맷 (YYYY-MM-DD HH:MM:SS)
const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
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

// 컬럼 너비 정의
const COL_WIDTHS = {
    createdAt: '160px',
    coinCode: '100px',
    tradeType: '80px',
    reason: '100px',
    profitLossRate: '140px',
};

// 테이블 컬럼 정의
const TABLE_COLUMNS = [
    {
        key: 'createdAt',
        label: '일시',
        width: COL_WIDTHS.createdAt,
        sortable: true,
        headerClassName: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-left text-slate-900 dark:text-slate-100',
        render: (value) => formatDateTime(value)
    },
    {
        key: 'coinCode',
        label: '종목',
        width: COL_WIDTHS.coinCode,
        sortable: true,
        headerClassName: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-left font-medium text-slate-900 dark:text-slate-100',
    },
    {
        key: 'tradeType',
        label: '유형',
        width: COL_WIDTHS.tradeType,
        sortable: true,
        headerClassName: 'px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-center',
        render: (value) => (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${value === 'BUY'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                {value === 'BUY' ? '매수' : '매도'}
            </span>
        )
    },
    {
        key: 'reason',
        label: '사유',
        width: COL_WIDTHS.reason,
        sortable: true,
        headerClassName: 'px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-center',
        render: (value) => value ? (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getReasonColor(value)}`}>
                {getReasonLabel(value)}
            </span>
        ) : '-'
    },
    {
        key: 'profitLossRate',
        label: '손익률',
        width: COL_WIDTHS.profitLossRate,
        sortable: true,
        headerClassName: 'px-4 py-3 pr-12 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 pr-12 whitespace-nowrap text-right',
        render: (value) => value != null ? (
            <span className={value >= 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-blue-600 dark:text-blue-400 font-medium'}>
                {value >= 0 ? '+' : ''}{value.toFixed(2)}%
            </span>
        ) : '-'
    }
];

// 통화 단위 계산
const getCurrencyUnit = (coinCode) => {
    if (!coinCode) return '';
    const prefix = coinCode.split('-')[0];
    return prefix === 'KRW' ? '원' : ` ${prefix}`;
};

// 가격 표시 컴포넌트 (정수부 볼드 처리)
const renderFormattedPrice = (value, unit) => {
    if (value === null || value === '' || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';

    const str = num.toLocaleString('en-US');
    const parts = str.split('.');

    return (
        <span>
            <span className="font-bold">{parts[0]}</span>
            {parts.length > 1 && `.${parts[1]}`}
            {unit}
        </span>
    );
};

// 보유 종목 컬럼 너비 정의
const HOLDINGS_COL_WIDTHS = {
    coinCode: '100px',
    buyPrice: '120px',
    currentPrice: '120px',
    predictedLow: '120px',
    predictedHigh: '160px', // 너비 조정
    quantity: '120px',
    valuation: '120px',
    profitRate: '100px',
    surgeProbability: '140px',
    surgeDay: '100px',
    expireDate: '100px',
    buyScore: '100px',
    buyDate: '120px'
};

// 보유 종목 테이블 컬럼 정의
const HOLDINGS_TABLE_COLUMNS = [
    {
        key: 'coinCode',
        label: '종목',
        width: HOLDINGS_COL_WIDTHS.coinCode,
        sortable: true,
        sticky: true,
        headerClassName: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-left font-medium text-slate-900 dark:text-slate-100',
    },
    {
        key: 'buyPrice',
        label: '매수가',
        width: HOLDINGS_COL_WIDTHS.buyPrice,
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right text-slate-900 dark:text-slate-100',
        render: (value, row) => renderFormattedPrice(value, getCurrencyUnit(row.coinCode))
    },
    {
        key: 'currentPrice',
        label: '현재가',
        width: HOLDINGS_COL_WIDTHS.currentPrice,
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right font-medium text-slate-900 dark:text-slate-100',
        render: (value, row) => {
            if (!value) return '-';
            const rate = (row.buyPrice && row.buyPrice > 0) 
                ? ((value - row.buyPrice) / row.buyPrice) * 100 
                : 0;
            return (
                <div className="flex flex-col items-end">
                    {renderFormattedPrice(value, getCurrencyUnit(row.coinCode))}
                    <span className={`text-xs ${rate >= 0 ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400'}`}>
                        ({rate >= 0 ? '+' : ''}{rate.toFixed(2)}%)
                    </span>
                </div>
            );
        }
    },
    {
        key: 'predictedLow',
        label: '예측저가',
        width: HOLDINGS_COL_WIDTHS.predictedLow,
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right text-slate-900 dark:text-slate-100',
        render: (value, row) => renderFormattedPrice(value, getCurrencyUnit(row.coinCode))
    },
    {
        key: 'predictedHigh',
        label: '예측고가',
        width: HOLDINGS_COL_WIDTHS.predictedHigh,
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right text-slate-900 dark:text-slate-100',
        render: (value, row) => {
            if (!value) return '-';
            const rate = (row.buyPrice && row.buyPrice > 0) 
                ? ((value - row.buyPrice) / row.buyPrice) * 100 
                : 0;
            return (
                <div className="flex flex-col items-end">
                    {renderFormattedPrice(value, getCurrencyUnit(row.coinCode))}
                    <span className={`text-xs ${rate >= 0 ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400'}`}>
                        ({rate >= 0 ? '+' : ''}{rate.toFixed(2)}%)
                    </span>
                </div>
            );
        }
    },
    {
        key: 'quantity',
        label: '수량',
        width: HOLDINGS_COL_WIDTHS.quantity,
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right text-slate-900 dark:text-slate-100',
        render: (value) => value ? value.toFixed(8) : '-'
    },
    {
        key: 'valuation',
        label: '평가금액',
        width: HOLDINGS_COL_WIDTHS.valuation,
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right font-medium text-slate-900 dark:text-slate-100',
        render: (value, row) => renderFormattedPrice(value, getCurrencyUnit(row.coinCode))
    },
    {
        key: 'profitRate',
        label: '수익률',
        width: HOLDINGS_COL_WIDTHS.profitRate,
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right',
        render: (value) => (
            <span className={`font-bold ${value >= 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-blue-600 dark:text-blue-400'
                }`}>
                {value >= 0 ? '+' : ''}{value.toFixed(2)}%
            </span>
        )
    },
    {
        key: 'surgeProbability',
        label: '급등확률',
        width: HOLDINGS_COL_WIDTHS.surgeProbability,
        sortable: true,
        headerClassName: 'px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap',
        render: (value) => (
            <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-200 dark:bg-slate-600 rounded-full h-2 min-w-[60px]">
                    <div
                        className="bg-purple-500 dark:bg-purple-400 h-2 rounded-full"
                        style={{ width: `${(value || 0) * 100}%` }}
                    />
                </div>
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400 w-8 text-right">
                    {((value || 0) * 100).toFixed(0)}%
                </span>
            </div>
        )
    },
    {
        key: 'surgeDay',
        label: '급등예상일',
        width: HOLDINGS_COL_WIDTHS.surgeDay,
        sortable: true,
        headerClassName: 'px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-center text-slate-900 dark:text-slate-100',
        render: (value) => value ? `D+${value}` : '-'
    },
    {
        key: 'expireDate',
        label: '만료일',
        width: HOLDINGS_COL_WIDTHS.expireDate,
        sortable: true,
        headerClassName: 'px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-center',
        render: (value) => calculateDday(value)
    },
    {
        key: 'buyScore',
        label: '매수점수',
        width: HOLDINGS_COL_WIDTHS.buyScore,
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right text-slate-700 dark:text-slate-300',
        render: (value) => value != null ? `${value.toFixed(2)}점` : '-'
    },
    {
        key: 'buyDate',
        label: '매수일',
        width: HOLDINGS_COL_WIDTHS.buyDate,
        sortable: true,
        headerClassName: 'px-4 py-3 pr-8 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 pr-8 whitespace-nowrap text-left text-slate-900 dark:text-slate-100',
        render: (value) => new Date(value).toLocaleDateString('ko-KR', {
            month: '2-digit',
            day: '2-digit'
        })
    }
];

/**
 * 코인 자동매매 대시보드 (v2.2)
 * - 테이블 디자인 및 기능 개선 (Sticky Header, Sorting, Filtering)
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

    // 최근 거래 내역 (전체 데이터)
    const [allRecentTrades, setAllRecentTrades] = useState([]);

        // 테이블 필터/정렬 상태
        const [columnFilters, setColumnFilters] = useState({});
        const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
        
        // 보유 종목 테이블 필터/정렬 상태
        const [holdingsColumnFilters, setHoldingsColumnFilters] = useState({});
        const [holdingsSortConfig, setHoldingsSortConfig] = useState({ key: 'profitRate', direction: 'desc' });
    
        const [itemsPerPage, setItemsPerPage] = useState(10); // 대시보드이므로 기본 10개
        const [currentPage, setCurrentPage] = useState(1);
    
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
        const fetchData = useCallback(async (isBackground = false) => {
            if (!isBackground) setLoading(true);
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
                let initialHoldings = holdingsResponse.data.response;

                // 보유 종목이 있는 경우 현재가 조회 (업비트 API)
                if (initialHoldings.length > 0) {
                    try {
                        const marketCodes = initialHoldings.map(h => h.coinCode).join(',');
                        const tickerResponse = await send(`/dart/api/upbit/v1/ticker?markets=${marketCodes}`, {}, 'GET');

                        if (tickerResponse.data?.success && tickerResponse.data?.response) {
                            const tickerMap = {};
                            tickerResponse.data.response.forEach(ticker => {
                                tickerMap[ticker.market] = ticker.trade_price;
                            });

                            // 현재가 업데이트
                            initialHoldings = initialHoldings.map(holding => {
                                const currentPrice = tickerMap[holding.coinCode] || holding.currentPrice; // API 값이 없으면 기존 값 사용
                                return {
                                    ...holding,
                                    currentPrice
                                };
                            });
                        }
                    } catch (tickerError) {
                        console.error('현재가 조회 실패:', tickerError);
                        // 실패해도 기존 holding 데이터로 계속 진행
                    }
                }

                // 수익률 및 평가금액 계산하여 상태에 저장
                let newTotalInvestment = 0;
                let newTotalValuation = 0;

                const calculatedHoldings = initialHoldings.map(holding => {
                    const profitRate = holding.currentPrice
                        ? ((holding.currentPrice - holding.buyPrice) / holding.buyPrice * 100)
                        : 0;
                    const valuation = holding.currentPrice
                        ? holding.currentPrice * holding.quantity
                        : holding.totalAmount;
                    
                    newTotalInvestment += (holding.totalAmount || 0);
                    newTotalValuation += valuation;

                    return {
                        ...holding,
                        profitRate,
                        valuation
                    };
                });
                setHoldings(calculatedHoldings);

                // 상단 카드 상태 업데이트 (실시간 평가금액 반영)
                const newTotalProfitRate = newTotalInvestment > 0 
                    ? ((newTotalValuation - newTotalInvestment) / newTotalInvestment) * 100 
                    : 0;

                setStatus(prev => ({
                    ...prev,
                    totalInvestment: newTotalInvestment,
                    totalValuation: newTotalValuation,
                    totalProfitRate: newTotalProfitRate,
                    holdingsCount: calculatedHoldings.length
                }));
            }
    
                // 3. 최근 거래 내역 조회 (최근 30일)
                const today = new Date();
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(today.getDate() - 30);
    
                // 날짜와 시간 조립 (ISO 8601 형식 - KST 고려)
                const formatDateParam = (date) => {
                    const yyyy = date.getFullYear();
                    const mm = String(date.getMonth() + 1).padStart(2, '0');
                    const dd = String(date.getDate()).padStart(2, '0');
                    return `${yyyy}-${mm}-${dd}`;
                }
    
                const startDateStr = formatDateParam(thirtyDaysAgo);
                const endDateStr = formatDateParam(today);
    
                const startDateTime = `${startDateStr}T00:00:00`;
                const endDateTime = `${endDateStr}T23:59:59`;
    
                const historyResponse = await send(
                    `/dart/api/cointrade/history?startDate=${startDateTime}&endDate=${endDateTime}`,
                    {},
                    'GET'
                );
    
                if (historyResponse.data?.success && historyResponse.data?.response) {
                    const trades = historyResponse.data.response.content || historyResponse.data.response || [];
                    setAllRecentTrades(trades);
                    calculatePerformance(trades);
                } else {
                    setAllRecentTrades([]);
                }
            } catch (e) {
                console.error('데이터 조회 실패:', e);
            } finally {
                if (!isBackground) setLoading(false);
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
    
        // 보유 종목 데이터 처리 (필터링 -> 정렬)
        const processedHoldings = useMemo(() => {
            // 1. 필터링
            let data = holdings.filter(row => {
                return Object.entries(holdingsColumnFilters).every(([key, filterValue]) => {
                    if (!filterValue) return true;
                    const cellValue = row[key];
                    return String(cellValue).toLowerCase().includes(filterValue.toLowerCase());
                });
            });
    
            // 2. 정렬
            if (holdingsSortConfig.key) {
                data.sort((a, b) => {
                    const aVal = a[holdingsSortConfig.key];
                    const bVal = b[holdingsSortConfig.key];
    
                    if (aVal == null && bVal == null) return 0;
                    if (aVal == null) return 1;
                    if (bVal == null) return -1;
    
                    if (typeof aVal === 'number' && typeof bVal === 'number') {
                        return holdingsSortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
                    }
    
                    const aStr = String(aVal).toLowerCase();
                    const bStr = String(bVal).toLowerCase();
                    return holdingsSortConfig.direction === 'asc'
                        ? aStr.localeCompare(bStr)
                        : bStr.localeCompare(aStr);
                });
            }
    
            return data;
        }, [holdings, holdingsColumnFilters, holdingsSortConfig]);
    
        // 최근 거래 데이터 처리 (필터링 -> 정렬)
        const processedData = useMemo(() => {
            // 1. 필터링
            let data = allRecentTrades.filter(row => {
                return Object.entries(columnFilters).every(([key, filterValue]) => {
                    if (!filterValue) return true;
                    const cellValue = row[key];
                    return String(cellValue).toLowerCase().includes(filterValue.toLowerCase());
                });
            });
    
            // 2. 정렬
            if (sortConfig.key) {
                data.sort((a, b) => {
                    const aVal = a[sortConfig.key];
                    const bVal = b[sortConfig.key];
    
                    if (aVal == null && bVal == null) return 0;
                    if (aVal == null) return 1;
                    if (bVal == null) return -1;
    
                    if (typeof aVal === 'number' && typeof bVal === 'number') {
                        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
                    }
    
                    const aStr = String(aVal).toLowerCase();
                    const bStr = String(bVal).toLowerCase();
                    return sortConfig.direction === 'asc'
                        ? aStr.localeCompare(bStr)
                        : bStr.localeCompare(aStr);
                });
            }
    
            return data;
        }, [allRecentTrades, columnFilters, sortConfig]);
    
        // 페이지네이션 데이터
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        const currentRecords = processedData.slice(indexOfFirstItem, indexOfLastItem);
        const totalPages = Math.ceil(processedData.length / itemsPerPage);
    
        // 핸들러들
        const handleColumnFilterChange = useCallback((key, value) => {
            setColumnFilters((prev) => ({ ...prev, [key]: value }));
            setCurrentPage(1);
        }, []);
    
        const clearColumnFilters = useCallback(() => {
            setColumnFilters({});
            setCurrentPage(1);
        }, []);
    
        const handleSort = useCallback((key) => {
            setSortConfig((prev) => ({
                key,
                direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
            }));
        }, []);
    
        const handleHoldingsColumnFilterChange = useCallback((key, value) => {
            setHoldingsColumnFilters((prev) => ({ ...prev, [key]: value }));
        }, []);
    
        const handleHoldingsSort = useCallback((key) => {
            setHoldingsSortConfig((prev) => ({
                key,
                direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
            }));
        }, []);
    
        const handlePageChange = (page) => setCurrentPage(page);
        const handleItemsPerPageChange = (e) => {
            setItemsPerPage(Number(e.target.value));
            setCurrentPage(1);
        };
    
        // 페이지 로드 시 + 30초마다 자동 새로고침
    useEffect(() => {
        fetchData(false); // 초기 로딩은 loading 표시
        const interval = setInterval(() => fetchData(true), 30000); // 30초마다 백그라운드 갱신
        return () => clearInterval(interval);
    }, [fetchData]);

    // 수동 새로고침
    const handleRefresh = () => {
        fetchData(false); // 수동 갱신은 loading 표시
        setToast('데이터가 갱신되었습니다.');
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
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.buySchedulerEnabled
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                }`}>
                                {status.buySchedulerEnabled ? 'ON' : 'OFF'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600 dark:text-slate-400">매도</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.sellSchedulerEnabled
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
                    <div className="text-xl font-medium text-slate-800 dark:text-slate-200">
                        {renderFormattedPrice(Math.floor(status.totalInvestment), '원')}
                    </div>
                </div>

                {/* 총 평가금액 */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">총 평가금액</div>
                    <div className="text-xl font-medium text-slate-800 dark:text-slate-200">
                        {renderFormattedPrice(Math.floor(status.totalValuation), '원')}
                    </div>
                </div>

                {/* 총 수익률 */}
                <div className={`rounded-lg shadow-sm border p-4 ${status.totalProfitRate >= 0
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'
                    }`}>
                    <div className={`text-xs mb-1 ${status.totalProfitRate >= 0
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-blue-700 dark:text-blue-400'
                        }`}>
                        총 수익률
                    </div>
                    <div className={`text-3xl font-bold ${status.totalProfitRate >= 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-blue-600 dark:text-blue-400'
                        }`}>
                        {status.totalProfitRate >= 0 ? '+' : ''}{status.totalProfitRate.toFixed(2)}%
                    </div>
                </div>
            </div>

                        {/* 보유 종목 테이블 */}

                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">

                            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">

                                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">

                                    보유 종목 ({holdings.length})

                                </h2>

                                {Object.values(holdingsColumnFilters).some((v) => v !== '') && (

                                    <button

                                        type="button"

                                        onClick={() => setHoldingsColumnFilters({})}

                                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600"

                                    >

                                        필터 초기화

                                    </button>

                                )}

                            </div>

            

                            <div className="overflow-x-auto overflow-y-auto scrollbar-always max-h-[500px] pr-2">

                                <table

                                    className="text-sm divide-y divide-slate-200 dark:divide-slate-700"

                                    style={{ width: '100%', tableLayout: 'fixed', minWidth: '1200px' }}

                                >

                                    <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-700 to-slate-600 text-white">

                                        <tr>

                                            {HOLDINGS_TABLE_COLUMNS.map((col, index) => (

                                                <th

                                                    key={col.key}

                                                    className={`${col.headerClassName} ${col.sortable ? 'cursor-pointer hover:bg-slate-500 select-none' : ''} ${col.sticky ? 'sticky z-20 bg-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]' : ''}`}

                                                    style={{

                                                        width: col.width,

                                                        left: col.sticky ? (index === 0 ? 0 : '100px') : undefined // coinCode width is 100px

                                                    }}

                                                    onClick={() => col.sortable && handleHoldingsSort(col.key)}

                                                >

                                                    <div className={`flex items-center gap-1 ${col.headerClassName.includes('text-center') ? 'justify-center' : col.headerClassName.includes('text-right') ? 'justify-end' : 'justify-start'}`}>

                                                        <span>{col.label}</span>

                                                        {col.sortable && (

                                                            <span className="flex flex-col text-[10px] leading-none opacity-60">

                                                                <span className={holdingsSortConfig.key === col.key && holdingsSortConfig.direction === 'asc' ? 'opacity-100 text-yellow-300' : ''}>▲</span>

                                                                <span className={holdingsSortConfig.key === col.key && holdingsSortConfig.direction === 'desc' ? 'opacity-100 text-yellow-300' : ''}>▼</span>

                                                            </span>

                                                        )}

                                                    </div>

                                                </th>

                                            ))}

                                        </tr>

                                        <tr className="bg-slate-100 dark:bg-slate-700">

                                            {HOLDINGS_TABLE_COLUMNS.map((col, index) => (

                                                <th

                                                    key={`filter-${col.key}`}

                                                    className={`px-2 py-2 ${col.sticky ? 'sticky z-20 bg-slate-100 dark:bg-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]' : ''}`}

                                                    style={{

                                                        width: col.width,

                                                        left: col.sticky ? (index === 0 ? 0 : '100px') : undefined

                                                    }}

                                                >

                                                    <input

                                                        type="text"

                                                        value={holdingsColumnFilters[col.key] || ''}

                                                        onChange={(e) => handleHoldingsColumnFilterChange(col.key, e.target.value)}

                                                        placeholder="..."

                                                        className="w-full px-2 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-600 dark:border-slate-500 dark:text-white dark:placeholder-slate-400"

                                                    />

                                                </th>

                                            ))}

                                        </tr>

                                    </thead>

                                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">

                                                                {loading ? (

                                                                    <tr>

                                                                        <td colSpan={HOLDINGS_TABLE_COLUMNS.length} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">

                                                                            조회 중입니다...

                                                                        </td>

                                                                    </tr>

                                                                ) : processedHoldings.length === 0 ? (

                                                                    <tr>

                                                                        <td colSpan={HOLDINGS_TABLE_COLUMNS.length} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">

                                                                            보유 종목이 없습니다.

                                                                        </td>

                                                                    </tr>

                                                                ) : (

                                                                    processedHoldings.map((holding, index) => {

                                                // 만료 임박 여부 (3일 이내)

                                                const isExpiring = holding.expireDate &&

                                                    (new Date(holding.expireDate) - new Date()) / (1000 * 60 * 60 * 24) <= 3;

            

                                                return (

                                                    <tr

                                                        key={index}

                                                        className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 ${isExpiring ? 'bg-orange-50 dark:bg-orange-900/10' : ''

                                                            }`}

                                                    >

                                                        {HOLDINGS_TABLE_COLUMNS.map((col, colIndex) => {

                                                            const value = holding[col.key];

                                                                                                                        const displayValue = col.render ? col.render(value, holding) : (value ?? '-');

                                                            return (

                                                                <td

                                                                    key={col.key}

                                                                    className={`${col.cellClassName} ${col.sticky ? 'sticky z-[5] bg-white dark:bg-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''} ${isExpiring && col.sticky ? '!bg-orange-50 dark:!bg-slate-800' : ''}`}

                                                                    style={{

                                                                        width: col.width,

                                                                        left: col.sticky ? (colIndex === 0 ? 0 : '100px') : undefined

                                                                    }}

                                                                >

                                                                    {displayValue}

                                                                </td>

                                                            );

                                                        })}

                                                    </tr>

                                                );

                                            })

                                        )}

                                    </tbody>

                                </table>

                            </div>

                        </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 최근 거래 내역 테이블 */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">최근 거래 내역</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                            <select
                                value={itemsPerPage}
                                onChange={handleItemsPerPageChange}
                                className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                            >
                                <option value={10}>10개씩</option>
                                <option value={20}>20개씩</option>
                                <option value={50}>50개씩</option>
                            </select>
                            {Object.values(columnFilters).some((v) => v !== '') && (
                                <button
                                    type="button"
                                    onClick={clearColumnFilters}
                                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600"
                                >
                                    필터 초기화
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto overflow-y-auto scrollbar-always max-h-[500px] pr-2">
                        <table
                            className="text-sm divide-y divide-slate-200 dark:divide-slate-700"
                            style={{ width: '100%', tableLayout: 'fixed', minWidth: '680px' }}
                        >
                            <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-700 to-slate-600 text-white">
                                <tr>
                                    {TABLE_COLUMNS.map((col, index) => (
                                        <th
                                            key={col.key}
                                            className={`${col.headerClassName} ${col.sortable ? 'cursor-pointer hover:bg-slate-500 select-none' : ''} ${col.sticky ? 'sticky z-20 bg-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]' : ''}`}
                                            style={{
                                                width: col.width,
                                                left: col.sticky ? (index === 0 ? 0 : col.left) : undefined
                                            }}
                                            onClick={() => col.sortable && handleSort(col.key)}
                                        >
                                            <div className={`flex items-center gap-1 ${col.headerClassName.includes('text-center') ? 'justify-center' : col.headerClassName.includes('text-right') ? 'justify-end' : 'justify-start'}`}>
                                                <span>{col.label}</span>
                                                {col.sortable && (
                                                    <span className="flex flex-col text-[10px] leading-none opacity-60">
                                                        <span className={sortConfig.key === col.key && sortConfig.direction === 'asc' ? 'opacity-100 text-yellow-300' : ''}>▲</span>
                                                        <span className={sortConfig.key === col.key && sortConfig.direction === 'desc' ? 'opacity-100 text-yellow-300' : ''}>▼</span>
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                                <tr className="bg-slate-100 dark:bg-slate-700">
                                    {TABLE_COLUMNS.map((col, index) => (
                                        <th
                                            key={`filter-${col.key}`}
                                            className={`px-2 py-2 ${col.sticky ? 'sticky z-20 bg-slate-100 dark:bg-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]' : ''}`}
                                            style={{
                                                width: col.width,
                                                left: col.sticky ? (index === 0 ? 0 : col.left) : undefined
                                            }}
                                        >
                                            <input
                                                type="text"
                                                value={columnFilters[col.key] || ''}
                                                onChange={(e) => handleColumnFilterChange(col.key, e.target.value)}
                                                placeholder="..."
                                                className="w-full px-2 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-600 dark:border-slate-500 dark:text-white dark:placeholder-slate-400"
                                            />
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200 dark:bg-slate-800 dark:divide-slate-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={TABLE_COLUMNS.length} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                                            조회 중입니다...
                                        </td>
                                    </tr>
                                ) : currentRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={TABLE_COLUMNS.length} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                                            거래 내역이 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    currentRecords.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-blue-50 transition-colors dark:hover:bg-slate-700">
                                            {TABLE_COLUMNS.map((col, index) => {
                                                const value = row[col.key];
                                                const displayValue = col.render ? col.render(value, row) : (value ?? '-');
                                                return (
                                                    <td
                                                        key={col.key}
                                                        className={`${col.cellClassName} ${col.sticky ? 'sticky z-[5] bg-white dark:bg-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''}`}
                                                        style={{
                                                            width: col.width,
                                                            left: col.sticky ? (index === 0 ? 0 : col.left) : undefined
                                                        }}
                                                    >
                                                        {displayValue}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* 페이지네이션 */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 px-4 py-4 border-t border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-600 text-sm"
                            >
                                이전
                            </button>
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-600 text-sm"
                            >
                                다음
                            </button>
                        </div>
                    )}
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
                        <div className={`flex items-center justify-between p-4 rounded-lg ${performance.avgProfitRate >= 0
                            ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800'
                            : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800'
                            }`}>
                            <span className={`text-sm font-medium ${performance.avgProfitRate >= 0
                                ? 'text-red-700 dark:text-red-400'
                                : 'text-blue-700 dark:text-blue-400'
                                }`}>
                                평균 수익률
                            </span>
                            <span className={`text-2xl font-bold ${performance.avgProfitRate >= 0
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
