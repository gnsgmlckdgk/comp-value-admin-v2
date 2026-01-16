import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { send, API_ENDPOINTS } from '@/util/ClientUtil';
import { getRolesFromStorage, hasAnyRole } from '@/util/RoleUtil';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import PageTitle from '@/component/common/display/PageTitle';
import Loading from '@/component/common/display/Loading';
import AlertModal from '@/component/layouts/common/popup/AlertModal';
import CompanyValueResultModal from '@/pages/trade/popup/CompanyValueResultModal';
import MultiSelect from '@/component/common/select/MultiSelect';
import * as XLSX from 'xlsx';

// 숫자를 천 단위 콤마 포맷으로 변환
const formatNumberWithComma = (value) => {
    if (value === null || value === '' || value === undefined) return '';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    return num.toLocaleString('en-US');
};

// 콤마 포맷 문자열을 숫자로 변환
const parseFormattedNumber = (value) => {
    if (value === null || value === '' || value === undefined) return null;
    const num = parseFloat(String(value).replace(/,/g, ''));
    return isNaN(num) ? null : num;
};

// 숫자를 한글 단위로 변환
const formatNumberToKorean = (num) => {
    if (!num || isNaN(num)) return '';

    const number = Number(num);
    const units = [
        { unit: '조', value: 1000000000000 },
        { unit: '억', value: 100000000 },
        { unit: '만', value: 10000 },
    ];

    const result = [];
    let remaining = Math.abs(number);

    for (const { unit, value } of units) {
        const count = Math.floor(remaining / value);
        if (count > 0) {
            result.push(`${count.toLocaleString()}${unit}`);
            remaining = remaining % value;
        }
    }

    if (remaining > 0 || result.length === 0) {
        result.push(remaining.toLocaleString());
    }

    return result.join(' ') + (number < 0 ? ' (음수)' : '');
};

// 필드 메타데이터 정의
const FIELD_META = {
    // 기본 표시 필드 (null이 아닌 값들)
    basic: [
        { key: 'marketCapMoreThan', label: '시가총액 최소값', type: 'number', unit: '$', formatComma: true },
        { key: 'marketCapLowerThan', label: '시가총액 최대값', type: 'number', unit: '$', formatComma: true },
        { key: 'volumeMoreThan', label: '거래량 최소값', type: 'number', formatComma: true },
        { key: 'betaLowerThan', label: '베타값 최대값', type: 'number', step: '0.01' },
        { key: 'isEtf', label: 'ETF 여부', type: 'boolean' },
        { key: 'isFund', label: '펀드 여부', type: 'boolean' },
        { key: 'isActivelyTrading', label: '활발히 거래되는 종목 여부', type: 'boolean' },
        { key: 'country', label: '국가', type: 'multiselect', searchable: true },
        { key: 'exchange', label: '거래소', type: 'multiselect', searchable: true },
        { key: 'limit', label: '최대 조회 건수', type: 'number', min: 1, max: 5000 },
    ],
    // 상세 조건 필드 (null인 값들)
    advanced: [
        { key: 'priceMoreThan', label: '주가 최소값', type: 'number', unit: '$', step: '0.01', formatComma: true },
        { key: 'priceLowerThan', label: '주가 최대값', type: 'number', unit: '$', step: '0.01', formatComma: true },
        { key: 'betaMoreThan', label: '베타값 최소값', type: 'number', step: '0.01' },
        { key: 'volumeLowerThan', label: '거래량 최대값', type: 'number', formatComma: true },
        { key: 'dividendMoreThan', label: '배당 수익률 최소값', type: 'number', unit: '$', step: '0.01' },
        { key: 'dividendLowerThan', label: '배당 수익률 최대값', type: 'number', unit: '$', step: '0.01' },
        { key: 'sector', label: '섹터', type: 'multiselect', searchable: true },
        { key: 'industry', label: '산업군', type: 'multiselect', searchable: true },
    ],
};

// 초기 검색 조건
const INITIAL_FILTERS = {
    marketCapMoreThan: 2000000000,
    marketCapLowerThan: 500000000000,
    priceMoreThan: null,
    priceLowerThan: null,
    betaMoreThan: null,
    betaLowerThan: 1.5,
    volumeMoreThan: 100000,
    volumeLowerThan: null,
    dividendMoreThan: null,
    dividendLowerThan: null,
    isEtf: false,
    isFund: false,
    isActivelyTrading: true,
    sector: [],
    industry: [],
    country: ['US'],
    exchange: ['NYSE', 'NASDAQ'],
    limit: 1500,
};

// 테이블 컬럼 정의
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
        )
    },
    {
        key: 'companyName',
        label: '기업명',
        width: '300px',
        sortable: true,
        headerClassName: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-left text-slate-700 dark:text-slate-200'
    },
    {
        key: 'marketCap',
        label: '시가총액',
        width: '140px',
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right text-slate-600 dark:text-slate-300',
        render: (value) => value?.toLocaleString()
    },
    {
        key: 'sector',
        label: '섹터',
        width: '180px',
        sortable: true,
        hasDropdown: true,
        headerClassName: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-left text-slate-600 dark:text-slate-300'
    },
    {
        key: 'industry',
        label: '산업군',
        width: '180px',
        sortable: true,
        hasDropdown: true,
        headerClassName: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-left text-slate-600 dark:text-slate-300'
    },
    {
        key: 'beta',
        label: '베타',
        width: '80px',
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right text-slate-600 dark:text-slate-300',
        render: (value) => value?.toFixed(3)
    },
    {
        key: 'price',
        label: '주가',
        width: '100px',
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right text-slate-600 dark:text-slate-300',
        render: (value) => `$${value?.toFixed(2)}`
    },
    {
        key: 'lastAnnualDividend',
        label: '배당금',
        width: '100px',
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right text-slate-600 dark:text-slate-300',
        render: (value) => `$${value?.toFixed(2)}`
    },
    {
        key: 'volume',
        label: '거래량',
        width: '120px',
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right text-slate-600 dark:text-slate-300',
        render: (value) => value?.toLocaleString()
    },
    {
        key: 'exchangeShortName',
        label: '거래소',
        width: '100px',
        sortable: true,
        hasDropdown: true,
        headerClassName: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-left',
        render: (value) => (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {value}
            </span>
        )
    },
    {
        key: 'country',
        label: '국가',
        width: '90px',
        sortable: true,
        hasDropdown: true,
        headerClassName: 'px-4 py-3 pr-8 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 pr-8 whitespace-nowrap text-left text-slate-600 dark:text-slate-300'
    },
];

/**
 * 해외 기업목록 조회 페이지
 */
const AbroadCompanyList = () => {
    const [filters, setFilters] = useState(INITIAL_FILTERS);
    const [resultData, setResultData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showFieldNames, setShowFieldNames] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ open: false, message: '', onConfirm: null });
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [columnFilters, setColumnFilters] = useState({});
    const [compValueData, setCompValueData] = useState({});
    const [showValueModal, setShowValueModal] = useState(false);
    const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });
    const [openDropdown, setOpenDropdown] = useState(null);
    const [profiles, setProfiles] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState('');

    const inFlight = useRef({ calc: false });
    const resultTableRef = useRef(null);

    // 필터 옵션 조회 (국가, 거래소, 섹터, 산업군)
    const { options: filterOptions, loading: filterOptionsLoading } = useFilterOptions();

    // 활성 프로파일 목록 조회
    const fetchProfiles = useCallback(async () => {
        try {
            const { data, error } = await send('/dart/recommend/profile/active', {}, 'GET');

            if (!error && data && data.response) {
                const list = Array.isArray(data.response) ? data.response : [];
                setProfiles(list);
            } else {
                setProfiles([]);
            }
        } catch (e) {
            setProfiles([]);
        }
    }, []);

    // 컴포넌트 마운트 시 프로파일 목록 조회
    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    // 드롭다운용 고유값 계산 (현재 필터링된 데이터 기준, 자기 자신 필터 제외)
    const getUniqueValuesForColumn = useCallback((targetKey) => {
        const dropdownColumns = TABLE_COLUMNS.filter((col) => col.hasDropdown).map((col) => col.key);
        if (!dropdownColumns.includes(targetKey)) return [];

        // 자기 자신을 제외한 다른 필터들만 적용
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
    }, [resultData, columnFilters]);

    // 드롭다운 외부 클릭 시 닫기 (행 클릭 이벤트 방지)
    const dropdownClosingRef = useRef(false);

    useEffect(() => {
        if (!openDropdown) return;
        const handleClickOutside = (e) => {
            if (!e.target.closest('.filter-dropdown-container')) {
                dropdownClosingRef.current = true;
                setOpenDropdown(null);
                // 짧은 시간 후 플래그 해제
                setTimeout(() => {
                    dropdownClosingRef.current = false;
                }, 100);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openDropdown]);

    // 권한 체크
    const userRoles = useMemo(() => getRolesFromStorage(), []);
    const canViewFieldNames = useMemo(
        () => hasAnyRole(userRoles, ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN']),
        [userRoles]
    );

    const openAlert = (message, onConfirm) => {
        setAlertConfig({ open: true, message, onConfirm: onConfirm || null });
    };

    const handleCloseAlert = () => {
        const { onConfirm } = alertConfig;
        setAlertConfig({ open: false, message: '', onConfirm: null });
        if (onConfirm) onConfirm();
    };

    // 필터 값 변경 핸들러
    const handleFilterChange = useCallback((key, value) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value === '' ? null : value,
        }));
    }, []);

    // 프로파일을 검색 조건으로 변환하는 매핑 함수
    const mapProfileToFilters = useCallback((profile) => {
        const newFilters = { ...INITIAL_FILTERS };

        // 프로파일 필드명 -> 검색 조건 필드명 매핑
        // 시가총액
        if (profile.marketCapMin !== null && profile.marketCapMin !== undefined) {
            newFilters.marketCapMoreThan = profile.marketCapMin;
        }
        if (profile.marketCapMax !== null && profile.marketCapMax !== undefined) {
            newFilters.marketCapLowerThan = profile.marketCapMax;
        }

        // 베타
        if (profile.betaMax !== null && profile.betaMax !== undefined) {
            newFilters.betaLowerThan = profile.betaMax;
        }

        // 거래량
        if (profile.volumeMin !== null && profile.volumeMin !== undefined) {
            newFilters.volumeMoreThan = profile.volumeMin;
        }

        // ETF, Fund, 활성거래 여부
        if (profile.isEtf !== null && profile.isEtf !== undefined) {
            newFilters.isEtf = profile.isEtf === 'Y';
        }
        if (profile.isFund !== null && profile.isFund !== undefined) {
            newFilters.isFund = profile.isFund === 'Y';
        }
        if (profile.isActivelyTrading !== null && profile.isActivelyTrading !== undefined) {
            newFilters.isActivelyTrading = profile.isActivelyTrading === 'Y';
        }

        // 거래소 (콤마로 구분된 문자열 -> 배열)
        if (profile.exchange) {
            const exchangeArray = typeof profile.exchange === 'string'
                ? profile.exchange.split(',').map(e => e.trim()).filter(e => e)
                : (Array.isArray(profile.exchange) ? profile.exchange : []);
            newFilters.exchange = exchangeArray;
        }

        // 조회 제한 건수
        if (profile.screenerLimit !== null && profile.screenerLimit !== undefined) {
            newFilters.limit = profile.screenerLimit;
        }

        return newFilters;
    }, []);

    // 프로파일 선택 핸들러
    const handleProfileChange = useCallback((profileName) => {
        setSelectedProfile(profileName);

        if (!profileName) {
            // 프로파일 미선택 시 초기값으로 리셋
            setFilters(INITIAL_FILTERS);
            return;
        }

        // 선택된 프로파일 찾기
        const profile = profiles.find(p => p.profileName === profileName);
        if (profile) {
            const newFilters = mapProfileToFilters(profile);
            setFilters(newFilters);
            openAlert(`'${profileName}' 프로파일의 검색 조건이 적용되었습니다.`);
        }
    }, [profiles, mapProfileToFilters]);

    // 검색 실행
    const handleSearch = useCallback(async () => {
        setIsLoading(true);
        try {
            // null이 아닌 값만 전송, 배열은 콤마로 연결
            const requestData = Object.entries(filters).reduce((acc, [key, value]) => {
                if (value !== null && value !== '') {
                    // 배열인 경우 콤마로 구분된 문자열로 변환
                    if (Array.isArray(value) && value.length > 0) {
                        acc[key] = value.join(',');
                    } else if (!Array.isArray(value)) {
                        acc[key] = value;
                    }
                }
                return acc;
            }, {});

            const { data, error } = await send('/dart/abroad/company/financial/fmp/screener/stock', requestData, 'POST');

            if (!error && data && data.response) {
                const list = Array.isArray(data.response) ? data.response : [];
                setResultData(list);
                if (list.length === 0) {
                    openAlert('조회 결과가 없습니다.');
                } else {
                    // 결과가 있으면 테이블로 스크롤
                    setTimeout(() => {
                        resultTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                }
            } else {
                setResultData([]);
                openAlert('조회 결과가 존재하지 않거나 서버 응답을 받지 못했습니다.');
            }
        } catch (e) {
            setResultData([]);
            openAlert('요청 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

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

    // 정렬된 결과 데이터
    const sortedData = useMemo(() => {
        if (!sortConfig.key) return filteredData;

        return [...filteredData].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];

            // null/undefined 처리
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;

            // 숫자 비교
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
            }

            // 문자열 비교
            const aStr = String(aVal).toLowerCase();
            const bStr = String(bVal).toLowerCase();
            if (sortConfig.direction === 'asc') {
                return aStr.localeCompare(bStr);
            }
            return bStr.localeCompare(aStr);
        });
    }, [filteredData, sortConfig]);

    // 컬럼 필터 변경 핸들러
    const handleColumnFilterChange = useCallback((key, value) => {
        setColumnFilters((prev) => ({
            ...prev,
            [key]: value
        }));
    }, []);

    // 컬럼 필터 초기화
    const clearColumnFilters = useCallback(() => {
        setColumnFilters({});
    }, []);

    // 정렬 핸들러
    const handleSort = useCallback((key) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
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
            y: rect.top + rect.height / 2
        });
    }, []);

    const handleTooltipLeave = useCallback(() => {
        setTooltip((prev) => ({ ...prev, visible: false }));
    }, []);

    // 엑셀 다운로드
    const handleExportToExcel = useCallback(() => {
        if (sortedData.length === 0) {
            openAlert('다운로드할 데이터가 없습니다.');
            return;
        }

        try {
            // 엑셀 데이터 준비
            const excelData = sortedData.map((row) => ({
                '심볼': row.symbol || '',
                '기업명': row.companyName || '',
                '시가총액': row.marketCap || '',
                '섹터': row.sector || '',
                '산업군': row.industry || '',
                '베타': row.beta || '',
                '주가': row.price ? `$${row.price.toFixed(2)}` : '',
                '연간배당금': row.lastAnnualDividend ? `$${row.lastAnnualDividend.toFixed(2)}` : '',
                '거래량': row.volume || '',
                '거래소': row.exchangeShortName || '',
                '국가': row.country || '',
            }));

            // 워크시트 생성
            const worksheet = XLSX.utils.json_to_sheet(excelData);

            // 컬럼 너비 설정
            worksheet['!cols'] = [
                { wch: 12 }, // 심볼
                { wch: 35 }, // 기업명
                { wch: 15 }, // 시가총액
                { wch: 25 }, // 섹터
                { wch: 25 }, // 산업군
                { wch: 8 },  // 베타
                { wch: 12 }, // 주가
                { wch: 12 }, // 연간배당금
                { wch: 15 }, // 거래량
                { wch: 10 }, // 거래소
                { wch: 10 }, // 국가
            ];

            // 워크북 생성
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, '해외기업목록');

            // 파일명 생성 (현재 날짜 포함)
            const today = new Date();
            const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
            const filename = `해외기업목록_${dateStr}.xlsx`;

            // 파일 다운로드
            XLSX.writeFile(workbook, filename);

            openAlert(`엑셀 파일이 다운로드되었습니다.\n파일명: ${filename}\n총 ${sortedData.length}건`);
        } catch (error) {
            console.error('Excel export error:', error);
            openAlert('엑셀 파일 생성 중 오류가 발생했습니다.');
        }
    }, [sortedData, openAlert]);

    // 기업가치 계산
    const handleRowClick = useCallback(async (row) => {
        // 드롭다운 닫는 중이면 클릭 무시
        if (dropdownClosingRef.current) return;

        const symbol = row?.symbol?.trim();
        if (!symbol) {
            openAlert('심볼 정보가 존재하지 않습니다.');
            return;
        }

        if (inFlight.current.calc) return;
        inFlight.current.calc = true;

        setIsLoading(true);
        try {
            const { data, error } = await send(API_ENDPOINTS.ABROAD_COMP_VALUE(symbol), {}, 'GET');

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

    // 검색 조건 요약 (값이 있는 것만)
    const searchSummary = useMemo(() => {
        const allFields = [...FIELD_META.basic, ...FIELD_META.advanced];
        return Object.entries(filters)
            .filter(([_, value]) => {
                // 배열인 경우 길이가 0보다 큰지 확인
                if (Array.isArray(value)) return value.length > 0;
                return value !== null && value !== '';
            })
            .map(([key, value]) => {
                const field = allFields.find((f) => f.key === key);
                if (!field) return null;

                let displayValue = value;
                if (field.type === 'boolean') {
                    displayValue = value ? '예' : '아니오';
                } else if (Array.isArray(value)) {
                    // 배열인 경우 콤마로 연결
                    displayValue = value.join(', ');
                } else if (field.type === 'number' && typeof value === 'number') {
                    displayValue = value.toLocaleString();
                }

                return { label: field.label, value: displayValue, key };
            })
            .filter(Boolean);
    }, [filters]);

    // 필드 렌더링
    const renderField = (field) => {
        const value = filters[field.key];
        const labelText = showFieldNames ? (
            <div className="flex flex-col">
                <span>
                    {field.label}
                    {field.unit && <span className="text-blue-600 dark:text-blue-400 ml-1">({field.unit})</span>}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">({field.key})</span>
            </div>
        ) : (
            <span>
                {field.label}
                {field.unit && <span className="text-blue-600 dark:text-blue-400 ml-1">({field.unit})</span>}
            </span>
        );

        if (field.type === 'multiselect') {
            // 필드 키에 따라 옵션 키 매핑 (country → countries, exchange → exchanges 등)
            const optionsKey = field.key === 'country' ? 'countries' :
                               field.key === 'exchange' ? 'exchanges' :
                               field.key === 'sector' ? 'sectors' :
                               field.key === 'industry' ? 'industries' : field.key + 's';

            return (
                <div key={field.key} className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{labelText}</label>
                    <MultiSelect
                        value={value || []}
                        onChange={(newValue) => handleFilterChange(field.key, newValue)}
                        options={filterOptions[optionsKey] || []}
                        loading={filterOptionsLoading[optionsKey]}
                        placeholder={field.placeholder || `${field.label} 선택`}
                        searchable={field.searchable}
                        showChips={true}
                    />
                </div>
            );
        }

        if (field.type === 'boolean') {
            return (
                <div key={field.key} className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{labelText}</label>
                    <select
                        value={value === null ? '' : String(value)}
                        onChange={(e) =>
                            handleFilterChange(field.key, e.target.value === '' ? null : e.target.value === 'true')
                        }
                        className="px-3 py-2 rounded-lg border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    >
                        <option value="">선택안함</option>
                        <option value="true">예</option>
                        <option value="false">아니오</option>
                    </select>
                </div>
            );
        }

        // 콤마 포맷 입력 필드
        if (field.type === 'number' && field.formatComma) {
            // 시가총액이나 거래량 같은 큰 금액 필드인지 확인
            const isLargeNumberField = field.key.includes('marketCap') || field.key.includes('volume');
            const koreanValue = isLargeNumberField && value ? formatNumberToKorean(value) : '';

            return (
                <div key={field.key} className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{labelText}</label>
                    <input
                        type="text"
                        value={formatNumberWithComma(value)}
                        onChange={(e) => {
                            const parsed = parseFormattedNumber(e.target.value);
                            handleFilterChange(field.key, parsed);
                        }}
                        placeholder={field.placeholder}
                        className="px-3 py-2 rounded-lg border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                    {koreanValue && (
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                            {koreanValue}
                        </p>
                    )}
                </div>
            );
        }

        return (
            <div key={field.key} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{labelText}</label>
                <input
                    type={field.type}
                    value={value === null ? '' : value}
                    onChange={(e) =>
                        handleFilterChange(
                            field.key,
                            field.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value
                        )
                    }
                    placeholder={field.placeholder}
                    step={field.step}
                    min={field.min}
                    max={field.max}
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
            </div>
        );
    };

    return (
        <>
            <PageTitle />
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
                검색 조건을 설정하여 미국 상장 기업을 조회할 수 있습니다.
            </p>

            <Loading show={isLoading} />

            {/* 검색 조건 영역 */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 mb-4 dark:bg-slate-800 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">검색 조건</h3>
                    <div className="flex items-center gap-2">
                        {canViewFieldNames && (
                            <button
                                type="button"
                                onClick={() => setShowFieldNames(!showFieldNames)}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600"
                            >
                                {showFieldNames ? '한글명만 보기' : '실제필드명 보기'}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600"
                        >
                            {showAdvanced ? '상세조건 숨기기' : '상세조건 보기'}
                        </button>
                    </div>
                </div>

                {/* 프로파일 선택 */}
                <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                        프로파일에서 불러오기
                    </label>
                    <select
                        value={selectedProfile}
                        onChange={(e) => handleProfileChange(e.target.value)}
                        disabled={isLoading || profiles.length === 0}
                        className="w-full max-w-md px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    >
                        <option value="">직접 입력 (프로파일 선택 안함)</option>
                        {profiles.map((profile) => (
                            <option key={profile.id} value={profile.profileName}>
                                {profile.profileName}
                            </option>
                        ))}
                    </select>
                    {selectedProfile && (
                        <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                            '{selectedProfile}' 프로파일의 조건이 적용되었습니다. 필요 시 수정할 수 있습니다.
                        </p>
                    )}
                </div>

                {/* 기본 필드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {FIELD_META.basic.map((field) => renderField(field))}
                </div>

                {/* 상세 조건 */}
                {showAdvanced && (
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">상세 조건</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {FIELD_META.advanced.map((field) => renderField(field))}
                        </div>
                    </div>
                )}

                {/* 검색 버튼 */}
                <div className="flex justify-end mt-4">
                    <button
                        type="button"
                        onClick={handleSearch}
                        disabled={isLoading}
                        className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        검색
                    </button>
                </div>
            </div>

            {/* 검색 조건 요약 */}
            {searchSummary.length > 0 && resultData.length > 0 && (
                <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-4 dark:bg-slate-700 dark:border-slate-600">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">적용된 검색 조건</h4>
                    <div className="flex flex-wrap gap-2">
                        {searchSummary.map((item) => (
                            <span
                                key={item.key}
                                className="inline-flex items-center px-3 py-1 rounded-full bg-white text-blue-700 text-xs font-medium border border-blue-200 dark:bg-slate-800 dark:text-blue-300 dark:border-slate-600"
                            >
                                {item.label}: {item.value}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* 조회 결과 테이블 */}
            <div ref={resultTableRef} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">조회 결과</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={handleExportToExcel}
                            disabled={sortedData.length === 0}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            엑셀 다운로드
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
                <div className="overflow-x-auto overflow-y-auto scrollbar-always max-h-[65vh]">
                    <table className="text-sm divide-y divide-slate-200 dark:divide-slate-700" style={{ width: '100%', tableLayout: 'fixed' }}>
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
                                                    <span className={sortConfig.key === col.key && sortConfig.direction === 'asc' ? 'opacity-100 text-yellow-300' : ''}>▲</span>
                                                    <span className={sortConfig.key === col.key && sortConfig.direction === 'desc' ? 'opacity-100 text-yellow-300' : ''}>▼</span>
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
                                                    onClick={() => setOpenDropdown(openDropdown === col.key ? null : col.key)}
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                            )}
                                            {col.hasDropdown && openDropdown === col.key && (() => {
                                                const options = getUniqueValuesForColumn(col.key);
                                                const filteredOptions = options.filter(
                                                    (v) => !columnFilters[col.key] || String(v).toLowerCase().includes(columnFilters[col.key].toLowerCase())
                                                );
                                                return options.length > 0 && (
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
                                                onMouseLeave: handleTooltipLeave
                                            };
                                            const displayValue = col.render ? col.render(value, row, tooltipHandlers) : value;

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
                                ))
                            ) : (
                                <tr>
                                    <td className="px-4 py-12 text-center" colSpan={TABLE_COLUMNS.length}>
                                        <div className="flex flex-col items-center gap-3">
                                            <svg
                                                className="w-12 h-12 text-slate-300"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={1.5}
                                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                                />
                                            </svg>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                검색 조건을 설정하고 검색 버튼을 눌러주세요.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AlertModal open={alertConfig.open} message={alertConfig.message} onClose={handleCloseAlert} />

            <CompanyValueResultModal
                isOpen={showValueModal}
                onClose={() => setShowValueModal(false)}
                data={compValueData}
            />

            {/* 커스텀 툴팁 */}
            {tooltip.visible && (
                <div
                    className="fixed z-[9999] px-2 py-1 text-xs bg-slate-800 text-white rounded shadow-lg whitespace-nowrap pointer-events-none"
                    style={{
                        left: tooltip.x,
                        top: tooltip.y,
                        transform: 'translateY(-50%)'
                    }}
                >
                    {tooltip.text}
                </div>
            )}
        </>
    );
};

export default AbroadCompanyList;
