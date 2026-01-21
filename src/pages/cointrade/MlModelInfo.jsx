import { useState, useEffect, useMemo, useCallback } from 'react';
import { send } from '@/util/ClientUtil';
import PageTitle from '@/component/common/display/PageTitle';

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
        second: '2-digit',
        hour12: false
    });
};

// 날짜 포맷 (YYYY-MM-DD)
const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return dateStr; // 이미 YYYY-MM-DD 형식이면 그대로, 아니면 변환 필요
};

const COL_WIDTHS = {
    id: '60px',
    coinCode: '100px',
    modelPath: '200px',
    trainedAt: '180px',
    trainDataStart: '100px',
    trainDataEnd: '100px',
    mseHigh: '100px',
    mseLow: '100px',
    mseSurgeProb: '100px',
    accuracySurgeDay: '100px',
    createdAt: '180px',
    updatedAt: '180px',
};

// 테이블 컬럼 정의
const TABLE_COLUMNS = [
    {
        key: 'id',
        label: 'ID',
        field: 'id',
        width: COL_WIDTHS.id,
        sortable: true,
        align: 'center',
    },
    {
        key: 'coinCode',
        label: '종목코드',
        field: 'coinCode',
        width: COL_WIDTHS.coinCode,
        sortable: true,
        sticky: true,
        align: 'left',
        fontBold: true,
    },
    {
        key: 'modelPath',
        label: '모델경로',
        field: 'modelPath',
        width: COL_WIDTHS.modelPath,
        sortable: true,
        align: 'left',
        render: (val) => <span className="text-xs truncate" title={val}>{val}</span>
    },
    {
        key: 'trainedAt',
        label: '학습일시',
        field: 'trainedAt',
        width: COL_WIDTHS.trainedAt,
        sortable: true,
        align: 'center',
        render: (val) => formatDateTime(val)
    },
    {
        key: 'trainDataStart',
        label: '학습시작일',
        field: 'trainDataStart',
        width: COL_WIDTHS.trainDataStart,
        sortable: true,
        align: 'center',
        render: (val) => formatDate(val)
    },
    {
        key: 'trainDataEnd',
        label: '학습종료일',
        field: 'trainDataEnd',
        width: COL_WIDTHS.trainDataEnd,
        sortable: true,
        align: 'center',
        render: (val) => formatDate(val)
    },
    {
        key: 'mseHigh',
        label: 'MSE(고가)',
        field: 'mseHigh',
        width: COL_WIDTHS.mseHigh,
        sortable: true,
        align: 'right',
        render: (val) => val?.toFixed(8)
    },
    {
        key: 'mseLow',
        label: 'MSE(저가)',
        field: 'mseLow',
        width: COL_WIDTHS.mseLow,
        sortable: true,
        align: 'right',
        render: (val) => val?.toFixed(8)
    },
    {
        key: 'mseSurgeProb',
        label: 'MSE(급등)',
        field: 'mseSurgeProb',
        width: COL_WIDTHS.mseSurgeProb,
        sortable: true,
        align: 'right',
        render: (val) => val?.toFixed(8)
    },
    {
        key: 'accuracySurgeDay',
        label: '급등정확도',
        field: 'accuracySurgeDay',
        width: COL_WIDTHS.accuracySurgeDay,
        sortable: true,
        align: 'right',
        render: (val) => val ? `${(val * 100).toFixed(2)}%` : '-'
    },
    {
        key: 'createdAt',
        label: '생성일시',
        field: 'createdAt',
        width: COL_WIDTHS.createdAt,
        sortable: true,
        align: 'center',
        render: (val) => formatDateTime(val)
    },
    {
        key: 'updatedAt',
        label: '수정일시',
        field: 'updatedAt',
        width: COL_WIDTHS.updatedAt,
        sortable: true,
        align: 'center',
        render: (val) => formatDateTime(val)
    },
];

export default function MlModelInfo() {
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [dataList, setDataList] = useState([]);

    // 테이블 필터/정렬 상태
    const [columnFilters, setColumnFilters] = useState({});
    const [sortConfig, setSortConfig] = useState({ key: 'coinCode', direction: 'asc' });

    // 페이지네이션
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // Toast auto-hide
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }, [toast]);

    // 초기 데이터 조회
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data, error } = await send('/dart/api/cointrade/ml-models', {}, 'GET');
            
            if (error) {
                setToast('데이터 조회 실패: ' + error);
                setDataList([]);
            } else if (data?.success && data?.response) {
                setDataList(data.response);
            }
        } catch (e) {
            console.error('모델 정보 조회 실패:', e);
            setToast('조회 중 오류가 발생했습니다.');
            setDataList([]);
        } finally {
            setLoading(false);
        }
    };

    // 필터/정렬 처리
    const handleColumnFilterChange = useCallback((key, value) => {
        setColumnFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    }, []);

    const clearColumnFilters = useCallback(() => {
        setColumnFilters({});
        setCurrentPage(1);
    }, []);

    const handleSort = useCallback((key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    }, []);

    const processedData = useMemo(() => {
        // 1. 필터링
        let filtered = dataList.filter(row => {
            return Object.entries(columnFilters).every(([key, filterValue]) => {
                if (!filterValue) return true;
                const cellValue = row[key];
                return String(cellValue ?? '').toLowerCase().includes(filterValue.toLowerCase());
            });
        });

        // 2. 정렬
        if (sortConfig.key) {
            filtered.sort((a, b) => {
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
        return filtered;
    }, [dataList, columnFilters, sortConfig]);

    // 페이지네이션 계산
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentRecords = processedData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(processedData.length / itemsPerPage);

    const handlePageChange = (page) => setCurrentPage(page);
    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    return (
        <div className="container mx-auto max-w-7xl p-4">
            <PageTitle>모델 예측정보 조회</PageTitle>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* 툴바 */}
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                         <h3 className="text-lg font-semibold text-slate-800 dark:text-white">모델 목록</h3>
                         <button 
                            onClick={fetchData} 
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                            title="새로고침"
                        >
                            <svg className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                   
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            value={itemsPerPage}
                            onChange={handleItemsPerPageChange}
                            className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                        >
                            <option value={10}>10개씩</option>
                            <option value={20}>20개씩</option>
                            <option value={50}>50개씩</option>
                            <option value={100}>100개씩</option>
                        </select>

                        {Object.values(columnFilters).some(v => v !== '') && (
                            <button
                                onClick={clearColumnFilters}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                            >
                                필터 초기화
                            </button>
                        )}
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 font-medium text-sm dark:bg-blue-900 dark:text-blue-200">
                            {processedData.length !== dataList.length
                                ? `${processedData.length} / ${dataList.length}건`
                                : `${dataList.length}건`}
                        </span>
                    </div>
                </div>

                {/* 테이블 */}
                <div className="overflow-x-auto overflow-y-auto scrollbar-always max-h-[75vh]">
                    <table className="text-sm divide-y divide-slate-200 dark:divide-slate-700" style={{ width: '100%', minWidth: '1500px', tableLayout: 'fixed' }}>
                        <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-700 to-slate-600 text-white shadow-md">
                            <tr>
                                {TABLE_COLUMNS.map((col) => (
                                    <th
                                        key={col.key}
                                        className={`px-3 py-3 text-xs font-semibold uppercase tracking-wider select-none ${col.sticky ? 'sticky z-20 bg-slate-700' : ''} ${col.sortable ? 'cursor-pointer hover:bg-slate-600' : ''}`}
                                        style={{ 
                                            width: col.width, 
                                            left: col.sticky ? 0 : undefined,
                                            textAlign: col.align || 'left'
                                        }}
                                        onClick={() => col.sortable && handleSort(col.key)}
                                    >
                                        <div className={`flex flex-col ${col.align === 'center' ? 'items-center' : col.align === 'right' ? 'items-end' : 'items-start'}`}>
                                            <div className="flex items-center gap-1">
                                                <span>{col.label}</span>
                                                {col.sortable && sortConfig.key === col.key && (
                                                    <span className="text-yellow-300">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-slate-300 font-normal lowercase opacity-80">({col.field})</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                            <tr className="bg-slate-100 dark:bg-slate-700">
                                {TABLE_COLUMNS.map((col) => (
                                    <th
                                        key={`filter-${col.key}`}
                                        className={`px-1 py-1 ${col.sticky ? 'sticky z-20 bg-slate-100 dark:bg-slate-700' : ''}`}
                                        style={{ width: col.width, left: col.sticky ? 0 : undefined }}
                                    >
                                        <input
                                            type="text"
                                            value={columnFilters[col.key] || ''}
                                            onChange={(e) => handleColumnFilterChange(col.key, e.target.value)}
                                            className="w-full px-2 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 dark:bg-slate-600 dark:border-slate-500 dark:text-white"
                                            placeholder="..."
                                        />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200 dark:bg-slate-800 dark:divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={TABLE_COLUMNS.length} className="px-4 py-12 text-center text-slate-500">
                                        로딩 중...
                                    </td>
                                </tr>
                            ) : currentRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={TABLE_COLUMNS.length} className="px-4 py-12 text-center text-slate-500">
                                        데이터가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                currentRecords.map((row) => (
                                    <tr key={row.id} className="hover:bg-blue-50 transition-colors dark:hover:bg-slate-700">
                                        {TABLE_COLUMNS.map((col) => (
                                            <td
                                                key={`${row.id}-${col.key}`}
                                                className={`px-3 py-2 whitespace-nowrap ${col.sticky ? 'sticky z-[5] bg-white dark:bg-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''}`}
                                                style={{ 
                                                    width: col.width, 
                                                    left: col.sticky ? 0 : undefined,
                                                    textAlign: col.align || 'left'
                                                }}
                                            >
                                                <div className={`text-slate-900 dark:text-slate-100 ${col.fontBold ? 'font-medium' : ''}`}>
                                                    {col.render ? col.render(row[col.key]) : (row[col.key] ?? '-')}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 px-4 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1 rounded border border-slate-300 bg-white disabled:opacity-50 text-xs hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300"
                        >
                            이전
                        </button>
                        {[...Array(totalPages)].map((_, i) => {
                            const page = i + 1;
                            if (page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2)) {
                                return (
                                    <button
                                        key={page}
                                        onClick={() => handlePageChange(page)}
                                        className={`px-3 py-1 rounded text-xs ${currentPage === page ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300'}`}
                                    >
                                        {page}
                                    </button>
                                );
                            } else if (page === currentPage - 3 || page === currentPage + 3) {
                                return <span key={page} className="text-xs text-slate-400">...</span>;
                            }
                            return null;
                        })}
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 rounded border border-slate-300 bg-white disabled:opacity-50 text-xs hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300"
                        >
                            다음
                        </button>
                    </div>
                )}
            </div>

            {toast && (
                <div className="fixed bottom-4 right-4 z-50 animate-fade-in bg-slate-800 text-white px-6 py-3 rounded shadow-lg">
                    {toast}
                </div>
            )}
        </div>
    );
}
