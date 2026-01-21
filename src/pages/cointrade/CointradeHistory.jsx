import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { send } from '@/util/ClientUtil';
import PageTitle from '@/component/common/display/PageTitle';
import Input from '@/component/common/input/Input';
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

// 컬럼 너비 정의
const COL_WIDTHS = {
    createdAt: '140px',
    coinCode: '100px',
    tradeType: '80px',
    price: '80px',
    quantity: '130px',
    totalAmount: '120px',
    reason: '100px',
    profitLoss: '120px',
    profitLossRate: '100px',
    buyScore: '100px',
    surgeProbability: '100px',
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
        key: 'price',
        label: '가격',
        width: COL_WIDTHS.price,
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right text-slate-900 dark:text-slate-100',
        render: (value) => `${formatNumberWithComma(value)}원`
    },
    {
        key: 'quantity',
        label: '수량',
        width: COL_WIDTHS.quantity,
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right text-slate-900 dark:text-slate-100',
        render: (value) => value ? value.toFixed(8) : '-'
    },
    {
        key: 'totalAmount',
        label: '금액',
        width: COL_WIDTHS.totalAmount,
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right font-medium text-slate-900 dark:text-slate-100',
        render: (value) => `${formatNumberWithComma(value)}원`
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
        key: 'profitLoss',
        label: '손익',
        width: COL_WIDTHS.profitLoss,
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right',
        render: (value) => value != null ? (
            <span className={value >= 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-blue-600 dark:text-blue-400 font-medium'}>
                {value >= 0 ? '+' : ''}{formatNumberWithComma(value)}원
            </span>
        ) : '-'
    },
    {
        key: 'profitLossRate',
        label: '손익률',
        width: COL_WIDTHS.profitLossRate,
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right',
        render: (value) => value != null ? (
            <span className={value >= 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-blue-600 dark:text-blue-400 font-medium'}>
                {value >= 0 ? '+' : ''}{value.toFixed(2)}%
            </span>
        ) : '-'
    },
    {
        key: 'buyScore',
        label: '매수점수',
        width: COL_WIDTHS.buyScore,
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right text-slate-700 dark:text-slate-300',
        render: (value) => value != null ? `${value.toFixed(2)}점` : '-'
    },
    {
        key: 'surgeProbability',
        label: '급등확률',
        width: COL_WIDTHS.surgeProbability,
        sortable: true,
        headerClassName: 'px-4 py-3 pr-8 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 pr-8 whitespace-nowrap text-right text-purple-600 dark:text-purple-400 font-medium',
        render: (value) => value != null ? `${(value * 100).toFixed(0)}%` : '-'
    }
];

/**
 * 코인 자동매매 거래기록 조회 페이지 (v2.2)
 * - 테이블 디자인 개선 (Sticky Header/Columns, Filter Row)
 */
export default function CointradeHistory() {
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // 검색 필터 (서버 조회용)
    const [filters, setFilters] = useState({
        startDate: '',
        startTime: '00:00',
        endDate: '',
        endTime: '23:59',
        coinCode: 'all',
        tradeType: 'all',    // all, BUY, SELL
        reason: 'all'        // all, SIGNAL, TAKE_PROFIT, STOP_LOSS, EXPIRED
    });

    // 테이블 내부 필터/정렬
    const [columnFilters, setColumnFilters] = useState({});
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

    // 데이터
    const [records, setRecords] = useState([]);
    const [coinList, setCoinList] = useState([]);

    // 페이지네이션
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // 요약 정보
    const [summary, setSummary] = useState({
        buyCount: 0,
        buyAmount: 0,
        sellCount: 0,
        sellAmount: 0,
        totalProfit: 0,
        takeProfitCount: 0,
        stopLossCount: 0,
        expiredCount: 0
    });

    // Toast auto-hide
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }, [toast]);

    // 페이지 로드 시 기본 기간 설정 (시작일: 한달전 00:00, 종료일: 오늘 현재시간)
    useEffect(() => {
        const today = new Date();
        const oneMonthAgo = new Date(today);
        oneMonthAgo.setMonth(today.getMonth() - 1);

        // 로컬 날짜 문자열 (YYYY-MM-DD)
        const formatDate = (date) => {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };

        // 로컬 시간 문자열 (HH:mm)
        const currentTime = today.getHours().toString().padStart(2, '0') + ':' +
                            today.getMinutes().toString().padStart(2, '0');

        setFilters(prev => ({
            ...prev,
            startDate: formatDate(oneMonthAgo),
            startTime: '00:00',
            endDate: formatDate(today),
            endTime: currentTime
        }));

        fetchCoinList();
    }, []);

    // 종목 목록 조회
    const fetchCoinList = async () => {
        try {
            const { data, error } = await send('/dart/api/cointrade/coins', {}, 'GET');
            if (!error && data?.success && data?.response) {
                // 활성화된 종목만
                const activeCoins = data.response.filter(coin => coin.isActive);
                setCoinList(activeCoins);
            }
        } catch (e) {
            console.error('종목 목록 조회 실패:', e);
        }
    };

    // 거래기록 조회
    const handleSearch = async () => {
        if (!filters.startDate || !filters.endDate) {
            setToast('조회 기간을 선택해주세요.');
            return;
        }

        setLoading(true);
        try {
            // 날짜와 시간 조립 (ISO 8601 형식)
            const startDateTime = `${filters.startDate}T${filters.startTime}:00`;
            const endDateTime = `${filters.endDate}T${filters.endTime}:59`;

            // 쿼리 파라미터 생성
            const params = new URLSearchParams({
                startDate: startDateTime,
                endDate: endDateTime
            });

            if (filters.coinCode !== 'all') {
                params.append('coinCode', filters.coinCode);
            }
            if (filters.tradeType !== 'all') {
                params.append('tradeType', filters.tradeType);
            }
            if (filters.reason !== 'all') {
                params.append('reason', filters.reason);
            }

            const { data, error } = await send(`/dart/api/cointrade/history?${params.toString()}`, {}, 'GET');

            if (error) {
                setToast('조회 실패: ' + error);
                setRecords([]);
            } else if (data?.success && data?.response) {
                if (data.response.content.length === 0) {
                    setToast('조회된 거래기록이 없습니다.');
                }
                setRecords(data.response.content);
                calculateSummary(data.response.content);
                setCurrentPage(1); // 검색 시 첫 페이지로
            }
        } catch (e) {
            console.error('거래기록 조회 실패:', e);
            setToast('조회 중 오류가 발생했습니다.');
            setRecords([]);
        } finally {
            setLoading(false);
        }
    };

    // 요약 정보 계산
    const calculateSummary = (data) => {
        const buyRecords = data.filter(r => r.tradeType === 'BUY');
        const sellRecords = data.filter(r => r.tradeType === 'SELL');

        const buyAmount = buyRecords.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
        const sellAmount = sellRecords.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
        const totalProfit = sellRecords.reduce((sum, r) => sum + (r.profitLoss || 0), 0);

        const takeProfitCount = sellRecords.filter(r => r.reason === 'TAKE_PROFIT').length;
        const stopLossCount = sellRecords.filter(r => r.reason === 'STOP_LOSS').length;
        const expiredCount = sellRecords.filter(r => r.reason === 'EXPIRED').length;

        setSummary({
            buyCount: buyRecords.length,
            buyAmount,
            sellCount: sellRecords.length,
            sellAmount,
            totalProfit,
            takeProfitCount,
            stopLossCount,
            expiredCount
        });
    };

    // 필터 변경
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // 테이블 컬럼 필터 변경
    const handleColumnFilterChange = useCallback((key, value) => {
        setColumnFilters((prev) => ({
            ...prev,
            [key]: value,
        }));
        setCurrentPage(1); // 필터 변경 시 첫 페이지로
    }, []);

    // 필터 초기화
    const clearColumnFilters = useCallback(() => {
        setColumnFilters({});
        setCurrentPage(1);
    }, []);

    // 정렬 핸들러
    const handleSort = useCallback((key) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    }, []);

    // 클라이언트 사이드 필터링 및 정렬 데이터
    const processedData = useMemo(() => {
        // 1. 필터링
        let data = records.filter(row => {
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
    }, [records, columnFilters, sortConfig]);

    // 페이지네이션
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentRecords = processedData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(processedData.length / itemsPerPage);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    return (
        <div className="container mx-auto max-w-7xl p-4">
            <PageTitle>거래기록 조회</PageTitle>

            {/* 필터 영역 */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                    검색 조건
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {/* 시작일 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            시작일
                        </label>
                        <Input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            className="w-full"
                        />
                    </div>

                    {/* 시작 시간 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            시작 시간
                        </label>
                        <Input
                            type="time"
                            value={filters.startTime}
                            onChange={(e) => handleFilterChange('startTime', e.target.value)}
                            className="w-full"
                        />
                    </div>

                    {/* 종료일 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            종료일
                        </label>
                        <Input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            className="w-full"
                        />
                    </div>

                    {/* 종료 시간 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            종료 시간
                        </label>
                        <Input
                            type="time"
                            value={filters.endTime}
                            onChange={(e) => handleFilterChange('endTime', e.target.value)}
                            className="w-full"
                        />
                    </div>

                    {/* 종목 선택 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            종목
                        </label>
                        <select
                            value={filters.coinCode}
                            onChange={(e) => handleFilterChange('coinCode', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">전체</option>
                            {coinList.map(coin => (
                                <option key={coin.coinCode} value={coin.coinCode}>
                                    {coin.coinCode} {coin.coinName && `(${coin.coinName})`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 거래 유형 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            거래 유형
                        </label>
                        <select
                            value={filters.tradeType}
                            onChange={(e) => handleFilterChange('tradeType', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">전체</option>
                            <option value="BUY">매수</option>
                            <option value="SELL">매도</option>
                        </select>
                    </div>

                    {/* 매도 사유 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            매도 사유
                        </label>
                        <select
                            value={filters.reason}
                            onChange={(e) => handleFilterChange('reason', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">전체</option>
                            <option value="SIGNAL">매수 (SIGNAL)</option>
                            <option value="TAKE_PROFIT">익절 (TAKE_PROFIT)</option>
                            <option value="STOP_LOSS">손절 (STOP_LOSS)</option>
                            <option value="EXPIRED">만료 (EXPIRED)</option>
                        </select>
                    </div>
                </div>

                {/* 검색 버튼 */}
                <div className="flex justify-end mt-4">
                    <Button
                        onClick={handleSearch}
                        disabled={loading}
                        className="px-8 py-2"
                    >
                        {loading ? '조회 중...' : '검색'}
                    </Button>
                </div>
            </div>

            {/* 요약 정보 */}
            {records.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                        조회 결과 요약
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {/* 매수 건수 */}
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <div className="text-xs text-blue-700 dark:text-blue-400 mb-1">매수 건수</div>
                            <div className="text-xl font-bold text-blue-800 dark:text-blue-300">
                                {summary.buyCount}건
                            </div>
                        </div>

                        {/* 매수 금액 */}
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <div className="text-xs text-blue-700 dark:text-blue-400 mb-1">매수 금액</div>
                            <div className="text-lg font-bold text-blue-800 dark:text-blue-300">
                                {(summary.buyAmount / 10000).toFixed(0)}만원
                            </div>
                        </div>

                        {/* 매도 건수 */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">매도 건수</div>
                            <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                {summary.sellCount}건
                            </div>
                        </div>

                        {/* 매도 금액 */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">매도 금액</div>
                            <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                {(summary.sellAmount / 10000).toFixed(0)}만원
                            </div>
                        </div>

                        {/* 실현 손익 */}
                        <div className={`p-4 rounded-lg ${summary.totalProfit >= 0 ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800'}`}>
                            <div className={`text-xs mb-1 ${summary.totalProfit >= 0 ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'}`}>실현 손익</div>
                            <div className={`text-lg font-bold ${summary.totalProfit >= 0 ? 'text-red-800 dark:text-red-300' : 'text-blue-800 dark:text-blue-300'}`}>
                                {summary.totalProfit >= 0 ? '+' : ''}{(summary.totalProfit / 10000).toFixed(1)}만원
                            </div>
                        </div>

                        {/* 익절 */}
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                            <div className="text-xs text-green-700 dark:text-green-400 mb-1">익절</div>
                            <div className="text-xl font-bold text-green-800 dark:text-green-300">
                                {summary.takeProfitCount}건
                            </div>
                        </div>

                        {/* 손절 */}
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
                            <div className="text-xs text-red-700 dark:text-red-400 mb-1">손절</div>
                            <div className="text-xl font-bold text-red-800 dark:text-red-300">
                                {summary.stopLossCount}건
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                        만료 매도: <span className="font-medium text-slate-700 dark:text-slate-300">{summary.expiredCount}건</span>
                    </div>
                </div>
            )}

            {/* 거래기록 테이블 */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">거래 목록</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* 건수 선택 */}
                        <select
                            value={itemsPerPage}
                            onChange={handleItemsPerPageChange}
                            className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                        >
                            <option value={10}>10개씩 보기</option>
                            <option value={20}>20개씩 보기</option>
                            <option value={50}>50개씩 보기</option>
                            <option value={100}>100개씩 보기</option>
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
                        {records.length > 0 && (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 font-medium text-sm dark:bg-blue-900 dark:text-blue-200">
                                {processedData.length !== records.length
                                    ? `${processedData.length} / ${records.length}건`
                                    : `${records.length}건`}
                            </span>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto overflow-y-auto scrollbar-always max-h-[70vh]">
                    <table
                        className="text-sm divide-y divide-slate-200 dark:divide-slate-700"
                        style={{ width: '100%', tableLayout: 'fixed', minWidth: '1200px' }}
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
                                                    <span
                                                        className={
                                                            sortConfig.key === col.key && sortConfig.direction === 'asc'
                                                                ? 'opacity-100 text-yellow-300'
                                                                : ''
                                                        }
                                                    >
                                                        ▲
                                                    </span>
                                                    <span
                                                        className={
                                                            sortConfig.key === col.key && sortConfig.direction === 'desc'
                                                                ? 'opacity-100 text-yellow-300'
                                                                : ''
                                                        }
                                                    >
                                                        ▼
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                            {/* 필터 입력 행 */}
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
                                        데이터를 불러오는 중입니다...
                                    </td>
                                </tr>
                            ) : currentRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={TABLE_COLUMNS.length} className="px-4 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <svg
                                                className="w-12 h-12 text-slate-300 dark:text-slate-600"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={1.5}
                                                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                조회된 데이터가 없습니다.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                currentRecords.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50 transition-colors dark:hover:bg-slate-700">
                                        {TABLE_COLUMNS.map((col, index) => {
                                            const value = row[col.key];
                                            const displayValue = col.render ? col.render(value) : (value ?? '-');

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

                        {[...Array(totalPages)].map((_, i) => {
                            const page = i + 1;
                            // 첫 페이지, 마지막 페이지, 현재 페이지 주변만 표시
                            if (
                                page === 1 ||
                                page === totalPages ||
                                (page >= currentPage - 2 && page <= currentPage + 2)
                            ) {
                                return (
                                    <button
                                        key={page}
                                        onClick={() => handlePageChange(page)}
                                        className={`px-3 py-1 rounded-md text-sm ${currentPage === page
                                            ? 'bg-blue-600 text-white font-medium'
                                            : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                );
                            } else if (page === currentPage - 3 || page === currentPage + 3) {
                                return <span key={page} className="text-slate-400">...</span>;
                            }
                            return null;
                        })}

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