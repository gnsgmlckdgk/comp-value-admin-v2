import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { send } from '@/util/ClientUtil';
import PageTitle from '@/component/common/display/PageTitle';
import Loading from '@/component/common/display/Loading';
import AlertModal from '@/component/layouts/common/popup/AlertModal';
import CompanyInfoModal from '@/pages/trade/popup/CompanyInfoModal';
import StockChartModal from '@/pages/trade/popup/StockChartModal';

// 세션 스토리지 키
const SESSION_STORAGE_KEY = 'investmentEvaluationData';

// 숫자를 천 단위 콤마 포맷으로 변환
const formatNumberWithComma = (value) => {
    if (value === null || value === '' || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    return num.toLocaleString('en-US');
};

// 필드 레이블 매핑 (영문 -> 한글)
const FIELD_LABELS = {
    symbol: '심볼',
    companyName: '기업명',
    currentPrice: '현재가',
    fairValue: '적정가치',
    priceDifference: '가격차이',
    priceGapPercent: '가격차이율',
    totalScore: '총점',
    grade: '등급',
    recommendation: '추천',
    peg: 'PEG',
    per: 'PER',
    sector: '섹터',
    industry: '산업군',
    beta: '베타',
    exchange: '거래소',
    country: '국가',
    marketCap: '시가총액',
    step1Score: '1단계 점수',
    step2Score: '2단계 점수',
    step3Score: '3단계 점수',
    step4Score: '4단계 점수',
};

// resultDetail 필드 레이블 매핑
const RESULT_DETAIL_LABELS = {
    '단위': '단위',
    '영업이익_전전기': '영업이익 (전전기)',
    '영업이익_전기': '영업이익 (전기)',
    '영업이익_당기': '영업이익 (당기)',
    '영업이익_합계': '영업이익 합계',
    '영업이익_평균': '영업이익 평균',
    '유동자산합계': '유동자산 합계',
    '유동부채합계': '유동부채 합계',
    '유동비율': '유동비율',
    '투자자산_비유동자산내': '투자자산 (비유동자산내)',
    '고정부채': '고정부채',
    '발행주식수': '발행주식수',
    '영업이익성장률': '영업이익 성장률',
    '성장률보정PER': '성장률 보정 PER',
    '무형자산': '무형자산',
    '연구개발비_당기': '연구개발비 (당기)',
    '연구개발비_전기': '연구개발비 (전기)',
    '연구개발비_전전기': '연구개발비 (전전기)',
    '연구개발비_평균': '연구개발비 평균',
    '총부채': '총부채',
    '현금성자산': '현금성자산',
    '순부채': '순부채',
    '계산_사업가치': '계산 - 사업가치',
    '계산_재산가치': '계산 - 재산가치',
    '계산_부채': '계산 - 부채',
    '계산_기업가치': '계산 - 기업가치',
    '예외메세지_영업이익': '예외메세지 (영업이익)',
    '예외메시지_발행주식수': '예외메세지 (발행주식수)',
    '수익가치계산불가': '수익가치 계산불가',
    '적자기업': '적자기업',
    '매출기반평가': '매출기반 평가',
    '흑자전환기업': '흑자전환 기업',
    '매출액': '매출액',
    '매출성장률': '매출 성장률',
    '매출성장률보정계수': '매출성장률 보정계수',
    'eps성장률': 'EPS 성장률',
    'per': 'PER',
    'peg': 'PEG',
    'psr': 'PSR',
};

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
    const [symbolInput, setSymbolInput] = useState(initialData.symbolInput);
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
            <DetailInfoModal
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

/**
 * 상세정보 모달 컴포넌트 (A)
 */
const DetailInfoModal = ({ isOpen, data, onClose, onOpenFullDetail }) => {
    const modalRef = useRef(null);
    const [companyInfoModal, setCompanyInfoModal] = useState({ open: false, symbol: null });
    const [chartModal, setChartModal] = useState({ open: false, symbol: null, companyName: null });

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

    const stepDetails = data.stepDetails || [];

    // 기업 정보 모달 열기
    const handleOpenCompanyInfo = () => {
        setCompanyInfoModal({ open: true, symbol: data.symbol });
    };

    // 차트 모달 열기
    const handleOpenChart = () => {
        setChartModal({ open: true, symbol: data.symbol, companyName: data.companyName });
    };

    return (
        <>
            {/* 배경 오버레이 */}
            <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40" onClick={onClose} />

            {/* 모달 */}
            <div
                ref={modalRef}
                className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white shadow-xl rounded-lg max-h-[85vh] w-[min(800px,90vw)] overflow-hidden dark:bg-slate-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b bg-white z-10 dark:bg-slate-800 dark:border-slate-700">
                    <div>
                        <h2 className="text-lg font-semibold dark:text-white">투자 판단 상세</h2>
                        <button
                            type="button"
                            onClick={handleOpenCompanyInfo}
                            className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer transition-colors flex items-center gap-1"
                        >
                            <span>{data.symbol} - {data.companyName}</span>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                            onClick={() => onOpenFullDetail(data)}
                        >
                            자세히 보기
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
                    {/* 요약 정보 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <HighlightCard label="등급" value={data.grade} isGrade />
                        <HighlightCard label="총점" value={`${data.totalScore?.toFixed(1) ?? '-'} / 100`} />
                        <HighlightCard
                            label="현재가"
                            value={data.currentPrice ? `$${data.currentPrice}` : '-'}
                            onClick={data.currentPrice ? handleOpenChart : null}
                            clickable={!!data.currentPrice}
                        />
                        <HighlightCard label="적정가치" value={data.fairValue ? `$${data.fairValue}` : '-'} />
                    </div>

                    {/* 추천 */}
                    <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                        <div className="text-sm font-medium text-blue-800 dark:text-blue-200">{data.recommendation || '-'}</div>
                    </div>

                    {/* 가격 정보 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <InfoCard label="가격차이" value={data.priceDifference ? `$${data.priceDifference}` : '-'} />
                        <InfoCard label="가격차이율" value={data.priceGapPercent || '-'} />
                        <InfoCard label="PER" value={data.per ? parseFloat(data.per).toFixed(2) : '-'} />
                        <InfoCard label="PEG" value={data.peg || '-'} />
                    </div>

                    {/* 기업 정보 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <InfoCard label="섹터" value={data.sector || '-'} />
                        <InfoCard label="산업군" value={data.industry || '-'} />
                        <InfoCard label="거래소" value={data.exchange || '-'} />
                        <InfoCard label="시가총액" value={data.marketCap || '-'} />
                    </div>

                    {/* 단계별 점수 */}
                    <div className="mb-4">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">단계별 평가</h4>
                        <div className="space-y-3">
                            {stepDetails.map((step) => (
                                <StepDetailCard key={step.stepNumber} step={step} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 기업 정보 모달 */}
            <CompanyInfoModal
                isOpen={companyInfoModal.open}
                onClose={() => setCompanyInfoModal({ open: false, symbol: null })}
                symbol={companyInfoModal.symbol}
            />

            {/* 차트 모달 */}
            <StockChartModal
                isOpen={chartModal.open}
                onClose={() => setChartModal({ open: false, symbol: null, companyName: null })}
                symbol={chartModal.symbol}
                companyName={chartModal.companyName}
            />
        </>
    );
};

/**
 * 전체 상세정보 모달 컴포넌트 (B)
 */
const FullDetailModal = ({ isOpen, data, onClose }) => {
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

    const resultDetail = data.resultDetail || {};

    return (
        <>
            {/* 배경 오버레이 */}
            <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[60]" onClick={onClose} />

            {/* 모달 */}
            <div
                ref={modalRef}
                className="fixed z-[70] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white shadow-xl rounded-lg max-h-[90vh] w-[min(900px,95vw)] overflow-hidden dark:bg-slate-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b bg-white z-10 dark:bg-slate-800 dark:border-slate-700">
                    <div>
                        <h2 className="text-lg font-semibold dark:text-white">전체 응답 데이터</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            {data.symbol} - {data.companyName}
                        </p>
                    </div>
                    <button
                        className="text-sm px-2 py-1 border rounded hover:bg-gray-50 transition-colors dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                        onClick={onClose}
                    >
                        닫기 (Esc)
                    </button>
                </div>

                {/* 콘텐츠 */}
                <div className="p-4 overflow-y-auto max-h-[calc(90vh-60px)]">
                    {/* 기본 정보 */}
                    <div className="mb-6">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            기본 정보
                        </h4>
                        <div className="rounded-lg border bg-slate-50 dark:bg-slate-700 dark:border-slate-600 p-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[13px]">
                                {Object.entries(FIELD_LABELS).map(([key, label]) => {
                                    if (key.startsWith('step') || !data.hasOwnProperty(key)) return null;
                                    const value = data[key];
                                    const displayValue = value ?? '-';
                                    const valueStr = String(displayValue);
                                    return (
                                        <div
                                            key={key}
                                            className="flex items-start justify-between gap-3 border-b last:border-b-0 py-1.5 dark:border-slate-600 group relative"
                                        >
                                            <div className="text-slate-500 whitespace-nowrap dark:text-slate-400">
                                                {label}
                                            </div>
                                            <div className="text-right font-medium dark:text-slate-200 truncate max-w-[150px]" title={valueStr}>
                                                {displayValue}
                                            </div>
                                            {valueStr.length > 20 && (
                                                <div className="absolute right-0 bottom-full mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 max-w-[280px] whitespace-normal break-all pointer-events-none">
                                                    {valueStr}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* 단계별 점수 */}
                    <div className="mb-6">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            단계별 점수
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <InfoCard label="1단계 (위험신호)" value={`${data.step1Score ?? '-'} / 20`} />
                            <InfoCard label="2단계 (신뢰도)" value={`${data.step2Score ?? '-'} / 25`} />
                            <InfoCard label="3단계 (밸류에이션)" value={`${data.step3Score ?? '-'} / 40`} />
                            <InfoCard label="4단계 (영업이익추세)" value={`${data.step4Score ?? '-'} / 15`} />
                        </div>
                    </div>

                    {/* 결과 상세 (resultDetail) */}
                    <div className="mb-6">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                            결과 상세 (resultDetail)
                        </h4>
                        <div className="rounded-lg border bg-slate-50 dark:bg-slate-700 dark:border-slate-600 p-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[13px]">
                                {Object.entries(resultDetail).map(([key, value]) => {
                                    const formattedValue = formatResultDetailValue(key, value);
                                    const valueStr = String(formattedValue);
                                    return (
                                        <div
                                            key={key}
                                            className="flex items-start justify-between gap-3 border-b last:border-b-0 py-1.5 dark:border-slate-600 group relative"
                                        >
                                            <div className="text-slate-500 whitespace-nowrap dark:text-slate-400">
                                                {RESULT_DETAIL_LABELS[key] || key}
                                            </div>
                                            <div className="text-right font-medium dark:text-slate-200 truncate max-w-[150px]" title={valueStr}>
                                                {formattedValue}
                                            </div>
                                            {valueStr.length > 15 && (
                                                <div className="absolute right-0 bottom-full mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 max-w-[280px] whitespace-normal break-all pointer-events-none">
                                                    {valueStr}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* 단계별 상세 설명 */}
                    {data.stepDetails && data.stepDetails.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                                단계별 상세 설명
                            </h4>
                            <div className="space-y-3">
                                {data.stepDetails.map((step) => (
                                    <div key={step.stepNumber} className="rounded-lg border bg-slate-50 dark:bg-slate-700 dark:border-slate-600 p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="font-medium text-slate-700 dark:text-slate-200">
                                                {step.stepNumber}단계: {step.stepName}
                                            </div>
                                            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                                {step.score} / {step.maxScore}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{step.description}</p>
                                        <div className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 rounded p-2">
                                            {step.details}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

// resultDetail 값 포맷팅
const formatResultDetailValue = (key, value) => {
    if (value === null || value === undefined || value === '' || value === 'N/A') return '-';

    // boolean 값
    if (typeof value === 'boolean') {
        return value ? '예' : '아니오';
    }

    // 비율 값
    if (key.includes('성장률') || key.includes('비율') || key === 'peg' || key === 'per' || key === 'psr') {
        const num = parseFloat(value);
        if (!isNaN(num)) {
            if (key.includes('성장률')) {
                return `${(num * 100).toFixed(2)}%`;
            }
            return num.toFixed(4);
        }
    }

    // 큰 숫자 포맷
    const num = parseFloat(value);
    if (!isNaN(num) && num > 1000000) {
        return formatNumberWithComma(num);
    }

    return String(value);
};

/**
 * 하이라이트 카드 컴포넌트
 */
const HighlightCard = ({ label, value, isGrade, onClick, clickable }) => {
    const CardWrapper = clickable ? 'button' : 'div';
    return (
        <CardWrapper
            type={clickable ? 'button' : undefined}
            onClick={clickable ? onClick : undefined}
            className={`rounded-lg border bg-white p-3 shadow-sm dark:bg-slate-700 dark:border-slate-600 group relative text-left w-full ${
                clickable
                    ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900/30 dark:hover:border-blue-600 transition-colors ring-0 hover:ring-2 hover:ring-blue-200 dark:hover:ring-blue-800'
                    : ''
            }`}
        >
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                {label}
                {clickable && (
                    <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3m0 0l3 3m-3-3v8m0-14a9 9 0 110 18 9 9 0 010-18z" />
                    </svg>
                )}
            </div>
            <div className={`mt-1 text-base font-semibold text-slate-900 dark:text-white truncate ${clickable ? 'group-hover:text-blue-600 dark:group-hover:text-blue-400' : ''}`}>
                {isGrade ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-sm font-bold ${getGradeStyle(value)}`}>
                        {value || '-'}
                    </span>
                ) : (
                    <span className="flex items-center gap-1">
                        {value}
                        {clickable && (
                            <svg className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        )}
                    </span>
                )}
            </div>
            {/* 툴팁 */}
            {value && String(value).length > 15 && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 max-w-xs whitespace-normal break-all pointer-events-none">
                    {value}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
                </div>
            )}
        </CardWrapper>
    );
};

/**
 * 정보 카드 컴포넌트
 */
const InfoCard = ({ label, value }) => (
    <div className="rounded-lg border bg-slate-50 p-2.5 dark:bg-slate-700 dark:border-slate-600 group relative">
        <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
        <div className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{value}</div>
        {/* 툴팁 */}
        {value && String(value).length > 20 && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 max-w-xs whitespace-normal break-all pointer-events-none">
                {value}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
            </div>
        )}
    </div>
);

/**
 * 단계별 상세 카드 컴포넌트
 */
const StepDetailCard = ({ step }) => {
    const progressPercent = (step.score / step.maxScore) * 100;

    return (
        <div className="rounded-lg border bg-white p-3 shadow-sm dark:bg-slate-700 dark:border-slate-600">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold dark:bg-slate-600 dark:text-slate-200">
                        {step.stepNumber}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{step.stepName}</span>
                </div>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {step.score} / {step.maxScore}
                </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2 dark:bg-slate-600">
                <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                ></div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{step.description}</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{step.details}</p>
        </div>
    );
};

export default InvestmentEvaluation;
