import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { send } from '@/util/ClientUtil';
import PageTitle from '@/component/common/display/PageTitle';
import Loading from '@/component/common/display/Loading';
import AlertModal from '@/component/layouts/common/popup/AlertModal';
import InvestmentDetailModal, { FullDetailModal } from '@/pages/trade/popup/InvestmentDetailModal';

// 세션 스토리지 키
const SESSION_STORAGE_KEY = 'investmentEvaluationData';

// 등급별 색상
const getGradeStyle = (grade) => {
    const styles = {
        'A+': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
        'A': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'B+': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        'B': 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
        'C+': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        'C': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
        'D': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        'F': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return styles[grade] || 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
};

// 테이블 컬럼 정의
const TABLE_COLUMNS = [
    {
        key: 'symbol',
        label: '심볼',
        width: '90px',
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
        width: '200px',
        sortable: true,
        headerClassName: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-left text-slate-700 dark:text-slate-200',
    },
    {
        key: 'grade',
        label: '등급',
        width: '70px',
        sortable: true,
        hasDropdown: true,
        headerClassName: 'px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-center',
        render: (value) => (
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${getGradeStyle(value)}`}>
                {value || '-'}
            </span>
        ),
    },
    {
        key: 'totalScore',
        label: '총점',
        width: '80px',
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right font-semibold text-slate-700 dark:text-slate-200',
        render: (value) => (value != null ? value.toFixed(1) : '-'),
    },
    {
        key: 'currentPrice',
        label: '현재가',
        width: '100px',
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right text-slate-600 dark:text-slate-300',
        render: (value) => value ? `$${value}` : '-',
    },
    {
        key: 'fairValue',
        label: '적정가치',
        width: '100px',
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right text-slate-600 dark:text-slate-300',
        render: (value) => value ? `$${value}` : '-',
    },
    {
        key: 'priceGapPercent',
        label: '가격차이율',
        width: '100px',
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right',
        render: (value) => {
            if (!value) return '-';
            const numValue = parseFloat(value);
            const isPositive = numValue > 0;
            return (
                <span className={isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {isPositive ? '+' : ''}{value}
                </span>
            );
        },
    },
    {
        key: 'sector',
        label: '섹터',
        width: '150px',
        sortable: true,
        hasDropdown: true,
        headerClassName: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-left text-slate-600 dark:text-slate-300',
    },
    {
        key: 'exchange',
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
        width: '80px',
        sortable: true,
        hasDropdown: true,
        headerClassName: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-left',
        render: (value) =>
            value ? (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                    {value}
                </span>
            ) : (
                '-'
            ),
    },
    {
        key: 'recommendation',
        label: '추천',
        width: '350px',
        sortable: false,
        headerClassName: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 text-left text-slate-600 dark:text-slate-300 text-xs',
    },
];

/**
 * 투자판단 페이지
 */
const InvestmentEvaluation = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    // URL 파라미터에서 symbol 추출
    const symbolFromUrl = searchParams.get('symbol');

    // 세션 스토리지에서 초기값 로드
    const getInitialData = () => {
        try {
            const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return {
                    symbolInput: parsed.symbolInput || '',
                    resultData: parsed.resultData || [],
                };
            }
        } catch {
            // 파싱 실패 시 기본값
        }
        return { symbolInput: '', resultData: [] };
    };

    const initialData = getInitialData();
    const [symbolInput, setSymbolInput] = useState(symbolFromUrl || initialData.symbolInput);
    const [resultData, setResultData] = useState(initialData.resultData);
    const [isLoading, setIsLoading] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ open: false, message: '', onConfirm: null });
    const [sortConfig, setSortConfig] = useState({ key: 'totalScore', direction: 'desc' });
    const [columnFilters, setColumnFilters] = useState({});
    const [openDropdown, setOpenDropdown] = useState(null);
    const [detailModal, setDetailModal] = useState({ open: false, data: null });
    const [fullDetailModal, setFullDetailModal] = useState({ open: false, data: null });
    const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });
    const [progress, setProgress] = useState({ current: 0, total: 0, status: '', waiting: false, remainingSeconds: 0, removedDuplicates: 0 });

    const inFlight = useRef({ fetch: false });
    const dropdownClosingRef = useRef(false);
    const abortRef = useRef(false);

    // 입력된 티커 정보 계산 (중복 감지 포함)
    const symbolInfo = useMemo(() => {
        if (!symbolInput.trim()) {
            return { total: 0, unique: 0, duplicates: [], duplicateCount: 0 };
        }
        const allSymbols = symbolInput
            .split(/[\n,\s]+/)
            .map((s) => s.trim().toUpperCase())
            .filter((s) => s.length > 0);

        const symbolCountMap = {};
        allSymbols.forEach((s) => {
            symbolCountMap[s] = (symbolCountMap[s] || 0) + 1;
        });

        const duplicates = Object.entries(symbolCountMap)
            .filter(([_, count]) => count > 1)
            .map(([symbol, count]) => ({ symbol, count }));

        const uniqueSymbols = [...new Set(allSymbols)];

        return {
            total: allSymbols.length,
            unique: uniqueSymbols.length,
            duplicates,
            duplicateCount: allSymbols.length - uniqueSymbols.length,
        };
    }, [symbolInput]);

    // 세션 스토리지에 데이터 저장
    useEffect(() => {
        if (resultData.length > 0) {
            try {
                sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
                    symbolInput,
                    resultData,
                }));
            } catch {
                // 저장 실패 무시
            }
        }
    }, [symbolInput, resultData]);

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

    // Alert 관련 함수
    const openAlert = (message, onConfirm) => {
        setAlertConfig({ open: true, message, onConfirm: onConfirm || null });
    };

    const handleCloseAlert = () => {
        const { onConfirm } = alertConfig;
        setAlertConfig({ open: false, message: '', onConfirm: null });
        if (onConfirm) onConfirm();
    };

    // 심볼 파싱
    const parseSymbols = (input) => {
        return input
            .split(/[\n,\s]+/)
            .map((s) => s.trim().toUpperCase())
            .filter((s) => s.length > 0);
    };

    // 배열을 n개씩 청크로 나누기
    const chunkArray = (arr, size) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    };

    // 대기 함수 (카운트다운 포함)
    const waitWithCountdown = async (seconds) => {
        for (let i = seconds; i > 0; i--) {
            if (abortRef.current) return false;
            setProgress((prev) => ({ ...prev, waiting: true, remainingSeconds: i }));
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        setProgress((prev) => ({ ...prev, waiting: false, remainingSeconds: 0 }));
        return true;
    };

    // 분석 실행 (50개씩 분할)
    const handleAnalyze = useCallback(async () => {
        const allSymbols = parseSymbols(symbolInput);
        if (allSymbols.length === 0) {
            openAlert('분석할 티커를 입력해주세요.');
            return;
        }

        // 중복 제거
        const symbols = [...new Set(allSymbols)];
        const removedCount = allSymbols.length - symbols.length;

        if (inFlight.current.fetch) return;
        inFlight.current.fetch = true;
        abortRef.current = false;

        const BATCH_SIZE = 50;
        const WAIT_SECONDS = 15;
        const chunks = chunkArray(symbols, BATCH_SIZE);
        const totalChunks = chunks.length;

        setIsLoading(true);
        setResultData([]);
        setProgress({ current: 0, total: totalChunks, status: '', waiting: false, remainingSeconds: 0, removedDuplicates: removedCount });

        const allResults = [];

        try {
            for (let i = 0; i < chunks.length; i++) {
                if (abortRef.current) {
                    setProgress((prev) => ({ ...prev, status: '중지됨' }));
                    break;
                }

                const chunk = chunks[i];
                const startIdx = i * BATCH_SIZE + 1;
                const endIdx = Math.min((i + 1) * BATCH_SIZE, symbols.length);

                setProgress((prev) => ({
                    ...prev,
                    current: i + 1,
                    status: `${startIdx}~${endIdx}번째 조회 중...`,
                    waiting: false,
                }));

                try {
                    const { data, error } = await send('/dart/main/evaluate/stocks', { symbols: chunk }, 'POST');

                    if (!error && data && data.response) {
                        const list = Array.isArray(data.response) ? data.response : [];
                        allResults.push(...list);
                        setResultData([...allResults]);
                    }
                } catch (e) {
                    // 개별 청크 실패 시 계속 진행
                }

                // 마지막 청크가 아니고 중지되지 않았으면 대기
                if (i < chunks.length - 1 && !abortRef.current) {
                    const shouldContinue = await waitWithCountdown(WAIT_SECONDS);
                    if (!shouldContinue) {
                        setProgress((prev) => ({ ...prev, status: '중지됨', waiting: false }));
                        break;
                    }
                }
            }

            if (!abortRef.current) {
                setProgress((prev) => ({ ...prev, status: '완료', waiting: false }));
            }

            if (allResults.length === 0) {
                openAlert('분석 결과가 없습니다.');
            }
        } catch (e) {
            openAlert('요청 처리 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
            inFlight.current.fetch = false;
            // 2초 후 진행상태 초기화
            setTimeout(() => {
                setProgress({ current: 0, total: 0, status: '', waiting: false, remainingSeconds: 0, removedDuplicates: 0 });
            }, 2000);
        }
    }, [symbolInput]);

    // 분석 중지
    const handleStopAnalyze = useCallback(() => {
        abortRef.current = true;
        setProgress((prev) => ({ ...prev, status: '중지 중...', waiting: false }));
    }, []);

    // URL 파라미터에서 symbol이 있으면 자동 조회
    useEffect(() => {
        if (symbolFromUrl && !isLoading && resultData.length === 0) {
            // URL 파라미터 제거
            setSearchParams({});
            // 자동 조회 실행
            handleAnalyze();
        }
    }, [symbolFromUrl, isLoading, resultData.length, handleAnalyze, setSearchParams]);

    // 필터링된 데이터
    // 지원 문법:
    // - 일반 검색: "fin" → fin 포함된 데이터
    // - 제외 검색: "!fin" → fin 포함된 데이터 제외
    // - OR 검색: "fin|tech" → fin 또는 tech 포함된 데이터
    // - AND 검색: "fin&tech" → fin과 tech 모두 포함된 데이터
    // - 제외 OR 검색: "!fin|tech" → fin 또는 tech 포함된 데이터 제외 (= fin도 제외, tech도 제외)
    // - 제외 AND 검색: "!fin&tech" → fin도 제외, tech도 제외
    const filteredData = useMemo(() => {
        const activeFilters = Object.entries(columnFilters).filter(([_, value]) => value !== '');
        if (activeFilters.length === 0) return resultData;

        return resultData.filter((row) => {
            return activeFilters.every(([key, filterValue]) => {
                const cellValue = row[key];
                if (cellValue == null) return false;
                const cellStr = String(cellValue).toLowerCase();

                // 제외 검색 (!로 시작)
                const isExclude = filterValue.startsWith('!');
                const actualFilter = isExclude ? filterValue.slice(1) : filterValue;

                // AND 검색 (&로 구분)
                if (actualFilter.includes('&')) {
                    const andTerms = actualFilter.split('&').map(t => t.trim().toLowerCase()).filter(t => t);
                    if (isExclude) {
                        // !a&b = a 제외 AND b 제외 (둘 중 하나라도 포함되면 제외)
                        return andTerms.every(term => !cellStr.includes(term));
                    } else {
                        // a&b = a 포함 AND b 포함
                        return andTerms.every(term => cellStr.includes(term));
                    }
                }

                // OR 검색 (|로 구분)
                if (actualFilter.includes('|')) {
                    const orTerms = actualFilter.split('|').map(t => t.trim().toLowerCase()).filter(t => t);
                    if (isExclude) {
                        // !a|b = a 제외 AND b 제외 (둘 중 하나라도 포함되면 제외)
                        return orTerms.every(term => !cellStr.includes(term));
                    } else {
                        // a|b = a 포함 OR b 포함
                        return orTerms.some(term => cellStr.includes(term));
                    }
                }

                // 일반 검색
                const filterStr = actualFilter.toLowerCase();
                const matches = cellStr.includes(filterStr);
                return isExclude ? !matches : matches;
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

            // 숫자 정렬 (문자열 숫자도 처리)
            const aNum = typeof aVal === 'string' ? parseFloat(aVal) : aVal;
            const bNum = typeof bVal === 'string' ? parseFloat(bVal) : bVal;

            if (!isNaN(aNum) && !isNaN(bNum)) {
                return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
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

    // 전체 상세보기 열기
    const handleOpenFullDetail = useCallback((data) => {
        setFullDetailModal({ open: true, data });
    }, []);

    // Enter 키로 분석 실행
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleAnalyze();
        }
    };

    return (
        <>
            <PageTitle />
            <div className="mb-6">
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                    티커 심볼을 입력하고 분석 버튼을 눌러 투자 판단 정보를 확인하세요. 여러 티커는 줄바꿈, 쉼표, 공백으로 구분합니다.
                </p>

                {/* 입력 영역 */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 dark:bg-slate-800 dark:border-slate-700">
                    <div className="flex flex-col gap-3">
                        <textarea
                            value={symbolInput}
                            onChange={(e) => setSymbolInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="티커 심볼 입력 (예: AAPL, MSFT, GOOGL)"
                            rows={6}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400 resize-none"
                        />
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    Ctrl + Enter로 분석 실행
                                </span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded ${symbolInfo.total > 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                    {symbolInfo.duplicateCount > 0 ? (
                                        <>
                                            {symbolInfo.unique}개 (중복 {symbolInfo.duplicateCount}개 제외)
                                        </>
                                    ) : (
                                        <>{symbolInfo.total}개 입력</>
                                    )}
                                    {symbolInfo.unique > 50 && (
                                        <span className="ml-1 text-amber-600 dark:text-amber-400">
                                            ({Math.ceil(symbolInfo.unique / 50)}회 분할조회)
                                        </span>
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {isLoading && progress.total > 1 && (
                                    <button
                                        type="button"
                                        onClick={handleStopAnalyze}
                                        disabled={progress.status === '중지 중...'}
                                        className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                                            progress.status === '중지 중...'
                                                ? 'bg-slate-400 text-white cursor-not-allowed'
                                                : 'bg-red-600 text-white hover:bg-red-700'
                                        }`}
                                    >
                                        {progress.status === '중지 중...' ? (
                                            <>
                                                <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                중지 중...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                중지
                                            </>
                                        )}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleAnalyze}
                                    disabled={isLoading || !symbolInput.trim()}
                                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            분석 중...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                            분석
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* 중복 심볼 경고 */}
                        {symbolInfo.duplicates.length > 0 && (
                            <div className="mt-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
                                <div className="flex items-start gap-2">
                                    <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <div className="flex-1">
                                        <div className="text-xs font-medium text-amber-800 dark:text-amber-200">
                                            중복 심볼 {symbolInfo.duplicates.length}종 발견 (분석 시 자동 제거됨)
                                        </div>
                                        <div className="mt-1 text-xs text-amber-700 dark:text-amber-300 flex flex-wrap gap-1">
                                            {symbolInfo.duplicates.slice(0, 10).map(({ symbol, count }) => (
                                                <span key={symbol} className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
                                                    {symbol} <span className="ml-0.5 text-amber-600 dark:text-amber-400">×{count}</span>
                                                </span>
                                            ))}
                                            {symbolInfo.duplicates.length > 10 && (
                                                <span className="text-amber-600 dark:text-amber-400">
                                                    외 {symbolInfo.duplicates.length - 10}개
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 진행 상태 표시 */}
                        {progress.total > 1 && (
                            <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                            진행 상황: {progress.current} / {progress.total} 배치
                                        </span>
                                        {progress.removedDuplicates > 0 && (
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200">
                                                중복 {progress.removedDuplicates}개 제거됨
                                            </span>
                                        )}
                                    </div>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                        progress.status === '완료' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' :
                                        progress.status === '중지됨' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' :
                                        'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                                    }`}>
                                        {progress.waiting ? `대기 중... ${progress.remainingSeconds}초` : progress.status}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2 dark:bg-slate-600">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    ></div>
                                </div>
                                {progress.waiting && (
                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                        API 제한으로 인해 다음 배치 요청 전 대기 중입니다...
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 분할 조회 시에는 진행 상태 표시로 대체 */}
            <Loading show={isLoading && progress.total <= 1} />

            {/* 분석 결과 테이블 */}
            {resultData.length > 0 && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">분석 결과</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                            {Object.values(columnFilters).some((v) => v !== '') && (
                                <button
                                    type="button"
                                    onClick={clearColumnFilters}
                                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600"
                                >
                                    필터 초기화
                                </button>
                            )}
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 font-medium text-sm dark:bg-blue-900 dark:text-blue-200">
                                {filteredData.length !== resultData.length
                                    ? `${filteredData.length} / ${resultData.length}건`
                                    : `${resultData.length}건`}
                            </span>
                        </div>
                    </div>
                    <div className="overflow-x-auto overflow-y-auto scrollbar-always max-h-[70vh]">
                        <table
                            className="text-sm divide-y divide-slate-200 dark:divide-slate-700"
                            style={{ width: '100%', tableLayout: 'fixed' }}
                        >
                            <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-700 to-slate-600 text-white">
                                <tr>
                                    {TABLE_COLUMNS.map((col) => (
                                        <th
                                            key={col.key}
                                            className={`${col.headerClassName} ${col.sortable ? 'cursor-pointer hover:bg-slate-500 select-none' : ''} ${col.sticky ? 'sticky left-0 z-20 bg-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]' : ''}`}
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
                                    {TABLE_COLUMNS.map((col) => (
                                        <th
                                            key={`filter-${col.key}`}
                                            className={`px-2 py-2 ${col.sticky ? 'sticky left-0 z-20 bg-slate-100 dark:bg-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]' : ''}`}
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
                                {sortedData.map((row, idx) => (
                                    <tr
                                        key={`${row.symbol}-${idx}`}
                                        className="hover:bg-blue-50 cursor-pointer transition-colors dark:hover:bg-slate-700"
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
                                        {TABLE_COLUMNS.map((col) => {
                                            const value = row[col.key];
                                            const tooltipHandlers = {
                                                onMouseEnter: handleTooltipEnter,
                                                onMouseLeave: handleTooltipLeave,
                                            };
                                            const displayValue = col.render ? col.render(value, row, tooltipHandlers) : value ?? '-';

                                            return (
                                                <td
                                                    key={col.key}
                                                    className={`${col.cellClassName} ${col.sticky ? 'sticky left-0 z-[5] bg-white dark:bg-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''}`}
                                                    style={{ width: col.width }}
                                                >
                                                    {displayValue}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Alert 모달 */}
            <AlertModal open={alertConfig.open} message={alertConfig.message} onClose={handleCloseAlert} />

            {/* 상세정보 모달 (A) */}
            <InvestmentDetailModal
                isOpen={detailModal.open}
                data={detailModal.data}
                onClose={() => setDetailModal({ open: false, data: null })}
                onOpenFullDetail={handleOpenFullDetail}
            />

            {/* 전체 상세정보 모달 (B) */}
            <FullDetailModal
                isOpen={fullDetailModal.open}
                data={fullDetailModal.data}
                onClose={() => setFullDetailModal({ open: false, data: null })}
            />

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

export default InvestmentEvaluation;
