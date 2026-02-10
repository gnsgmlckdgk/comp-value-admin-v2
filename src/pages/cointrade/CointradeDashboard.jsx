import { useState, useEffect, useCallback, useMemo } from 'react';
import { send } from '@/util/ClientUtil';
import PageTitle from '@/component/common/display/PageTitle';
import Button from '@/component/common/button/Button';
import UpbitCandleChart from '@/pages/cointrade/UpbitCandleChart';

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
        'PARTIAL_TAKE_PROFIT': 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
        'PARTIAL_STOP_LOSS': 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
        'MANUAL': 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
        'PARTIAL_MANUAL': 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
    };

    if (colors[reason]) return colors[reason];

    // {N}DAY_PROFIT 패턴
    if (/^\d+DAY_PROFIT$/.test(reason)) {
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
    }
    if (/^PARTIAL_\d+DAY_PROFIT$/.test(reason)) {
        return 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400';
    }

    return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400';
};

// 사유 라벨
const getReasonLabel = (reason) => {
    const labels = {
        'SIGNAL': '매수',
        'TAKE_PROFIT': '익절',
        'STOP_LOSS': '손절',
        'PARTIAL_TAKE_PROFIT': '부분익절',
        'PARTIAL_STOP_LOSS': '부분손절',
        'MANUAL': '수동매도',
        'PARTIAL_MANUAL': '부분수동'
    };

    if (labels[reason]) return labels[reason];

    // {N}DAY_PROFIT 패턴
    const dayProfitMatch = reason?.match(/^(\d+)DAY_PROFIT$/);
    if (dayProfitMatch) return `${dayProfitMatch[1]}일수익`;

    const partialDayProfitMatch = reason?.match(/^PARTIAL_(\d+)DAY_PROFIT$/);
    if (partialDayProfitMatch) return `부분${partialDayProfitMatch[1]}일`;

    return reason;
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
            <span className="font-extrabold" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)' }}>{parts[0]}</span>
            <span className="font-normal opacity-70">{parts.length > 1 && `.${parts[1]}`}</span>
            <span className="font-normal">{unit}</span>
        </span>
    );
};

// 소수점 숫자 볼드 처리 (수량 등)
const renderFormattedNumber = (value, decimals = 8) => {
    if (value === null || value === '' || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';

    const str = num.toFixed(decimals);
    const parts = str.split('.');

    return (
        <span>
            <span className="font-extrabold" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)' }}>{parts[0]}</span>
            <span className="font-normal opacity-70">{parts.length > 1 && `.${parts[1]}`}</span>
        </span>
    );
};

// 보유 종목 컬럼 너비 정의
const HOLDINGS_COL_WIDTHS = {
    checkbox: '50px',
    coinCode: '100px',
    buyPrice: '120px',
    currentPrice: '120px',
    predictedLow: '120px',
    predictedHigh: '160px', // 너비 조정
    quantity: '120px',
    valuation: '120px',
    profitRate: '100px',
    upProbability: '100px',
    downProbability: '100px',
    expectedReturn: '100px',
    buyDate: '120px',
    profitConfirmDate: '140px'
};

// 보유 종목 테이블 컬럼 정의
const HOLDINGS_TABLE_COLUMNS = [
    {
        key: 'checkbox',
        label: '',
        width: HOLDINGS_COL_WIDTHS.checkbox,
        sortable: false,
        sticky: true,
        headerClassName: 'px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-2 py-3 whitespace-nowrap text-center',
        isCheckbox: true
    },
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
        key: 'upProbability',
        label: '상승확률',
        width: HOLDINGS_COL_WIDTHS.upProbability,
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right text-red-600 dark:text-red-400 font-medium',
        render: (value) => value != null ? `${(value * 100).toFixed(1)}%` : '-'
    },
    {
        key: 'downProbability',
        label: '하락확률',
        width: HOLDINGS_COL_WIDTHS.downProbability,
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right text-blue-600 dark:text-blue-400 font-medium',
        render: (value) => value != null ? `${(value * 100).toFixed(1)}%` : '-'
    },
    {
        key: 'expectedReturn',
        label: '기대수익',
        width: HOLDINGS_COL_WIDTHS.expectedReturn,
        sortable: true,
        headerClassName: 'px-4 py-3 pr-8 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 pr-8 whitespace-nowrap text-right text-slate-700 dark:text-slate-300',
        render: (value) => value != null ? `${value.toFixed(2)}%` : '-'
    },
    {
        key: 'buyDate',
        label: '매수일',
        width: HOLDINGS_COL_WIDTHS.buyDate,
        sortable: true,
        headerClassName: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-left text-slate-900 dark:text-slate-100',
        render: (value) => new Date(value).toLocaleDateString('ko-KR', {
            month: '2-digit',
            day: '2-digit'
        })
    },
    {
        key: 'profitConfirmDate',
        label: '수익확정일',
        width: HOLDINGS_COL_WIDTHS.profitConfirmDate,
        sortable: true,
        headerClassName: 'px-4 py-3 pr-8 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 pr-8 whitespace-nowrap text-left text-slate-900 dark:text-slate-100',
        render: (value, row, predictionDays = 7) => {
            if (!row.buyDate) return '-';
            const buyDate = new Date(row.buyDate);
            const confirmDate = new Date(buyDate);
            confirmDate.setDate(buyDate.getDate() + predictionDays);

            const today = new Date();
            const isPassed = today >= confirmDate;

            return (
                <span className={isPassed ? 'text-green-600 dark:text-green-400 font-bold' : ''}>
                    {confirmDate.toLocaleDateString('ko-KR', {
                        month: '2-digit',
                        day: '2-digit'
                    })}
                    {isPassed ? ' (도래)' : ''}
                </span>
            );
        }
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

    // 설정 정보 (PREDICTION_DAYS 등)
    const [config, setConfig] = useState({
        predictionDays: 7 // 기본값 7일
    });

    // KRW 잔액
    const [krwBalance, setKrwBalance] = useState(0);

    // 보유 종목
    const [holdings, setHoldings] = useState([]);

    // 최근 거래 내역 (전체 데이터)
    const [allRecentTrades, setAllRecentTrades] = useState([]);

    // 상세보기 모달 상태
    const [selectedHolding, setSelectedHolding] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // 매도 관련 상태
    const [selectedCoins, setSelectedCoins] = useState([]);
    const [showSellModal, setShowSellModal] = useState(false);
    const [sellResult, setSellResult] = useState(null);
    const [isSelling, setIsSelling] = useState(false);

    // 테이블 필터/정렬 상태
    const [columnFilters, setColumnFilters] = useState({});
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

    // 필터 도움말 모달 상태
    const [isFilterHelpModalOpen, setIsFilterHelpModalOpen] = useState(false);

    // 보유 종목 테이블 필터/정렬 상태
    const [holdingsColumnFilters, setHoldingsColumnFilters] = useState({});
    const [holdingsSortConfig, setHoldingsSortConfig] = useState({ key: 'profitRate', direction: 'desc' });

    const [itemsPerPage, setItemsPerPage] = useState(9999); // 기본 전체보기
    const [currentPage, setCurrentPage] = useState(0); // 0-based for server
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

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
            // 1. 설정 조회 (PREDICTION_DAYS 등)
            const configResponse = await send('/dart/api/cointrade/config', {}, 'GET');
            if (configResponse.data?.success && configResponse.data?.response) {
                const configList = configResponse.data.response;
                const configMap = {};

                // API 응답을 객체로 변환
                configList.forEach(config => {
                    const key = config.configKey || config.paramName;
                    const value = config.configValue || config.paramValue;
                    configMap[key] = value;
                });

                setConfig({
                    predictionDays: parseInt(configMap.PREDICTION_DAYS || 7)
                });
            }

            // 2. 상태 조회
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

            // 3. KRW 잔액 조회
            try {
                const balanceResponse = await send('/dart/api/cointrade/account/balance', {}, 'GET');
                if (balanceResponse.data?.success && balanceResponse.data?.response) {
                    const resp = balanceResponse.data.response;
                    if (resp.status === 'success' && resp.data?.krw_balance != null) {
                        setKrwBalance(resp.data.krw_balance);
                    }
                }
            } catch (balanceError) {
                console.error('KRW 잔액 조회 실패:', balanceError);
            }

            // 4. 보유 종목 조회
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

            // 5. 최근 거래 내역 조회 (서버 사이드 페이징)
            await fetchRecentTrades(0, itemsPerPage, isBackground);
        } catch (e) {
            console.error('데이터 조회 실패:', e);
        } finally {
            if (!isBackground) setLoading(false);
        }
    }, [itemsPerPage]);

    // 최근 거래 내역 조회 (서버 사이드 페이징)
    const fetchRecentTrades = useCallback(async (page = 0, size = 10, isBackground = false) => {
        try {
            const today = new Date();
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);

            // 날짜와 시간 조립 (ISO 8601 형식)
            const formatDateParam = (date) => {
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const dd = String(date.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            };

            const startDateStr = formatDateParam(thirtyDaysAgo);
            const endDateStr = formatDateParam(today);

            const startDateTime = `${startDateStr}T00:00:00`;
            const endDateTime = `${endDateStr}T23:59:59`;

            const historyResponse = await send(
                `/dart/api/cointrade/history?startDate=${startDateTime}&endDate=${endDateTime}&page=${page}&size=${size}`,
                {},
                'GET'
            );

            if (historyResponse.data?.success && historyResponse.data?.response) {
                const response = historyResponse.data.response;
                const trades = response.content || [];
                setAllRecentTrades(trades);
                setTotalElements(response.totalElements || 0);
                setTotalPages(response.totalPages || 0);
                setCurrentPage(page);

                // 첫 페이지 조회 시에만 성능 계산 (전체 데이터 기준이 아닌 현재 페이지 데이터 기준)
                // 정확한 성능 계산이 필요하면 백엔드에서 별도 API 제공 필요
                if (page === 0) {
                    calculatePerformance(trades);
                }
            } else {
                setAllRecentTrades([]);
                setTotalElements(0);
                setTotalPages(0);
            }
        } catch (e) {
            console.error('거래 내역 조회 실패:', e);
            setAllRecentTrades([]);
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

        const takeProfitCount = sellTrades.filter(t => ['TAKE_PROFIT', 'PARTIAL_TAKE_PROFIT'].includes(t.reason)).length;
        const stopLossCount = sellTrades.filter(t => ['STOP_LOSS', 'PARTIAL_STOP_LOSS'].includes(t.reason)).length;
        const expiredCount = sellTrades.filter(t => {
            const reason = t.reason || '';
            return reason === 'EXPIRED' ||
                   /^\d+DAY_PROFIT$/.test(reason) ||
                   /^PARTIAL_\d+DAY_PROFIT$/.test(reason);
        }).length;

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

    // 유형 라벨 (필터용)
    const getTradeTypeLabel = (type) => {
        const labels = { 'BUY': '매수', 'SELL': '매도' };
        return labels[type] || type;
    };

    // 최근 거래 데이터 처리 (필터링 -> 정렬)
    const processedData = useMemo(() => {
        // 1. 필터링
        let data = allRecentTrades.filter(row => {
            return Object.entries(columnFilters).every(([key, filterValue]) => {
                if (!filterValue) return true;
                const cellValue = row[key];
                const filterLower = filterValue.toLowerCase();

                // 원본 값으로 비교
                if (String(cellValue).toLowerCase().includes(filterLower)) {
                    return true;
                }

                // 유형(tradeType) 컬럼: 라벨 값으로도 비교
                if (key === 'tradeType' && cellValue) {
                    const label = getTradeTypeLabel(cellValue);
                    if (label.toLowerCase().includes(filterLower)) {
                        return true;
                    }
                }

                // 사유(reason) 컬럼: 라벨 값으로도 비교
                if (key === 'reason' && cellValue) {
                    const label = getReasonLabel(cellValue);
                    if (label.toLowerCase().includes(filterLower)) {
                        return true;
                    }
                }

                return false;
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

    // 서버 사이드 페이징 - processedData가 현재 페이지 데이터
    const currentRecords = processedData;

    // 핸들러들
    const handleColumnFilterChange = useCallback((key, value) => {
        setColumnFilters((prev) => ({ ...prev, [key]: value }));
    }, []);

    const clearColumnFilters = useCallback(() => {
        setColumnFilters({});
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

    // 페이지 변경 (서버에서 다시 조회)
    const handlePageChange = (page) => {
        fetchRecentTrades(page, itemsPerPage, false);
    };

    // 페이지 당 개수 변경
    const handleItemsPerPageChange = (e) => {
        const newSize = Number(e.target.value);
        setItemsPerPage(newSize);
        fetchRecentTrades(0, newSize, false);
    };

    // 보유 종목 상세보기 모달 핸들러
    const handleRowDoubleClick = (holding) => {
        setSelectedHolding(holding);
        setIsDetailModalOpen(true);
    };

    const handleCloseDetailModal = () => {
        setIsDetailModalOpen(false);
        setSelectedHolding(null);
    };

    // 매도 관련 핸들러
    const handleCoinSelect = useCallback((coinCode) => {
        setSelectedCoins(prev => {
            if (prev.includes(coinCode)) {
                return prev.filter(c => c !== coinCode);
            } else {
                return [...prev, coinCode];
            }
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        if (selectedCoins.length === processedHoldings.length) {
            setSelectedCoins([]);
        } else {
            setSelectedCoins(processedHoldings.map(h => h.coinCode));
        }
    }, [selectedCoins.length, processedHoldings]);

    const handleSellClick = () => {
        setShowSellModal(true);
    };

    const handleSellConfirm = async () => {
        setIsSelling(true);
        try {
            const requestBody = selectedCoins.length > 0
                ? { coin_codes: selectedCoins }
                : {};

            const { data, error } = await send('/dart/api/holdings/sell', requestBody, 'POST');

            if (error) {
                setSellResult({
                    status: 'error',
                    message: error.message || '매도 요청 중 오류가 발생했습니다.'
                });
            } else {
                setSellResult(data);
            }
        } catch (err) {
            setSellResult({
                status: 'error',
                message: '매도 요청 중 오류가 발생했습니다.'
            });
        } finally {
            setIsSelling(false);
            setShowSellModal(false);
        }
    };

    const handleSellCancel = () => {
        setShowSellModal(false);
    };

    const handleSellResultClose = () => {
        setSellResult(null);
        setSelectedCoins([]);
        fetchData(false); // 매도 후 데이터 새로고침
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
        <div className="p-2 md:p-4">
            <div className="flex items-center justify-between mb-6">
                <PageTitle>자동매매 대시보드</PageTitle>
                <Button onClick={handleRefresh} disabled={loading} className="px-4 py-2">
                    {loading ? '갱신 중...' : '새로고침'}
                </Button>
            </div>

            {/* 상단 카드 영역 */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
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

                {/* KRW 잔액 */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">KRW 잔액</div>
                    <div className="text-xl font-medium text-slate-800 dark:text-slate-200">
                        {renderFormattedPrice(Math.floor(krwBalance), '원')}
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
                    {status.totalInvestment > 0 && (() => {
                        const diff = Math.floor(status.totalValuation - status.totalInvestment);
                        const isPositive = diff >= 0;
                        return (
                            <div className={`text-xs font-medium mt-1 ${isPositive ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400'}`}>
                                {isPositive ? '+' : ''}{renderFormattedPrice(diff, '원')}
                            </div>
                        );
                    })()}
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

                    <div className="flex items-center gap-2">
                        {selectedCoins.length > 0 && (
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                {selectedCoins.length}개 선택
                            </span>
                        )}

                        <button
                            type="button"
                            onClick={handleSellClick}
                            disabled={holdings.length === 0}
                            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors dark:disabled:bg-slate-600"
                        >
                            매도
                        </button>

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

                </div>



                <div className="overflow-x-auto overflow-y-auto scrollbar-always max-h-[500px] pr-2">

                    <table

                        className="text-sm divide-y divide-slate-200 dark:divide-slate-700"

                        style={{ width: '100%', tableLayout: 'fixed', minWidth: '1200px' }}

                    >

                        <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-700 to-slate-600 text-white">

                            <tr>

                                {HOLDINGS_TABLE_COLUMNS.map((col, index) => {
                                    const leftPosition = col.sticky
                                        ? (index === 0 ? 0 : index === 1 ? '50px' : undefined)
                                        : undefined;

                                    return (
                                        <th

                                            key={col.key}

                                            className={`${col.headerClassName} ${col.sortable ? 'cursor-pointer hover:bg-slate-500 select-none' : ''} ${col.sticky ? 'sticky z-20 bg-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]' : ''}`}

                                            style={{

                                                width: col.width,

                                                left: leftPosition

                                            }}

                                            onClick={() => col.sortable && handleHoldingsSort(col.key)}

                                        >
                                            {col.isCheckbox ? (
                                                <input
                                                    type="checkbox"
                                                    checked={processedHoldings.length > 0 && selectedCoins.length === processedHoldings.length}
                                                    onChange={handleSelectAll}
                                                    className="w-4 h-4 cursor-pointer"
                                                />
                                            ) : (
                                                <div className={`flex items-center gap-1 ${col.headerClassName.includes('text-center') ? 'justify-center' : col.headerClassName.includes('text-right') ? 'justify-end' : 'justify-start'}`}>

                                                    <span>{col.label}</span>

                                                    {col.sortable && (

                                                        <span className="flex flex-col text-[10px] leading-none opacity-60">

                                                            <span className={holdingsSortConfig.key === col.key && holdingsSortConfig.direction === 'asc' ? 'opacity-100 text-yellow-300' : ''}>▲</span>

                                                            <span className={holdingsSortConfig.key === col.key && holdingsSortConfig.direction === 'desc' ? 'opacity-100 text-yellow-300' : ''}>▼</span>

                                                        </span>

                                                    )}

                                                </div>
                                            )}

                                        </th>
                                    );
                                })}

                            </tr>

                            <tr className="bg-slate-100 dark:bg-slate-700">

                                {HOLDINGS_TABLE_COLUMNS.map((col, index) => {
                                    const leftPosition = col.sticky
                                        ? (index === 0 ? 0 : index === 1 ? '50px' : undefined)
                                        : undefined;

                                    return (
                                        <th

                                            key={`filter-${col.key}`}

                                            className={`px-2 py-2 ${col.sticky ? 'sticky z-20 bg-slate-100 dark:bg-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]' : ''}`}

                                            style={{

                                                width: col.width,

                                                left: leftPosition

                                            }}

                                        >
                                            {!col.isCheckbox && (
                                                <input

                                                    type="text"

                                                    value={holdingsColumnFilters[col.key] || ''}

                                                    onChange={(e) => handleHoldingsColumnFilterChange(col.key, e.target.value)}

                                                    placeholder="..."

                                                    className="w-full px-2 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-600 dark:border-slate-500 dark:text-white dark:placeholder-slate-400"

                                                />
                                            )}

                                        </th>
                                    );
                                })}

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

                                    return (

                                        <tr

                                            key={index}

                                            onClick={() => handleCoinSelect(holding.coinCode)}

                                            onDoubleClick={() => handleRowDoubleClick(holding)}

                                            className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 ${selectedCoins.includes(holding.coinCode) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}

                                        >

                                            {HOLDINGS_TABLE_COLUMNS.map((col, colIndex) => {

                                                const value = holding[col.key];

                                                const displayValue = col.render ? col.render(value, holding, config.predictionDays) : (value ?? '-');

                                                const leftPosition = col.sticky
                                                    ? (colIndex === 0 ? 0 : colIndex === 1 ? '50px' : undefined)
                                                    : undefined;

                                                return (

                                                    <td

                                                        key={col.key}

                                                        className={`${col.cellClassName} ${col.sticky ? `sticky z-[5] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${selectedCoins.includes(holding.coinCode) ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-slate-800'}` : ''}`}

                                                        style={{

                                                            width: col.width,

                                                            left: leftPosition

                                                        }}

                                                        onClick={(e) => {
                                                            if (col.isCheckbox) {
                                                                e.stopPropagation();
                                                            }
                                                        }}

                                                    >
                                                        {col.isCheckbox ? (
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedCoins.includes(holding.coinCode)}
                                                                onChange={() => handleCoinSelect(holding.coinCode)}
                                                                className="w-4 h-4 cursor-pointer"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        ) : (
                                                            displayValue
                                                        )}

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
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">최근 거래 내역</h3>
                            <span className="text-sm text-slate-500 dark:text-slate-400">(최근 30일)</span>
                            <button
                                type="button"
                                onClick={() => setIsFilterHelpModalOpen(true)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                                title="필터 도움말"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <select
                                value={itemsPerPage}
                                onChange={handleItemsPerPageChange}
                                className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                            >
                                <option value={9999}>전체보기</option>
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
                            {totalElements > 0 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium text-xs dark:bg-blue-900 dark:text-blue-200">
                                    총 {totalElements.toLocaleString()}건
                                </span>
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

                    {/* 페이지네이션 (서버 사이드) */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 px-4 py-4 border-t border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 0}
                                className="px-3 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-600 text-sm"
                            >
                                이전
                            </button>
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                {currentPage + 1} / {totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage >= totalPages - 1}
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

                        {/* 1. AI 예측 기반 익절 */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-600 dark:text-slate-400">AI 예측 익절 (어깨 매도)</span>
                                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                    {performance.takeProfitRate.toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                                <div
                                    className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full"
                                    style={{ width: `${performance.takeProfitRate}%` }}
                                />
                            </div>
                        </div>

                        {/* 2. 기간 보유 수익 확정 */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-600 dark:text-slate-400">{config.predictionDays}일 보유 익절 (수익 확정)</span>
                                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                    {performance.expiredRate.toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                                <div
                                    className="bg-green-500 dark:bg-green-400 h-2 rounded-full"
                                    style={{ width: `${performance.expiredRate}%` }}
                                />
                            </div>
                        </div>

                        {/* 3. 손절 관리 */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-600 dark:text-slate-400">손절 관리 (리스크 최소화)</span>
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

                        {/* 평균 수익률 */}
                        <div className={`flex items-center justify-between p-4 rounded-lg ${performance.avgProfitRate >= 0
                            ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800'
                            : 'bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700'
                            }`}>
                            <span className={`text-sm font-medium ${performance.avgProfitRate >= 0
                                ? 'text-orange-700 dark:text-orange-400'
                                : 'text-slate-700 dark:text-slate-400'
                                }`}>
                                실현 평균 수익률
                            </span>
                            <span className={`text-2xl font-bold ${performance.avgProfitRate >= 0
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-slate-600 dark:text-slate-400'
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

            {/* 필터 도움말 모달 */}
            {isFilterHelpModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={(e) => e.target === e.currentTarget && setIsFilterHelpModalOpen(false)}
                >
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        {/* 헤더 */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                필터 도움말
                            </h3>
                            <button
                                onClick={() => setIsFilterHelpModalOpen(false)}
                                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* 콘텐츠 */}
                        <div className="p-6 space-y-6">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                테이블 컬럼 필터에서 <strong>표시되는 값</strong> 또는 <strong>원본 값</strong> 모두 사용할 수 있습니다.
                            </p>

                            {/* 유형 필터 */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                                    유형 (tradeType)
                                </h4>
                                <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 dark:bg-slate-700">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">입력값</th>
                                                <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">매칭 데이터</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            <tr className="bg-white dark:bg-slate-800">
                                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">매수</td>
                                                <td className="px-4 py-2">
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">BUY</span>
                                                </td>
                                            </tr>
                                            <tr className="bg-white dark:bg-slate-800">
                                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">매도</td>
                                                <td className="px-4 py-2">
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">SELL</span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 사유 필터 */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                                    사유 (reason)
                                </h4>
                                <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 dark:bg-slate-700">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">입력값</th>
                                                <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">매칭 데이터</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            <tr className="bg-white dark:bg-slate-800">
                                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">매수</td>
                                                <td className="px-4 py-2">
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">SIGNAL</span>
                                                </td>
                                            </tr>
                                            <tr className="bg-white dark:bg-slate-800">
                                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">익절</td>
                                                <td className="px-4 py-2">
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">TAKE_PROFIT</span>
                                                </td>
                                            </tr>
                                            <tr className="bg-white dark:bg-slate-800">
                                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">손절</td>
                                                <td className="px-4 py-2">
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">STOP_LOSS</span>
                                                </td>
                                            </tr>
                                            <tr className="bg-white dark:bg-slate-800">
                                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">기간수익</td>
                                                <td className="px-4 py-2">
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">7DAY_PROFIT</span>
                                                </td>
                                            </tr>
                                            <tr className="bg-white dark:bg-slate-800">
                                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">부분익절</td>
                                                <td className="px-4 py-2">
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">PARTIAL_TAKE_PROFIT</span>
                                                </td>
                                            </tr>
                                            <tr className="bg-white dark:bg-slate-800">
                                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">부분기간</td>
                                                <td className="px-4 py-2">
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400">PARTIAL_7DAY_PROFIT</span>
                                                </td>
                                            </tr>
                                            <tr className="bg-white dark:bg-slate-800">
                                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">부분손절</td>
                                                <td className="px-4 py-2">
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">PARTIAL_STOP_LOSS</span>
                                                </td>
                                            </tr>
                                            <tr className="bg-white dark:bg-slate-800">
                                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">수동매도</td>
                                                <td className="px-4 py-2">
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">MANUAL</span>
                                                </td>
                                            </tr>
                                            <tr className="bg-white dark:bg-slate-800">
                                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">부분수동</td>
                                                <td className="px-4 py-2">
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400">PARTIAL_MANUAL</span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                                * 원본 값(BUY, SELL, SIGNAL 등)으로 입력해도 필터링됩니다.
                            </p>
                        </div>

                        {/* 푸터 */}
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <button
                                onClick={() => setIsFilterHelpModalOpen(false)}
                                className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 상세보기 모달 */}
            <DetailModal
                isOpen={isDetailModalOpen}
                selectedHolding={selectedHolding}
                onClose={handleCloseDetailModal}
                config={config}
            />

            {/* 매도 확인 모달 */}
            {showSellModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={(e) => e.target === e.currentTarget && handleSellCancel()}
                >
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
                        {/* 헤더 */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                매도 확인
                            </h3>
                            <button
                                onClick={handleSellCancel}
                                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* 콘텐츠 */}
                        <div className="p-6 overflow-y-auto flex-1">
                            <p className="text-slate-700 dark:text-slate-300 mb-4">
                                {selectedCoins.length > 0
                                    ? `선택한 ${selectedCoins.length}개 종목을 매도하시겠습니까?`
                                    : `보유 중인 ${holdings.length}개 전체 종목을 매도하시겠습니까?`
                                }
                            </p>

                            {/* 선택된 종목 목록 */}
                            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                                    매도 대상 종목 ({selectedCoins.length > 0 ? selectedCoins.length : holdings.length}개)
                                </div>
                                <div className="space-y-2">
                                    {(selectedCoins.length > 0
                                        ? holdings.filter(h => selectedCoins.includes(h.coinCode))
                                        : holdings
                                    ).map((h) => (
                                        <div key={h.coinCode} className="flex items-center justify-between py-1 px-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600">
                                            <span className="font-medium text-slate-800 dark:text-slate-200">{h.coinCode}</span>
                                            <span className={`text-sm font-medium ${h.profitRate >= 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                                {h.profitRate >= 0 ? '+' : ''}{h.profitRate?.toFixed(2)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 푸터 */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <button
                                type="button"
                                onClick={handleSellCancel}
                                disabled={isSelling}
                                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={handleSellConfirm}
                                disabled={isSelling}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSelling ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        매도 중...
                                    </>
                                ) : '매도 확인'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 매도 결과 모달 */}
            {sellResult && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={(e) => e.target === e.currentTarget && handleSellResultClose()}
                >
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                        {/* 헤더 */}
                        <div className={`flex items-center justify-between px-6 py-4 ${
                            sellResult.success || sellResult.response?.status === 'success'
                                ? 'bg-green-50 dark:bg-green-900/30'
                                : 'bg-red-50 dark:bg-red-900/30'
                        }`}>
                            <h3 className={`text-lg font-bold ${
                                sellResult.success || sellResult.response?.status === 'success'
                                    ? 'text-green-800 dark:text-green-300'
                                    : 'text-red-800 dark:text-red-300'
                            }`}>
                                {sellResult.success || sellResult.response?.status === 'success' ? '매도 완료' : '매도 실패'}
                            </h3>
                            <button
                                onClick={handleSellResultClose}
                                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* 콘텐츠 */}
                        <div className="p-6">
                            <p className="text-slate-700 dark:text-slate-300 mb-4">
                                {sellResult.message || sellResult.response?.message || '처리가 완료되었습니다.'}
                            </p>

                            {sellResult.response?.data && (
                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">총 요청</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200">{sellResult.response.data.total}건</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">성공</span>
                                        <span className="font-medium text-green-600 dark:text-green-400">{sellResult.response.data.success}건</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">실패</span>
                                        <span className="font-medium text-red-600 dark:text-red-400">{sellResult.response.data.failed}건</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 푸터 */}
                        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <button
                                type="button"
                                onClick={handleSellResultClose}
                                className="px-4 py-2 rounded-lg bg-slate-600 text-white font-medium hover:bg-slate-700 transition-colors"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// 상세보기 모달 컴포넌트 (외부로 분리)
const DetailModal = ({ isOpen, selectedHolding, onClose, config }) => {
    // ESC 키로 모달 닫기 및 스크롤 잠금
    useEffect(() => {
        if (!isOpen) return;

        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen || !selectedHolding) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    const profitLoss = selectedHolding.currentPrice
        ? (selectedHolding.currentPrice - selectedHolding.buyPrice) * selectedHolding.quantity
        : 0;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 animate-fade-in"
            onClick={handleBackdropClick}
        >
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto flex flex-col">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                            {selectedHolding.coinCode}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${selectedHolding.profitRate >= 0
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            }`}>
                            {selectedHolding.profitRate >= 0 ? '+' : ''}{selectedHolding.profitRate.toFixed(2)}%
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* 콘텐츠 */}
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                    {/* 가격 비교 그래프 */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700/50 dark:to-slate-800/50 rounded-lg p-4 sm:p-6 border border-slate-200 dark:border-slate-700">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">가격 비교</h4>

                        {/* 그래프 */}
                        <div className="space-y-3">
                            {(() => {
                                const buyPrice = selectedHolding.buyPrice || 0;
                                const currentPrice = selectedHolding.currentPrice || buyPrice;
                                const predictedHigh = selectedHolding.predictedHigh || buyPrice;
                                const predictedLow = selectedHolding.predictedLow || buyPrice;

                                // 범위 계산 (전체 가격 데이터를 포함하는 최소/최대값)
                                const dataMin = Math.min(predictedLow, buyPrice, currentPrice);
                                const dataMax = Math.max(predictedHigh, buyPrice, currentPrice);
                                let dataRange = dataMax - dataMin;

                                // 범위가 0이거나 너무 작을 경우를 대비한 최소 범위 설정 (가격의 1%)
                                if (dataRange === 0) dataRange = dataMin * 0.01;

                                // 여백 설정 (데이터 범위의 10%)
                                const padding = dataRange * 0.1;

                                const minPrice = dataMin - padding;
                                const maxPrice = dataMax + padding;
                                const range = maxPrice - minPrice;

                                // 각 가격의 위치 계산 (%)
                                const buyPricePos = ((buyPrice - minPrice) / range) * 100;
                                const currentPricePos = ((currentPrice - minPrice) / range) * 100;
                                const predictedHighPos = ((predictedHigh - minPrice) / range) * 100;
                                const predictedLowPos = ((predictedLow - minPrice) / range) * 100;

                                return (
                                    <>
                                        {/* 범위 바 */}
                                        <div className="relative h-12 sm:h-16 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden">
                                            {/* 예측 범위 (저가~고가) */}
                                            <div
                                                className="absolute top-0 bottom-0 bg-gradient-to-r from-blue-200/40 via-purple-200/40 to-green-200/40 dark:from-blue-900/30 dark:via-purple-900/30 dark:to-green-900/30"
                                                style={{
                                                    left: `${predictedLowPos}%`,
                                                    right: `${100 - predictedHighPos}%`
                                                }}
                                            />

                                            {/* 예측저가 마커 */}
                                            <div
                                                className="absolute top-0 bottom-0 w-1 bg-blue-400 dark:bg-blue-500"
                                                style={{ left: `${predictedLowPos}%` }}
                                                title="예측저가"
                                            />

                                            {/* 매수가 마커 */}
                                            <div
                                                className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center"
                                                style={{ left: `${buyPricePos}%`, transform: 'translate(-50%, -50%)' }}
                                            >
                                                <div className="w-0.5 h-full bg-slate-600 dark:bg-slate-400 absolute" style={{ height: '100%' }} />
                                                <div className="relative z-10 w-3 h-3 rounded-full bg-slate-600 dark:bg-slate-400 border-2 border-white dark:border-slate-800" />
                                            </div>

                                            {/* 현재가 마커 */}
                                            <div
                                                className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center"
                                                style={{ left: `${currentPricePos}%`, transform: 'translate(-50%, -50%)' }}
                                            >
                                                <div className={`w-1 h-full absolute ${selectedHolding.profitRate >= 0 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ height: '100%' }} />
                                                <div className={`relative z-10 w-4 h-4 rounded-full ${selectedHolding.profitRate >= 0 ? 'bg-red-500' : 'bg-blue-500'} border-2 border-white dark:border-slate-800 shadow-lg`} />
                                            </div>

                                            {/* 예측고가 마커 */}
                                            <div
                                                className="absolute top-0 bottom-0 w-1 bg-green-500 dark:bg-green-400"
                                                style={{ left: `${predictedHighPos}%` }}
                                                title="예측고가"
                                            />
                                        </div>

                                        {/* 범례 */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-slate-600 dark:bg-slate-400" />
                                                <span className="text-slate-600 dark:text-slate-400">매수가</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${selectedHolding.profitRate >= 0 ? 'bg-red-500' : 'bg-blue-500'}`} />
                                                <span className={selectedHolding.profitRate >= 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}>현재가</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-0.5 bg-blue-400 dark:bg-blue-500" />
                                                <span className="text-blue-600 dark:text-blue-400">예측저가</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-0.5 bg-green-500 dark:bg-green-400" />
                                                <span className="text-green-600 dark:text-green-400">예측고가</span>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    {/* 가격 정보 그리드 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {/* 매수가 */}
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 sm:p-4">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">매수가</div>
                            <div className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-200">
                                {renderFormattedPrice(selectedHolding.buyPrice, getCurrencyUnit(selectedHolding.coinCode))}
                            </div>
                        </div>

                        {/* 현재가 */}
                        <div className={`rounded-lg p-3 sm:p-4 ${selectedHolding.profitRate >= 0
                            ? 'bg-red-50 dark:bg-red-900/20'
                            : 'bg-blue-50 dark:bg-blue-900/20'
                            }`}>
                            <div className={`text-xs mb-1 ${selectedHolding.profitRate >= 0
                                ? 'text-red-700 dark:text-red-400'
                                : 'text-blue-700 dark:text-blue-400'
                                }`}>
                                현재가
                            </div>
                            <div className={`text-lg sm:text-xl font-bold ${selectedHolding.profitRate >= 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-blue-600 dark:text-blue-400'
                                }`}>
                                {renderFormattedPrice(selectedHolding.currentPrice, getCurrencyUnit(selectedHolding.coinCode))}
                            </div>
                        </div>

                        {/* 예측저가 */}
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 sm:p-4">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">예측저가</div>
                            <div className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-200">
                                {renderFormattedPrice(selectedHolding.predictedLow, getCurrencyUnit(selectedHolding.coinCode))}
                            </div>
                        </div>

                        {/* 예측고가 */}
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 sm:p-4">
                            <div className="text-xs text-green-700 dark:text-green-400 mb-1">예측고가</div>
                            <div className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">
                                {renderFormattedPrice(selectedHolding.predictedHigh, getCurrencyUnit(selectedHolding.coinCode))}
                            </div>
                            {selectedHolding.predictedHigh && selectedHolding.buyPrice && (
                                <div className="text-xs text-green-600 dark:text-green-400 mt-1 font-bold">
                                    +{(((selectedHolding.predictedHigh - selectedHolding.buyPrice) / selectedHolding.buyPrice) * 100).toFixed(2)}%
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 수량 및 평가 정보 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {/* 수량 */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 sm:p-4">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">보유 수량</div>
                            <div className="text-base sm:text-lg text-slate-800 dark:text-slate-200">
                                {selectedHolding.quantity ? renderFormattedNumber(selectedHolding.quantity, 8) : '-'}
                            </div>
                        </div>

                        {/* 평가금액 */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 sm:p-4">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">평가금액</div>
                            <div className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
                                {renderFormattedPrice(selectedHolding.valuation, getCurrencyUnit(selectedHolding.coinCode))}
                            </div>
                        </div>

                        {/* 손익금액 */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 sm:p-4">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">손익금액</div>
                            <div className={`text-base sm:text-lg font-bold ${profitLoss >= 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-blue-600 dark:text-blue-400'
                                }`}>
                                {profitLoss >= 0 ? '+' : ''}{renderFormattedPrice(profitLoss, getCurrencyUnit(selectedHolding.coinCode))}
                            </div>
                        </div>
                    </div>

                    {/* 예측 정보 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {/* 상승확률 */}
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg p-3 sm:p-4">
                            <div className="text-xs text-red-700 dark:text-red-400 mb-2">상승 확률</div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                                    <div
                                        className="bg-red-500 dark:bg-red-400 h-2 rounded-full"
                                        style={{ width: `${(selectedHolding.upProbability || 0) * 100}%` }}
                                    />
                                </div>
                                <span className="text-sm font-bold text-red-600 dark:text-red-400">
                                    {((selectedHolding.upProbability || 0) * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>

                        {/* 하락확률 */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3 sm:p-4">
                            <div className="text-xs text-blue-700 dark:text-blue-400 mb-2">하락 확률</div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                                    <div
                                        className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full"
                                        style={{ width: `${(selectedHolding.downProbability || 0) * 100}%` }}
                                    />
                                </div>
                                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                    {((selectedHolding.downProbability || 0) * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>

                        {/* 기대수익률 */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 sm:p-4">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">기대 수익률</div>
                            <div className={`text-base sm:text-lg font-bold ${(selectedHolding.expectedReturn || 0) >= 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-blue-600 dark:text-blue-400'
                                }`}>
                                {(selectedHolding.expectedReturn || 0).toFixed(2)}%
                            </div>
                        </div>
                    </div>

                    {/* 차트 영역 */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 sm:p-6 pr-0 sm:pr-0 min-h-[300px]">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                            {selectedHolding.coinCode} 시세 차트
                        </h4>
                        <div className="h-[400px]">
                            <UpbitCandleChart market={selectedHolding.coinCode} />
                        </div>
                    </div>

                    {/* 매수일 정보 */}
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">매수일시</div>
                                <div className="text-sm sm:text-base text-slate-800 dark:text-slate-200">
                                    {formatDateTime(selectedHolding.buyDate)}
                                </div>
                            </div>

                            {/* 수익 확정일 */}
                            {selectedHolding.buyDate && (
                                <div className="sm:text-right">
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">수익 확정일 (D+{config?.predictionDays || 7})</div>
                                    <div className="text-sm sm:text-base font-bold text-green-700 dark:text-green-400">
                                        {(() => {
                                            const confirmDate = new Date(selectedHolding.buyDate);
                                            confirmDate.setDate(confirmDate.getDate() + (config?.predictionDays || 7));
                                            return formatDateTime(confirmDate);
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 수익 확정 설명 */}
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">💡 수익 확정일이란?</span><br />
                            {selectedHolding.buyDate && (() => {
                                const predictionDays = config?.predictionDays || 7;
                                const buyDate = new Date(selectedHolding.buyDate);
                                const confirmDate = new Date(buyDate);
                                confirmDate.setDate(buyDate.getDate() + predictionDays);

                                const m1 = buyDate.getMonth() + 1;
                                const d1 = buyDate.getDate();
                                const m2 = confirmDate.getMonth() + 1;
                                const d2 = confirmDate.getDate();

                                return `${m1}월 ${d1}일에 매수했다면, ${m2}월 ${d2}일 새벽부터 수익률이 최소익절률을 넘기는 즉시 매도 프로세스가 작동합니다.`;
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

