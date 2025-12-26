import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { send } from '@/util/ClientUtil';
import PageTitle from '@/component/common/display/PageTitle';
import Loading from '@/component/common/display/Loading';
import AlertModal from '@/component/layouts/common/popup/AlertModal';
import CompanyValueResultModal from '@/pages/trade/popup/CompanyValueResultModal';
import BulkQueryModal from '@/pages/trade/popup/BulkQueryModal';

// 로컬스토리지 키
const SCHEDULE_RUN_KEY = 'lastRecommendedStockScheduleRun';

// 숫자를 천 단위 콤마 포맷으로 변환
const formatNumberWithComma = (value) => {
    if (value === null || value === '' || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    return num.toLocaleString('en-US');
};

// 날짜 포맷 (YYYYMMDD -> YYYY-MM-DD)
const formatDate = (dateStr) => {
    if (!dateStr || dateStr.length !== 8) return '-';
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
};

// 시간 포맷 (HHMMSS -> HH:MM:SS)
const formatTime = (timeStr) => {
    if (!timeStr || timeStr.length < 6) return '-';
    return `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}:${timeStr.slice(4, 6)}`;
};

// 필드 레이블 매핑 (영문 -> 한글)
const FIELD_LABELS = {
    symbol: '심볼',
    companyName: '기업명',
    marketCap: '시가총액',
    sector: '섹터',
    industry: '산업군',
    beta: '베타',
    price: '주가',
    lastAnnualDividend: '연간배당금',
    volume: '거래량',
    exchange: '거래소',
    exchangeShortName: '거래소',
    country: '국가',
    peRatioTTM: 'PER (TTM)',
    priceToBookRatioTTM: 'PBR (TTM)',
    returnOnEquityTTM: 'ROE (TTM)',
    debtEquityRatioTTM: '부채비율 (TTM)',
    dividendYieldTTM: '배당수익률 (TTM)',
    currentRatioTTM: '유동비율 (TTM)',
    netProfitMarginTTM: '순이익률 (TTM)',
    operatingProfitMarginTTM: '영업이익률 (TTM)',
    returnOnAssetsTTM: 'ROA (TTM)',
    priceToSalesRatioTTM: 'PSR (TTM)',
    enterpriseValueMultipleTTM: 'EV Multiple (TTM)',
    trscDt: '조회일자',
    trscTm: '조회시간',
};

// 값 포맷팅 (필드별 특수 포맷)
const formatFieldValue = (key, value) => {
    if (value === null || value === undefined || value === '') return '-';

    switch (key) {
        case 'marketCap':
        case 'volume':
            return formatNumberWithComma(value);
        case 'price':
        case 'lastAnnualDividend':
            return `$${typeof value === 'number' ? value.toFixed(2) : value}`;
        case 'beta':
        case 'peRatioTTM':
        case 'priceToBookRatioTTM':
        case 'priceToSalesRatioTTM':
        case 'enterpriseValueMultipleTTM':
        case 'currentRatioTTM':
            return typeof value === 'number' ? value.toFixed(2) : value;
        case 'returnOnEquityTTM':
        case 'returnOnAssetsTTM':
        case 'netProfitMarginTTM':
        case 'operatingProfitMarginTTM':
        case 'dividendYieldTTM':
        case 'debtEquityRatioTTM':
            return typeof value === 'number' ? `${(value * 100).toFixed(2)}%` : value;
        case 'trscDt':
            return formatDate(value);
        case 'trscTm':
            return formatTime(value);
        default:
            return String(value);
    }
};

// 테이블 컬럼 정의 (요청된 컬럼들만 표시)
const TABLE_COLUMNS = [
    {
        key: 'symbol',
        label: '심볼',
        width: '100px',
        sortable: true,
        sticky: true,
        headerClassName: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-left',
        render: (value, row, { onMouseEnter, onMouseLeave }) => (
            <span
                className="font-semibold text-slate-900 dark:text-white cursor-help"
                onMouseEnter={(e) => onMouseEnter(e, row?.companyName)}
                onMouseLeave={onMouseLeave}
            >
                {value}
            </span>
        ),
    },
    {
        key: 'companyName',
        label: '기업명',
        width: '280px',
        sortable: true,
        headerClassName: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-left text-slate-700 dark:text-slate-200',
    },
    {
        key: 'marketCap',
        label: '시가총액',
        width: '140px',
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right text-slate-600 dark:text-slate-300',
        render: (value) => formatNumberWithComma(value),
    },
    {
        key: 'sector',
        label: '섹터',
        width: '180px',
        sortable: true,
        hasDropdown: true,
        headerClassName: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-left text-slate-600 dark:text-slate-300',
    },
    {
        key: 'industry',
        label: '산업군',
        width: '220px',
        sortable: true,
        hasDropdown: true,
        headerClassName: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-left text-slate-600 dark:text-slate-300',
    },
    {
        key: 'beta',
        label: '베타',
        width: '80px',
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right text-slate-600 dark:text-slate-300',
        render: (value) => (value != null ? value.toFixed(3) : '-'),
    },
    {
        key: 'exchangeShortName',
        label: '거래소',
        width: '100px',
        sortable: true,
        hasDropdown: true,
        headerClassName: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-left',
        render: (value) =>
            value ? (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    {value}
                </span>
            ) : (
                '-'
            ),
    },
    {
        key: 'country',
        label: '국가',
        width: '90px',
        sortable: true,
        hasDropdown: true,
        headerClassName: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-left text-slate-600 dark:text-slate-300',
    },
    {
        key: 'trscDt',
        label: '조회일자',
        width: '110px',
        sortable: true,
        headerClassName: 'px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-center text-slate-600 dark:text-slate-300',
        render: (value) => formatDate(value),
    },
    {
        key: 'trscTm',
        label: '조회시간',
        width: '100px',
        sortable: true,
        headerClassName: 'px-4 py-3 pr-8 text-center text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 pr-8 whitespace-nowrap text-center text-slate-600 dark:text-slate-300',
        render: (value) => formatTime(value),
    },
];

/**
 * 미국 추천기업 페이지
 * - 매일 새벽 조회된 추천기업 데이터를 표시
 */
const AbroadRecommendedStock = () => {
    const [resultData, setResultData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ open: false, message: '', onConfirm: null });
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [columnFilters, setColumnFilters] = useState({});
    const [compValueData, setCompValueData] = useState({});
    const [showValueModal, setShowValueModal] = useState(false);
    const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });
    const [openDropdown, setOpenDropdown] = useState(null);
    const [detailModal, setDetailModal] = useState({ open: false, data: null });
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [maxCountInput, setMaxCountInput] = useState('');
    const [lastScheduleRun, setLastScheduleRun] = useState(null);

    const inFlight = useRef({ fetch: false, calc: false });
    const dropdownClosingRef = useRef(false);

    // 슈퍼관리자 여부 확인
    const isSuperAdmin = useMemo(() => {
        let storedRoles = [];
        try {
            const raw = localStorage.getItem('roles');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    storedRoles = parsed;
                }
            }
        } catch {
            storedRoles = [];
        }
        const effectiveRoles = storedRoles.map((r) => (r || '').toString().toUpperCase());
        return effectiveRoles.some((r) => r.includes('SUPER_ADMIN'));
    }, []);

    // 로컬스토리지에서 마지막 스케줄 실행 시간 확인 및 1시간 지난 값 삭제
    useEffect(() => {
        const storedTime = localStorage.getItem(SCHEDULE_RUN_KEY);
        if (storedTime) {
            const runTime = new Date(storedTime);
            const now = new Date();
            const hoursDiff = (now - runTime) / (1000 * 60 * 60);

            if (hoursDiff >= 1) {
                // 1시간 이상 지났으면 삭제
                localStorage.removeItem(SCHEDULE_RUN_KEY);
                setLastScheduleRun(null);
            } else {
                setLastScheduleRun(runTime);
            }
        }
    }, []);

    // 드롭다운용 고유값 계산
    const getUniqueValuesForColumn = useCallback(
        (targetKey) => {
            const dropdownColumns = TABLE_COLUMNS.filter((col) => col.hasDropdown).map((col) => col.key);
            if (!dropdownColumns.includes(targetKey)) return [];

            const otherFilters = Object.entries(columnFilters).filter(
                ([key, value]) => key !== targetKey && value !== ''
            );

            let dataToFilter = resultData;
            if (otherFilters.length > 0) {
                dataToFilter = resultData.filter((row) => {
                    return otherFilters.every(([key, filterValue]) => {
                        const cellValue = row[key];
                        if (cellValue == null) return false;
                        return String(cellValue).toLowerCase().includes(filterValue.toLowerCase());
                    });
                });
            }

            return dataToFilter
                .map((row) => row[targetKey])
                .filter((v) => v != null && v !== '')
                .filter((v, i, arr) => arr.indexOf(v) === i)
                .sort((a, b) => String(a).localeCompare(String(b)));
        },
        [resultData, columnFilters]
    );

    // 드롭다운 외부 클릭 시 닫기
    useEffect(() => {
        if (!openDropdown) return;
        const handleClickOutside = (e) => {
            if (!e.target.closest('.filter-dropdown-container')) {
                dropdownClosingRef.current = true;
                setOpenDropdown(null);
                setTimeout(() => {
                    dropdownClosingRef.current = false;
                }, 100);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openDropdown]);

    // 초기 데이터 로드
    useEffect(() => {
        fetchRecommendedStocks();
    }, []);

    // Alert 관련 함수
    const openAlert = (message, onConfirm) => {
        setAlertConfig({ open: true, message, onConfirm: onConfirm || null });
    };

    const handleCloseAlert = () => {
        const { onConfirm } = alertConfig;
        setAlertConfig({ open: false, message: '', onConfirm: null });
        if (onConfirm) onConfirm();
    };

    // 추천기업 데이터 조회
    const fetchRecommendedStocks = useCallback(async () => {
        if (inFlight.current.fetch) return;
        inFlight.current.fetch = true;

        setIsLoading(true);
        try {
            const { data, error } = await send('/dart/main/rem/usstock', {}, 'GET');

            if (!error && data && data.response) {
                const list = Array.isArray(data.response) ? data.response : [];
                setResultData(list);
                if (list.length === 0) {
                    openAlert('조회 결과가 없습니다.');
                }
            } else {
                setResultData([]);
                openAlert('데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
            }
        } catch (e) {
            setResultData([]);
            openAlert('요청 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
            inFlight.current.fetch = false;
        }
    }, []);

    // 필터링된 데이터
    const filteredData = useMemo(() => {
        const activeFilters = Object.entries(columnFilters).filter(([_, value]) => value !== '');
        if (activeFilters.length === 0) return resultData;

        return resultData.filter((row) => {
            return activeFilters.every(([key, filterValue]) => {
                const cellValue = row[key];
                if (cellValue == null) return false;
                const cellStr = String(cellValue).toLowerCase();
                const filterStr = filterValue.toLowerCase();
                return cellStr.includes(filterStr);
            });
        });
    }, [resultData, columnFilters]);

    // 정렬된 데이터
    const sortedData = useMemo(() => {
        if (!sortConfig.key) return filteredData;

        return [...filteredData].sort((a, b) => {
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
    }, [filteredData, sortConfig]);

    // 컬럼 필터 핸들러
    const handleColumnFilterChange = useCallback((key, value) => {
        setColumnFilters((prev) => ({
            ...prev,
            [key]: value,
        }));
    }, []);

    // 필터 초기화
    const clearColumnFilters = useCallback(() => {
        setColumnFilters({});
    }, []);

    // 정렬 핸들러
    const handleSort = useCallback((key) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    }, []);

    // 툴팁 핸들러
    const handleTooltipEnter = useCallback((e, text) => {
        if (!text) return;
        const rect = e.target.getBoundingClientRect();
        setTooltip({
            visible: true,
            text,
            x: rect.right + 8,
            y: rect.top + rect.height / 2,
        });
    }, []);

    const handleTooltipLeave = useCallback(() => {
        setTooltip((prev) => ({ ...prev, visible: false }));
    }, []);

    // 행 클릭 -> 상세정보 모달
    const handleRowClick = useCallback((row) => {
        if (dropdownClosingRef.current) return;
        setDetailModal({ open: true, data: row });
    }, []);

    // 체크박스 선택 핸들러
    const handleSelectRow = useCallback((symbol, checked) => {
        setSelectedRows((prev) => {
            const next = new Set(prev);
            if (checked) {
                next.add(symbol);
            } else {
                next.delete(symbol);
            }
            return next;
        });
    }, []);

    // 전체 선택/해제
    const handleSelectAll = useCallback((checked) => {
        if (checked) {
            const allSymbols = sortedData.map((row) => row.symbol);
            setSelectedRows(new Set(allSymbols));
        } else {
            setSelectedRows(new Set());
        }
    }, [sortedData]);

    // 선택된 심볼 배열
    const selectedSymbols = useMemo(() => {
        return sortedData.filter((row) => selectedRows.has(row.symbol)).map((row) => row.symbol);
    }, [sortedData, selectedRows]);

    // 전체 선택 여부
    const isAllSelected = useMemo(() => {
        return sortedData.length > 0 && sortedData.every((row) => selectedRows.has(row.symbol));
    }, [sortedData, selectedRows]);

    // 부분 선택 여부
    const isPartialSelected = useMemo(() => {
        return selectedRows.size > 0 && !isAllSelected;
    }, [selectedRows, isAllSelected]);

    // 대량 분석 모달 열기
    const handleOpenBulkModal = useCallback(() => {
        if (selectedSymbols.length === 0) {
            openAlert('분석할 기업을 선택해주세요.');
            return;
        }
        setShowBulkModal(true);
    }, [selectedSymbols]);

    // maxCount 입력값 유효성 검사
    const isMaxCountValid = useMemo(() => {
        if (maxCountInput === '') return false;
        const num = parseInt(maxCountInput, 10);
        return !isNaN(num) && num >= 0;
    }, [maxCountInput]);

    // 추천기업 스케줄 실행 (슈퍼관리자 전용)
    const handleRunSchedule = useCallback(async () => {
        if (!isMaxCountValid) return;

        const maxCount = parseInt(maxCountInput, 10);
        setIsLoading(true);
        setShowScheduleModal(false);

        try {
            const { data, error } = await send('/dart/schd/recommended-stocks', { maxCount }, 'POST');

            if (error) {
                if (data?.code === '40301') {
                    openAlert('접근 권한이 없습니다.');
                } else {
                    openAlert(data?.message || '스케줄 실행 중 오류가 발생했습니다.');
                }
            } else {
                // 성공 시 로컬스토리지에 실행 시간 저장
                const now = new Date();
                localStorage.setItem(SCHEDULE_RUN_KEY, now.toISOString());
                setLastScheduleRun(now);
                openAlert(`추천기업 조회 스케줄이 실행되었습니다.\n(maxCount=${maxCount})`);
            }
        } catch (e) {
            openAlert('요청 처리 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
            setMaxCountInput('');
        }
    }, [maxCountInput, isMaxCountValid]);

    // 상세정보 모달에서 분석 버튼 클릭
    const handleAnalyze = useCallback(async (symbol) => {
        if (!symbol?.trim()) {
            openAlert('심볼 정보가 존재하지 않습니다.');
            return;
        }

        if (inFlight.current.calc) return;
        inFlight.current.calc = true;

        setIsLoading(true);
        try {
            const { data, error } = await send(
                `/dart/main/cal/per_value/abroad/v3?symbol=${symbol}`,
                {},
                'GET'
            );

            const hasValid = !error && data && data.response && Object.keys(data.response).length > 0;
            if (hasValid) {
                setCompValueData(data.response);
                setShowValueModal(true);
            } else {
                setCompValueData({});
                openAlert('조회 결과가 존재하지 않거나 서버 응답을 받지 못했습니다.');
            }
        } catch (e) {
            setCompValueData({});
            openAlert('요청 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
            inFlight.current.calc = false;
        }
    }, []);

    return (
        <>
            <PageTitle />
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                    매일 새벽 자동으로 조회된 추천 기업 목록입니다. 행을 클릭하면 상세 정보를 볼 수 있습니다.
                </p>
                {isSuperAdmin && (
                    <div className="flex items-center gap-3">
                        {lastScheduleRun && (
                            <span className="text-xs text-amber-600 dark:text-amber-400">
                                마지막 수동 실행: {lastScheduleRun.toLocaleString('ko-KR')}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => setShowScheduleModal(true)}
                            disabled={isLoading}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            추천기업 조회
                        </button>
                    </div>
                )}
            </div>

            <Loading show={isLoading} />

            {/* 조회 결과 테이블 */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">추천 기업 목록</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={handleOpenBulkModal}
                            disabled={isLoading || selectedSymbols.length === 0}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            대량 분석 {selectedSymbols.length > 0 && `(${selectedSymbols.length})`}
                        </button>
                        {selectedRows.size > 0 && (
                            <button
                                type="button"
                                onClick={() => setSelectedRows(new Set())}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600"
                            >
                                선택 해제
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={fetchRecommendedStocks}
                            disabled={isLoading}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600"
                        >
                            새로고침
                        </button>
                        {Object.values(columnFilters).some((v) => v !== '') && (
                            <button
                                type="button"
                                onClick={clearColumnFilters}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600"
                            >
                                필터 초기화
                            </button>
                        )}
                        {resultData.length > 0 && (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 font-medium text-sm dark:bg-blue-900 dark:text-blue-200">
                                {filteredData.length !== resultData.length
                                    ? `${filteredData.length} / ${resultData.length}건`
                                    : `${resultData.length}건`}
                            </span>
                        )}
                    </div>
                </div>
                <div className="overflow-x-auto overflow-y-auto scrollbar-always max-h-[70vh]">
                    <table
                        className="text-sm divide-y divide-slate-200 dark:divide-slate-700"
                        style={{ width: '100%', tableLayout: 'fixed' }}
                    >
                        <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-700 to-slate-600 text-white">
                            <tr>
                                {/* 전체 선택 체크박스 */}
                                <th className="px-3 py-3 text-center w-[50px] sticky left-0 z-20 bg-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        ref={(el) => {
                                            if (el) el.indeterminate = isPartialSelected;
                                        }}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                </th>
                                {TABLE_COLUMNS.map((col) => (
                                    <th
                                        key={col.key}
                                        className={`${col.headerClassName} ${col.sortable ? 'cursor-pointer hover:bg-slate-500 select-none' : ''} ${col.sticky ? 'sticky left-[50px] z-20 bg-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]' : ''}`}
                                        style={{ width: col.width }}
                                        onClick={() => col.sortable && handleSort(col.key)}
                                    >
                                        <div className="flex items-center gap-1">
                                            <span className="flex-1">{col.label}</span>
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
                                {/* 체크박스 열 빈 셀 */}
                                <th className="px-3 py-2 w-[50px] sticky left-0 z-20 bg-slate-100 dark:bg-slate-700"></th>
                                {TABLE_COLUMNS.map((col) => (
                                    <th
                                        key={`filter-${col.key}`}
                                        className={`px-2 py-2 ${col.sticky ? 'sticky left-[50px] z-20 bg-slate-100 dark:bg-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]' : ''}`}
                                        style={{ width: col.width }}
                                    >
                                        <div className={`relative ${col.hasDropdown ? 'filter-dropdown-container' : ''}`}>
                                            <input
                                                type="text"
                                                value={columnFilters[col.key] || ''}
                                                onChange={(e) => handleColumnFilterChange(col.key, e.target.value)}
                                                onFocus={() => col.hasDropdown && setOpenDropdown(col.key)}
                                                placeholder="필터..."
                                                className={`w-full px-2 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-600 dark:border-slate-500 dark:text-white dark:placeholder-slate-400 ${col.hasDropdown ? 'pr-6' : ''}`}
                                            />
                                            {col.hasDropdown && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setOpenDropdown(openDropdown === col.key ? null : col.key)
                                                    }
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                >
                                                    <svg
                                                        className="w-3 h-3"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M19 9l-7 7-7-7"
                                                        />
                                                    </svg>
                                                </button>
                                            )}
                                            {col.hasDropdown &&
                                                openDropdown === col.key &&
                                                (() => {
                                                    const options = getUniqueValuesForColumn(col.key);
                                                    const filteredOptions = options.filter(
                                                        (v) =>
                                                            !columnFilters[col.key] ||
                                                            String(v)
                                                                .toLowerCase()
                                                                .includes(columnFilters[col.key].toLowerCase())
                                                    );
                                                    return (
                                                        options.length > 0 && (
                                                            <div className="absolute left-0 top-full mt-1 w-48 max-h-48 overflow-y-auto bg-white border border-slate-300 rounded shadow-lg z-50 dark:bg-slate-700 dark:border-slate-600">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        handleColumnFilterChange(col.key, '');
                                                                        setOpenDropdown(null);
                                                                    }}
                                                                    className="w-full px-3 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-600"
                                                                >
                                                                    (전체)
                                                                </button>
                                                                {filteredOptions.map((value) => (
                                                                    <button
                                                                        key={value}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            handleColumnFilterChange(col.key, String(value));
                                                                            setOpenDropdown(null);
                                                                        }}
                                                                        className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-600"
                                                                    >
                                                                        {value}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )
                                                    );
                                                })()}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200 dark:bg-slate-800 dark:divide-slate-700">
                            {sortedData.length > 0 ? (
                                sortedData.map((row, idx) => (
                                    <tr
                                        key={`${row.symbol}-${idx}`}
                                        className={`hover:bg-blue-50 cursor-pointer transition-colors dark:hover:bg-slate-700 ${selectedRows.has(row.symbol) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => !isLoading && handleRowClick(row)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                !isLoading && handleRowClick(row);
                                            }
                                        }}
                                    >
                                        {/* 행별 체크박스 - 클릭 시 선택만 */}
                                        <td
                                            className="px-3 py-3 text-center w-[50px] cursor-pointer sticky left-0 z-[5] bg-white dark:bg-slate-800"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelectRow(row.symbol, !selectedRows.has(row.symbol));
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.has(row.symbol)}
                                                onChange={() => { }}
                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none"
                                            />
                                        </td>
                                        {TABLE_COLUMNS.map((col) => {
                                            const value = row[col.key];
                                            const tooltipHandlers = {
                                                onMouseEnter: handleTooltipEnter,
                                                onMouseLeave: handleTooltipLeave,
                                            };
                                            const displayValue = col.render
                                                ? col.render(value, row, tooltipHandlers)
                                                : value ?? '-';

                                            // 심볼 컬럼은 클릭 시 선택만
                                            const isSymbolCol = col.key === 'symbol';

                                            return (
                                                <td
                                                    key={col.key}
                                                    className={`${col.cellClassName} ${col.sticky ? 'sticky left-[50px] z-[5] bg-white dark:bg-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''} ${isSymbolCol ? 'cursor-pointer' : ''}`}
                                                    style={{ width: col.width }}
                                                    onClick={isSymbolCol ? (e) => {
                                                        e.stopPropagation();
                                                        handleSelectRow(row.symbol, !selectedRows.has(row.symbol));
                                                    } : undefined}
                                                >
                                                    {displayValue}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td className="px-4 py-12 text-center" colSpan={TABLE_COLUMNS.length + 1}>
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
                                                {isLoading ? '데이터를 불러오는 중입니다...' : '조회된 데이터가 없습니다.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Alert 모달 */}
            <AlertModal open={alertConfig.open} message={alertConfig.message} onClose={handleCloseAlert} />

            {/* 상세정보 모달 */}
            <DetailInfoModal
                isOpen={detailModal.open}
                data={detailModal.data}
                onClose={() => setDetailModal({ open: false, data: null })}
                onAnalyze={handleAnalyze}
                isAnalyzing={isLoading}
            />

            {/* 기업가치 계산 결과 모달 */}
            <CompanyValueResultModal
                isOpen={showValueModal}
                onClose={() => setShowValueModal(false)}
                data={compValueData}
            />

            {/* 대량 분석 모달 */}
            <BulkQueryModal
                open={showBulkModal}
                onClose={() => setShowBulkModal(false)}
                initialSymbols={selectedSymbols}
            />

            {/* 추천기업 조회 스케줄 모달 (슈퍼관리자 전용) */}
            {showScheduleModal && (
                <>
                    <div className="fixed inset-0 z-[70] bg-black/50 dark:bg-black/70" onClick={() => setShowScheduleModal(false)} />
                    <div
                        className="fixed z-[80] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(360px,calc(100vw-32px))] rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-800"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">추천기업 조회 실행</h3>
                        <div className="mb-4">
                            <label className="block text-sm text-slate-600 dark:text-slate-300 mb-2">
                                조회 건수 (maxCount)
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={maxCountInput}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    // 숫자만 허용 (빈 문자열도 허용)
                                    if (val === '' || /^\d+$/.test(val)) {
                                        setMaxCountInput(val);
                                    }
                                }}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                placeholder="숫자를 입력하세요 (0 = 전체 조회)"
                            />
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                0: 전체 조회 / 그 외: 테스트용 (지정 건수만큼 조회)
                            </p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowScheduleModal(false);
                                    setMaxCountInput('');
                                }}
                                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={handleRunSchedule}
                                disabled={!isMaxCountValid}
                                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                실행
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* 커스텀 툴팁 */}
            {tooltip.visible && (
                <div
                    className="fixed z-[9999] px-2 py-1 text-xs bg-slate-800 text-white rounded shadow-lg whitespace-nowrap pointer-events-none"
                    style={{
                        left: tooltip.x,
                        top: tooltip.y,
                        transform: 'translateY(-50%)',
                    }}
                >
                    {tooltip.text}
                </div>
            )}
        </>
    );
};

/**
 * 상세정보 모달 컴포넌트
 */
const DetailInfoModal = ({ isOpen, data, onClose, onAnalyze, isAnalyzing }) => {
    const modalRef = useRef(null);

    // ESC 키 핸들러
    useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen || !data) return null;

    // 모달에 표시할 데이터 필드들 (순서 지정)
    const displayOrder = [
        'symbol',
        'companyName',
        'marketCap',
        'sector',
        'industry',
        'beta',
        'price',
        'lastAnnualDividend',
        'volume',
        'exchange',
        'exchangeShortName',
        'country',
        'peRatioTTM',
        'priceToBookRatioTTM',
        'returnOnEquityTTM',
        'debtEquityRatioTTM',
        'dividendYieldTTM',
        'currentRatioTTM',
        'netProfitMarginTTM',
        'operatingProfitMarginTTM',
        'returnOnAssetsTTM',
        'priceToSalesRatioTTM',
        'enterpriseValueMultipleTTM',
        'trscDt',
        'trscTm',
    ];

    // 데이터 정렬 (displayOrder 순서대로, 나머지는 뒤에)
    const sortedEntries = Object.entries(data).sort(([keyA], [keyB]) => {
        const indexA = displayOrder.indexOf(keyA);
        const indexB = displayOrder.indexOf(keyB);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    return (
        <>
            {/* 배경 오버레이 */}
            <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40" onClick={onClose} />

            {/* 모달 */}
            <div
                ref={modalRef}
                className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white shadow-xl rounded-lg max-h-[85vh] w-[min(700px,90vw)] overflow-hidden dark:bg-slate-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b bg-white z-10 dark:bg-slate-800 dark:border-slate-700">
                    <div>
                        <h2 className="text-lg font-semibold dark:text-white">기업 상세정보</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            {data.symbol} - {data.companyName}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                            onClick={() => onAnalyze(data.symbol)}
                            disabled={isAnalyzing}
                        >
                            {isAnalyzing && (
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            {isAnalyzing ? '분석 중...' : '분석'}
                        </button>
                        <button
                            className="text-sm px-2 py-1 border rounded hover:bg-gray-50 transition-colors dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                            onClick={onClose}
                        >
                            닫기 (Esc)
                        </button>
                    </div>
                </div>

                {/* 콘텐츠 */}
                <div className="p-4 overflow-y-auto max-h-[calc(85vh-60px)]">
                    {/* 주요 정보 하이라이트 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <HighlightCard label="심볼" value={data.symbol} />
                        <HighlightCard label="주가" value={`$${data.price?.toFixed(2) ?? '-'}`} />
                        <HighlightCard
                            label="시가총액"
                            value={data.marketCap ? `$${(data.marketCap / 1e9).toFixed(2)}B` : '-'}
                        />
                        <HighlightCard label="베타" value={data.beta?.toFixed(3) ?? '-'} />
                    </div>

                    {/* 전체 데이터 그리드 */}
                    <div className="rounded-lg border bg-slate-50 dark:bg-slate-700 dark:border-slate-600 p-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px]">
                            {sortedEntries.map(([key, value]) => (
                                <div
                                    key={key}
                                    className="flex items-start justify-between gap-3 border-b last:border-b-0 py-1.5 dark:border-slate-600"
                                >
                                    <div className="text-slate-500 whitespace-nowrap dark:text-slate-400">
                                        {FIELD_LABELS[key] || key}
                                    </div>
                                    <div className="text-right break-all font-medium dark:text-slate-200">
                                        {formatFieldValue(key, value)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

/**
 * 하이라이트 카드 컴포넌트
 */
const HighlightCard = ({ label, value }) => (
    <div className="rounded-lg border bg-white p-3 shadow-sm dark:bg-slate-700 dark:border-slate-600">
        <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
        <div className="mt-1 text-base font-semibold text-slate-900 dark:text-white truncate">{value}</div>
    </div>
);

export default AbroadRecommendedStock;
