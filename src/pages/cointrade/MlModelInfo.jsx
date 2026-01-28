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
    modelType: '120px',
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
        key: 'modelType',
        label: '모델타입',
        field: 'modelType',
        width: COL_WIDTHS.modelType,
        sortable: true,
        align: 'center',
        render: (val) => {
            const type = String(val || '').trim().toLowerCase();
            let colorClass = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            
            if (type === 'ensemble') colorClass = 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
            else if (type.includes('lstm')) colorClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            else if (type.includes('gru')) colorClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            else if (type.includes('cnn')) colorClass = 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
            
            return (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                    {val || '-'}
                </span>
            );
        }
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
        key: 'mseUpProb',
        label: 'MSE(상승확률)',
        field: 'mseUpProb',
        width: COL_WIDTHS.mseSurgeProb, // Reuse width variable or add new one
        sortable: true,
        align: 'right',
        render: (val) => val?.toFixed(8)
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

    // 상세보기 모달 상태
    const [selectedModel, setSelectedModel] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // 재학습 확인 모달 상태
    const [isTrainConfirmModalOpen, setIsTrainConfirmModalOpen] = useState(false);

    // 테이블 필터/정렬 상태
    const [columnFilters, setColumnFilters] = useState({});
    const [sortConfig, setSortConfig] = useState({ key: 'coinCode', direction: 'asc' });

    // 페이지네이션
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // 모델 재학습 관련 상태
    const [lastTrainRun, setLastTrainRun] = useState(null);
    const TRAIN_RUN_KEY = 'lastMlModelTrainRun';

    // Toast auto-hide
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }, [toast]);

    // 초기 데이터 조회
    useEffect(() => {
        fetchData();

        // 로컬스토리지에서 마지막 수동 학습 시간 확인 및 1시간 지난 값 삭제
        const storedTime = localStorage.getItem(TRAIN_RUN_KEY);
        if (storedTime) {
            const runTime = new Date(storedTime);
            const now = new Date();
            const hoursDiff = (now - runTime) / (1000 * 60 * 60);

            if (hoursDiff >= 1) {
                // 1시간 이상 지났으면 삭제
                localStorage.removeItem(TRAIN_RUN_KEY);
                setLastTrainRun(null);
            } else {
                setLastTrainRun(runTime);
            }
        }
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

    // 모델 재학습 확인 모달 열기
    const handleOpenTrainConfirmModal = () => {
        setIsTrainConfirmModalOpen(true);
    };

    // 모델 재학습 확인 모달 닫기
    const handleCloseTrainConfirmModal = () => {
        setIsTrainConfirmModalOpen(false);
    };

    // 모델 재학습(수동) 요청
    const handleManualTrain = async () => {
        setIsTrainConfirmModalOpen(false); // 모달 닫기

        try {
            const { data, error } = await send('/dart/api/cointrade/trade/model/train', {}, 'GET');

            if (error) {
                setToast('모델 재학습 요청 실패: ' + error);
            } else if (data?.success) {
                setToast('모델 재학습이 실행되었습니다.');
                const now = new Date();
                setLastTrainRun(now);
                localStorage.setItem(TRAIN_RUN_KEY, now.toISOString());
            } else {
                setToast(data?.message || '모델 재학습 요청 실패');
            }
        } catch (e) {
            console.error('모델 재학습 요청 오류:', e);
            setToast('요청 중 오류가 발생했습니다.');
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

    // 상세보기 모달 핸들러
    const handleRowDoubleClick = (model) => {
        setSelectedModel(model);
        setIsDetailModalOpen(true);
    };

    const handleCloseDetailModal = () => {
        setIsDetailModalOpen(false);
        setSelectedModel(null);
    };

    // ESC 키로 모달 닫기
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                if (isDetailModalOpen) handleCloseDetailModal();
                if (isTrainConfirmModalOpen) handleCloseTrainConfirmModal();
            }
        };
        if (isDetailModalOpen || isTrainConfirmModalOpen) {
            window.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isDetailModalOpen, isTrainConfirmModalOpen]);

    // 재학습 확인 모달 컴포넌트
    const TrainConfirmModal = () => {
        if (!isTrainConfirmModalOpen) return null;

        const handleBackdropClick = (e) => {
            if (e.target === e.currentTarget) handleCloseTrainConfirmModal();
        };

        return (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 animate-fade-in"
                onClick={handleBackdropClick}
            >
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
                    {/* 헤더 */}
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                            모델 재학습 확인
                        </h3>
                    </div>

                    {/* 콘텐츠 */}
                    <div className="px-6 py-4">
                        <p className="text-slate-700 dark:text-slate-300">
                            모델 재학습을 실행하시겠습니까?
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                            이 작업은 시간이 소요될 수 있습니다.
                        </p>
                    </div>

                    {/* 버튼 */}
                    <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 flex items-center justify-end gap-2">
                        <button
                            onClick={handleCloseTrainConfirmModal}
                            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                        >
                            취소
                        </button>
                        <button
                            onClick={handleManualTrain}
                            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                        >
                            확인
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // 상세보기 모달 컴포넌트
    const DetailModal = () => {
        if (!isDetailModalOpen || !selectedModel) return null;

        const handleBackdropClick = (e) => {
            if (e.target === e.currentTarget) handleCloseDetailModal();
        };

        return (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 animate-fade-in"
                onClick={handleBackdropClick}
            >
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] sm:max-h-[85vh] overflow-y-auto flex flex-col">
                    {/* 헤더 */}
                    <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                                모델 상세정보
                            </h3>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                ID: {selectedModel.id}
                            </span>
                        </div>
                        <button
                            onClick={handleCloseDetailModal}
                            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                        >
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* 콘텐츠 */}
                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                        {/* 기본 정보 */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700/50 dark:to-slate-800/50 rounded-lg p-4 sm:p-5 border border-slate-200 dark:border-slate-700">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">기본 정보</h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* 종목 코드 */}
                                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">종목 코드</div>
                                    <div className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
                                        {selectedModel.coinCode}
                                    </div>
                                </div>

                                {/* 모델 타입 */}
                                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">모델 타입</div>
                                    <div className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
                                        {selectedModel.modelType || '-'}
                                    </div>
                                </div>

                                {/* 학습일시 */}
                                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">학습일시</div>
                                    <div className="text-sm text-slate-800 dark:text-slate-200">
                                        {formatDateTime(selectedModel.trainedAt)}
                                    </div>
                                </div>

                                {/* 모델 경로 */}
                                <div className="sm:col-span-2 bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">모델 경로</div>
                                    <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-mono break-all bg-slate-50 dark:bg-slate-900/50 p-2 rounded">
                                        {selectedModel.modelPath}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 학습 데이터 기간 */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 sm:p-5 border border-blue-100 dark:border-blue-800">
                            <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3">학습 데이터 기간</h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* 시작일 */}
                                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                                    <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">시작일</div>
                                    <div className="text-base sm:text-lg font-bold text-blue-700 dark:text-blue-300">
                                        {formatDate(selectedModel.trainDataStart)}
                                    </div>
                                </div>

                                {/* 종료일 */}
                                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                                    <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">종료일</div>
                                    <div className="text-base sm:text-lg font-bold text-blue-700 dark:text-blue-300">
                                        {formatDate(selectedModel.trainDataEnd)}
                                    </div>
                                </div>

                                {/* 학습 기간 */}
                                {selectedModel.trainDataStart && selectedModel.trainDataEnd && (
                                    <div className="sm:col-span-2 bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                                        <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">총 학습 기간</div>
                                        <div className="text-sm text-blue-700 dark:text-blue-300">
                                            {(() => {
                                                const start = new Date(selectedModel.trainDataStart);
                                                const end = new Date(selectedModel.trainDataEnd);
                                                const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                                                return `${diffDays}일`;
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 모델 성능 지표 */}
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 sm:p-5 border border-purple-200 dark:border-purple-700">
                            <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-3">모델 성능 지표 (MSE & Accuracy)</h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {/* MSE 고가 */}
                                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                                    <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">MSE (고가)</div>
                                    <div className="text-sm font-mono text-purple-700 dark:text-purple-300">
                                        {selectedModel.mseHigh != null ? selectedModel.mseHigh.toFixed(8) : '-'}
                                    </div>
                                </div>

                                {/* MSE 저가 */}
                                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                                    <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">MSE (저가)</div>
                                    <div className="text-sm font-mono text-purple-700 dark:text-purple-300">
                                        {selectedModel.mseLow != null ? selectedModel.mseLow.toFixed(8) : '-'}
                                    </div>
                                </div>

                                {/* MSE 상승확률 */}
                                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                                    <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">MSE (상승확률)</div>
                                    <div className="text-sm font-mono text-purple-700 dark:text-purple-300">
                                        {selectedModel.mseUpProb != null ? selectedModel.mseUpProb.toFixed(8) : '-'}
                                    </div>
                                </div>
                            </div>

                            {/* MSE 설명 */}
                            <div className="mt-3 p-3 bg-purple-50/50 dark:bg-purple-900/10 rounded border border-purple-100 dark:border-purple-800">
                                <p className="text-xs text-purple-700 dark:text-purple-300">
                                    <strong>MSE (Mean Squared Error):</strong> 평균 제곱 오차로, 값이 낮을수록 모델 예측 성능이 우수합니다.
                                </p>
                            </div>
                        </div>

                        {/* 생성/수정 정보 */}
                        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4 sm:p-5 border border-slate-200 dark:border-slate-700">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">시스템 정보</h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* 생성일시 */}
                                <div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">생성일시</div>
                                    <div className="text-sm text-slate-800 dark:text-slate-200">
                                        {formatDateTime(selectedModel.createdAt)}
                                    </div>
                                </div>

                                {/* 수정일시 */}
                                <div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">수정일시</div>
                                    <div className="text-sm text-slate-800 dark:text-slate-200">
                                        {formatDateTime(selectedModel.updatedAt)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 전체 데이터 (개발용) */}
                        <details className="bg-slate-100 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-700">
                            <summary className="px-4 py-3 cursor-pointer text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium">
                                전체 데이터 보기 (디버깅용)
                            </summary>
                            <div className="px-4 pb-4 pt-2">
                                <pre className="text-xs bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-600 overflow-x-auto">
                                    {JSON.stringify(selectedModel, null, 2)}
                                </pre>
                            </div>
                        </details>
                    </div>
                </div>
            </div>
        );
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
                        {lastTrainRun && (
                            <span className="text-xs text-amber-600 dark:text-amber-400 mr-2">
                                마지막 실행: {formatDateTime(lastTrainRun)}
                            </span>
                        )}
                        <button
                            onClick={handleOpenTrainConfirmModal}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors mr-2"
                        >
                            모델 재학습(수동)
                        </button>

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
                                    <tr
                                        key={row.id}
                                        onDoubleClick={() => handleRowDoubleClick(row)}
                                        className="cursor-pointer hover:bg-blue-50 transition-colors dark:hover:bg-slate-700"
                                    >
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

            {/* 재학습 확인 모달 */}
            <TrainConfirmModal />

            {/* 상세보기 모달 */}
            <DetailModal />
        </div>
    );
}