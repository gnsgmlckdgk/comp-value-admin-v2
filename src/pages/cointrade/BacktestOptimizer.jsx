import { useState, useEffect, useMemo } from 'react';
import { send } from '@/util/ClientUtil';
import PageTitle from '@/component/common/display/PageTitle';
import Button from '@/component/common/button/Button';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

/**
 * 숫자를 정수 부분(볼드)과 소수점 부분으로 분리하여 렌더링
 */
function NumberWithBoldInteger({ value, decimals = 2, suffix = '' }) {
    if (value == null) return '-';
    const fixed = Number(value).toFixed(decimals);
    const [integer, decimal] = fixed.split('.');

    return (
        <>
            <span className="font-bold">{integer}</span>
            {decimal && <span className="font-normal">.{decimal}</span>}
            {suffix && <span className="font-normal">{suffix}</span>}
        </>
    );
}

/**
 * 토글 가능한 Task ID 표시 컴포넌트
 */
function TogglableTaskId({ taskId, maxLength = 20, className = '' }) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!taskId) return null;

    const shouldTruncate = taskId.length > maxLength;
    const displayId = shouldTruncate && !isExpanded
        ? `${taskId.substring(0, maxLength)}...`
        : taskId;

    return (
        <span className={className}>
            {shouldTruncate ? (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left break-all"
                    title={isExpanded ? "클릭하여 줄이기" : "클릭하여 전체 보기"}
                >
                    {displayId}
                </button>
            ) : (
                <span className="break-all">{taskId}</span>
            )}
        </span>
    );
}

/**
 * 파라미터 범위 입력 컴포넌트
 */
function ParamRangeInput({ label, paramKey, value, onChange, step = 0.01, unit = '' }) {
    // 입력 중인 값을 문자열로 관리
    const [localValues, setLocalValues] = useState({
        min_value: value?.min_value?.toString() ?? '',
        max_value: value?.max_value?.toString() ?? '',
        step: value?.step?.toString() ?? ''
    });

    // 외부 value가 변경되면 로컬 값도 업데이트
    useEffect(() => {
        setLocalValues({
            min_value: value?.min_value?.toString() ?? '',
            max_value: value?.max_value?.toString() ?? '',
            step: value?.step?.toString() ?? ''
        });
    }, [value?.min_value, value?.max_value, value?.step]);

    const handleLocalChange = (field, val) => {
        setLocalValues(prev => ({ ...prev, [field]: val }));
    };

    const handleBlur = (field) => {
        const val = localValues[field];
        const numVal = val === '' ? 0 : parseFloat(val);
        onChange(paramKey, { ...value, [field]: isNaN(numVal) ? 0 : numVal });
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
            <div className="mb-3">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {label} {unit && <span className="text-slate-500">({unit})</span>}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    {paramKey}
                </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">최소값</label>
                    <input
                        type="number"
                        step={step}
                        value={localValues.min_value}
                        onChange={(e) => handleLocalChange('min_value', e.target.value)}
                        onBlur={() => handleBlur('min_value')}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">최대값</label>
                    <input
                        type="number"
                        step={step}
                        value={localValues.max_value}
                        onChange={(e) => handleLocalChange('max_value', e.target.value)}
                        onBlur={() => handleBlur('max_value')}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">증가값</label>
                    <input
                        type="number"
                        step={step}
                        value={localValues.step}
                        onChange={(e) => handleLocalChange('step', e.target.value)}
                        onBlur={() => handleBlur('step')}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                </div>
            </div>
        </div>
    );
}

/**
 * 백테스트 옵티마이저 페이지
 */
export default function BacktestOptimizer() {
    const [activeTab, setActiveTab] = useState('run'); // 'run' | 'history'
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // 실행 탭 상태
    const [allCoins, setAllCoins] = useState([]);
    const [selectedCoins, setSelectedCoins] = useState(new Set());
    const [coinSelectionMode, setCoinSelectionMode] = useState('active'); // 'all' | 'active' | 'custom'
    const [searchText, setSearchText] = useState('');
    const [marketFilter, setMarketFilter] = useState('ALL');

    // 날짜 상태
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedPreset, setSelectedPreset] = useState('1year');

    // 옵티마이저 설정
    const [maxRuns, setMaxRuns] = useState(50);
    const [maxTimeMinutes, setMaxTimeMinutes] = useState(30);
    const [targetReturn, setTargetReturn] = useState(15.0);
    const [numWorkers, setNumWorkers] = useState(2);
    const [useCustomParams, setUseCustomParams] = useState(false);

    // 옵티마이저 설정 입력용 로컬 상태 (입력 중에는 문자열로 관리)
    const [localMaxRuns, setLocalMaxRuns] = useState('50');
    const [localMaxTimeMinutes, setLocalMaxTimeMinutes] = useState('30');
    const [localTargetReturn, setLocalTargetReturn] = useState('15.0');
    const [localNumWorkers, setLocalNumWorkers] = useState('2');

    // 커스텀 파라미터 범위
    const [paramRanges, setParamRanges] = useState({
        min_up_probability: { min_value: 0.50, max_value: 0.80, step: 0.01 },
        buy_profit_threshold: { min_value: 0.5, max_value: 10.0, step: 0.5 },
        stop_loss_threshold: { min_value: 3.0, max_value: 10.0, step: 0.5 },
        take_profit_buffer: { min_value: 1.0, max_value: 5.0, step: 0.5 },
        min_profit_rate: { min_value: 3.0, max_value: 10.0, step: 1.0 },
        max_profit_rate: { min_value: 10.0, max_value: 50.0, step: 5.0 }
    });

    // 실행 상태
    const [runningTaskId, setRunningTaskId] = useState(null);
    const [taskStatus, setTaskStatus] = useState(null);
    const [taskResult, setTaskResult] = useState(null);
    const [isRunConfirmModalOpen, setIsRunConfirmModalOpen] = useState(false);

    // 이력 탭 상태
    const [historyList, setHistoryList] = useState([]);
    const [selectedDetailTaskId, setSelectedDetailTaskId] = useState(null);
    const [detailResult, setDetailResult] = useState(null);
    const [showAllTrials, setShowAllTrials] = useState(false);

    // 삭제 확인 모달
    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
    const [deleteTargetTaskId, setDeleteTargetTaskId] = useState(null);

    // Toast auto-hide
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }, [toast]);

    // 페이지 로드 시
    useEffect(() => {
        fetchCoins();
        setDefaultDates();
        restoreRunningOptimizer();
        loadActiveCoins();
    }, []);

    // 활성 종목 자동 로드
    const loadActiveCoins = async () => {
        try {
            const { data, error } = await send('/dart/api/cointrade/coins', {}, 'GET');
            if (error) {
                console.error('활성 종목 조회 실패:', error);
            } else if (data?.success && data?.response) {
                const activeCoins = data.response
                    .filter(coin => coin.isActive)
                    .map(coin => coin.coinCode);
                setSelectedCoins(new Set(activeCoins));
            }
        } catch (e) {
            console.error('활성 종목 조회 실패:', e);
        }
    };

    // localStorage에서 진행 중인 옵티마이저 복원
    const restoreRunningOptimizer = async () => {
        try {
            const savedTaskId = localStorage.getItem('optimizer_running_task_id');
            if (savedTaskId) {
                setRunningTaskId(savedTaskId);
                const { data, error } = await send(`/dart/api/backtest/optimizer/status/${savedTaskId}`, {}, 'GET');

                if (error) {
                    localStorage.removeItem('optimizer_running_task_id');
                } else if (data?.success && data?.response) {
                    setTaskStatus(data.response);

                    if (data.response.status === 'completed') {
                        await fetchTaskResult(savedTaskId);
                        localStorage.removeItem('optimizer_running_task_id');
                    } else if (data.response.status === 'failed') {
                        localStorage.removeItem('optimizer_running_task_id');
                    }
                }
            }
        } catch (e) {
            console.error('옵티마이저 복원 실패:', e);
            localStorage.removeItem('optimizer_running_task_id');
        }
    };

    // 이력 탭 활성화 시 이력 조회
    useEffect(() => {
        if (activeTab === 'history') {
            fetchHistory();
        }
    }, [activeTab]);

    // 실행 중인 옵티마이저 자동 폴링
    useEffect(() => {
        if (!runningTaskId || activeTab !== 'run') return;

        if (taskStatus?.status === 'completed' || taskStatus?.status === 'failed') {
            return;
        }

        const intervalId = setInterval(async () => {
            try {
                const { data, error } = await send(`/dart/api/backtest/optimizer/status/${runningTaskId}`, {}, 'GET');

                if (!error && data?.success && data?.response) {
                    setTaskStatus(data.response);

                    if (data.response.status === 'completed') {
                        await fetchTaskResult(runningTaskId);
                        localStorage.removeItem('optimizer_running_task_id');
                        clearInterval(intervalId);
                    } else if (data.response.status === 'failed') {
                        localStorage.removeItem('optimizer_running_task_id');
                        clearInterval(intervalId);
                    }
                }
            } catch (e) {
                console.error('자동 상태 조회 실패:', e);
            }
        }, 5000);

        return () => clearInterval(intervalId);
    }, [runningTaskId, taskStatus?.status, activeTab]);

    // ESC 키로 모달 닫기
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                if (isRunConfirmModalOpen) {
                    setIsRunConfirmModalOpen(false);
                }
            }
        };
        if (isRunConfirmModalOpen) {
            window.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isRunConfirmModalOpen]);

    const setDefaultDates = () => {
        const today = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(today.getFullYear() - 1);

        setEndDate(formatDate(today));
        setStartDate(formatDate(oneYearAgo));
    };

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const fetchCoins = async () => {
        try {
            const { data, error } = await send('/dart/api/upbit/market/all', {}, 'GET');
            if (error) {
                setToast('종목 목록 조회 실패: ' + error);
            } else if (data?.success && data?.response) {
                setAllCoins(data.response);
            }
        } catch (e) {
            console.error('종목 조회 실패:', e);
            setToast('종목 조회 중 오류가 발생했습니다.');
        }
    };

    const fetchHistory = async (limit = 20) => {
        setLoading(true);
        try {
            const { data, error } = await send(`/dart/api/backtest/optimizer/history?limit=${limit}`, {}, 'GET');
            if (error) {
                setToast('이력 조회 실패: ' + error);
            } else if (data?.success && data?.response) {
                setHistoryList(data.response);
            }
        } catch (e) {
            console.error('이력 조회 실패:', e);
            setToast('이력 조회 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 삭제 핸들러
    const handleDeleteResult = (taskId) => {
        setDeleteTargetTaskId(taskId);
        setIsDeleteConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        setIsDeleteConfirmModalOpen(false);
        const taskId = deleteTargetTaskId;
        setDeleteTargetTaskId(null);

        setLoading(true);
        try {
            const { data, error } = await send(`/dart/api/backtest/optimizer/result/${taskId}`, {}, 'DELETE');

            if (error) {
                setToast('삭제 실패: ' + error);
            } else {
                setToast('삭제되었습니다.');
                // 이력 목록 새로고침
                await fetchHistory();
                // 상세 보기 중이었다면 닫기
                if (selectedDetailTaskId === taskId) {
                    setSelectedDetailTaskId(null);
                    setDetailResult(null);
                }
            }
        } catch (e) {
            console.error('삭제 실패:', e);
            setToast('삭제 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleDatePreset = (preset) => {
        const today = new Date();
        let start = new Date();

        setSelectedPreset(preset);

        switch (preset) {
            case '1month':
                start.setMonth(today.getMonth() - 1);
                break;
            case '3months':
                start.setMonth(today.getMonth() - 3);
                break;
            case '6months':
                start.setMonth(today.getMonth() - 6);
                break;
            case '1year':
                start.setFullYear(today.getFullYear() - 1);
                break;
            case 'lastyear':
                start = new Date(today.getFullYear() - 1, 0, 1);
                const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
                setStartDate(formatDate(start));
                setEndDate(formatDate(lastYearEnd));
                return;
        }

        setStartDate(formatDate(start));
        setEndDate(formatDate(today));
    };

    const handleCoinSelectionModeChange = async (mode) => {
        setCoinSelectionMode(mode);

        if (mode === 'active') {
            try {
                const { data, error } = await send('/dart/api/cointrade/coins', {}, 'GET');
                if (error) {
                    setToast('활성 종목 조회 실패: ' + error);
                } else if (data?.success && data?.response) {
                    const activeCoins = data.response
                        .filter(coin => coin.isActive)
                        .map(coin => coin.coinCode);
                    setSelectedCoins(new Set(activeCoins));
                }
            } catch (e) {
                console.error('활성 종목 조회 실패:', e);
                setToast('활성 종목 조회 중 오류가 발생했습니다.');
            }
        } else if (mode === 'all') {
            setSelectedCoins(new Set());
        }
    };

    const handleParamRangeChange = (paramKey, value) => {
        setParamRanges(prev => ({
            ...prev,
            [paramKey]: value
        }));
    };

    const handleOpenRunConfirmModal = () => {
        // 유효성 검사
        if (coinSelectionMode === 'custom' && selectedCoins.size === 0) {
            setToast('종목을 선택해주세요.');
            return;
        }

        if (!startDate || !endDate) {
            setToast('시작일과 종료일을 선택해주세요.');
            return;
        }

        if (new Date(startDate) >= new Date(endDate)) {
            setToast('종료일은 시작일보다 나중이어야 합니다.');
            return;
        }

        setIsRunConfirmModalOpen(true);
    };

    const handleConfirmRun = async () => {
        setIsRunConfirmModalOpen(false);

        let coinCodes = [];

        if (coinSelectionMode === 'custom') {
            coinCodes = Array.from(selectedCoins);
        } else if (coinSelectionMode === 'active') {
            coinCodes = Array.from(selectedCoins);
        }

        setLoading(true);
        try {
            const payload = {
                coin_codes: coinCodes,
                start_date: startDate,
                end_date: endDate,
                max_runs: maxRuns,
                max_time_minutes: maxTimeMinutes,
                target_return: targetReturn,
                num_workers: numWorkers,
                custom_param_ranges: useCustomParams ? paramRanges : null
            };

            const { data, error } = await send('/dart/api/backtest/optimizer', payload, 'POST');

            if (error) {
                setToast('옵티마이저 실행 실패: ' + error);
            } else if (data?.success && data?.response?.task_id) {
                const taskId = data.response.task_id;
                setRunningTaskId(taskId);
                setTaskResult(null);
                localStorage.setItem('optimizer_running_task_id', taskId);

                if (data.response.status) {
                    setTaskStatus(data.response);
                } else {
                    const statusResponse = await send(`/dart/api/backtest/optimizer/status/${taskId}`, {}, 'GET');
                    if (statusResponse.data?.success && statusResponse.data?.response) {
                        setTaskStatus(statusResponse.data.response);
                    }
                }

                setToast('옵티마이저가 시작되었습니다.');
            }
        } catch (e) {
            console.error('옵티마이저 실행 실패:', e);
            setToast('옵티마이저 실행 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckStatus = async () => {
        if (!runningTaskId) return;

        setLoading(true);
        try {
            const { data, error } = await send(`/dart/api/backtest/optimizer/status/${runningTaskId}`, {}, 'GET');

            if (error) {
                setToast('상태 조회 실패: ' + error);
            } else if (data?.success && data?.response) {
                setTaskStatus(data.response);

                if (data.response.status === 'completed') {
                    await fetchTaskResult(runningTaskId);
                    localStorage.removeItem('optimizer_running_task_id');
                } else if (data.response.status === 'failed') {
                    localStorage.removeItem('optimizer_running_task_id');
                }
            }
        } catch (e) {
            console.error('상태 조회 실패:', e);
            setToast('상태 조회 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 옵티마이저 취소
    const handleCancelOptimizer = async () => {
        if (!runningTaskId) return;

        if (!confirm('실행 중인 옵티마이저를 취소하시겠습니까?')) return;

        setLoading(true);
        try {
            const { data, error } = await send(`/dart/api/backtest/optimizer/cancel/${runningTaskId}`, {}, 'POST');

            if (error) {
                setToast('취소 실패: ' + error);
            } else if (data?.success) {
                setToast('옵티마이저가 취소되었습니다.');
                setTaskStatus(prev => prev ? { ...prev, status: 'cancelled' } : null);
                localStorage.removeItem('optimizer_running_task_id');
            }
        } catch (e) {
            console.error('옵티마이저 취소 실패:', e);
            setToast('취소 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const fetchTaskResult = async (taskId, includeAllTrials = false) => {
        try {
            const params = includeAllTrials ? '?include_all_trials=true' : '';
            const { data, error } = await send(`/dart/api/backtest/optimizer/result/${taskId}${params}`, {}, 'GET');

            if (error) {
                setToast('결과 조회 실패: ' + error);
            } else if (data?.success && data?.response?.data) {
                if (includeAllTrials) {
                    setDetailResult({ taskId, data: data.response.data });
                } else {
                    setTaskResult(data.response.data);
                }
            }
        } catch (e) {
            console.error('결과 조회 실패:', e);
            setToast('결과 조회 중 오류가 발생했습니다.');
        }
    };

    const handleViewAllTrials = async () => {
        if (!runningTaskId) return;
        setShowAllTrials(true);
        await fetchTaskResult(runningTaskId, true);
    };

    const handleResetTask = () => {
        setRunningTaskId(null);
        setTaskStatus(null);
        setTaskResult(null);
        setDetailResult(null);
        setShowAllTrials(false);
        localStorage.removeItem('optimizer_running_task_id');
    };

    const getFilteredCoins = () => {
        return allCoins.filter(coin => {
            if (marketFilter !== 'ALL') {
                if (!coin.market.startsWith(marketFilter + '-')) {
                    return false;
                }
            }

            if (searchText) {
                const search = searchText.toLowerCase();
                const marketLower = coin.market.toLowerCase();
                const koreanLower = (coin.korean_name || '').toLowerCase();
                const englishLower = (coin.english_name || '').toLowerCase();

                if (!marketLower.includes(search) &&
                    !koreanLower.includes(search) &&
                    !englishLower.includes(search)) {
                    return false;
                }
            }

            return true;
        });
    };

    const handleCoinToggle = (coinCode) => {
        const newSelected = new Set(selectedCoins);
        if (newSelected.has(coinCode)) {
            newSelected.delete(coinCode);
        } else {
            newSelected.add(coinCode);
        }
        setSelectedCoins(newSelected);
    };

    const handleSelectAllFiltered = () => {
        const filtered = getFilteredCoins();
        const newSelected = new Set(selectedCoins);
        filtered.forEach(coin => newSelected.add(coin.market));
        setSelectedCoins(newSelected);
    };

    const handleDeselectAllFiltered = () => {
        const filtered = getFilteredCoins();
        const newSelected = new Set(selectedCoins);
        filtered.forEach(coin => newSelected.delete(coin.market));
        setSelectedCoins(newSelected);
    };

    const getMarketBadgeColor = (market) => {
        if (market.startsWith('KRW-')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        if (market.startsWith('BTC-')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
        if (market.startsWith('USDT-')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'running':
                return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">실행 중</span>;
            case 'completed':
                return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">완료</span>;
            case 'failed':
                return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">실패</span>;
            default:
                return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">{status}</span>;
        }
    };

    const filteredCoins = getFilteredCoins();

    const getParamLabel = (key) => {
        const labels = {
            // 백테스트 옵티마이저 파라미터 (소문자)
            min_up_probability: '최소 상승 확률 (%)',
            buy_profit_threshold: '매수 조건 (기대 수익률 %)',
            stop_loss_threshold: '손절선 (%)',
            take_profit_buffer: '익절 버퍼 (%)',
            min_profit_rate: '최소 익절률 (%)',
            max_profit_rate: '최대 익절률 (%)',
            // 고정 파라미터 (소문자)
            initial_capital: '초기 자본 (원)',
            buy_amount_per_coin: '종목당 매수금액 (원)',
            prediction_days: '예측 기간 (일)',
            ensemble_mode: '앙상블 모드',
            buy_fee_rate: '매수 수수료율',
            sell_fee_rate: '매도 수수료율'
        };
        return labels[key] || key;
    };

    return (
        <div className="p-2 md:p-4">
            <PageTitle>백테스트 옵티마이저</PageTitle>

            {/* 탭 */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
                <div className="flex border-b border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('run')}
                        className={`flex-1 px-6 py-3 font-medium transition-colors ${activeTab === 'run'
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                    >
                        옵티마이저 실행
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 px-6 py-3 font-medium transition-colors ${activeTab === 'history'
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                    >
                        결과 조회
                    </button>
                </div>
            </div>

            {/* 실행 탭 */}
            {activeTab === 'run' && (
                <div className="space-y-6">
                    {/* 종목 선택 모드 */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                            종목 선택
                        </h2>
                        <div className="flex gap-6 mb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="coinMode"
                                    value="all"
                                    checked={coinSelectionMode === 'all'}
                                    onChange={(e) => handleCoinSelectionModeChange(e.target.value)}
                                    className="w-4 h-4"
                                />
                                <span className="text-slate-700 dark:text-slate-300">전체 종목</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="coinMode"
                                    value="active"
                                    checked={coinSelectionMode === 'active'}
                                    onChange={(e) => handleCoinSelectionModeChange(e.target.value)}
                                    className="w-4 h-4"
                                />
                                <span className="text-slate-700 dark:text-slate-300">활성화된 종목만</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="coinMode"
                                    value="custom"
                                    checked={coinSelectionMode === 'custom'}
                                    onChange={(e) => handleCoinSelectionModeChange(e.target.value)}
                                    className="w-4 h-4"
                                />
                                <span className="text-slate-700 dark:text-slate-300">
                                    직접 선택
                                    {coinSelectionMode === 'custom' && selectedCoins.size > 0 && (
                                        <span className="ml-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                                            ({selectedCoins.size}개 선택됨)
                                        </span>
                                    )}
                                </span>
                            </label>
                        </div>

                        {coinSelectionMode === 'active' && (
                            <div className="text-sm text-slate-600 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                                활성화된 {selectedCoins.size}개 종목이 선택되었습니다.
                            </div>
                        )}

                        {coinSelectionMode === 'custom' && (
                            <>
                                <div className="flex flex-col md:flex-row gap-4 mb-4">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setMarketFilter('ALL')}
                                            className={`px-3 py-1.5 rounded text-sm ${marketFilter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}
                                        >
                                            전체
                                        </button>
                                        <button
                                            onClick={() => setMarketFilter('KRW')}
                                            className={`px-3 py-1.5 rounded text-sm ${marketFilter === 'KRW' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}
                                        >
                                            KRW
                                        </button>
                                        <button
                                            onClick={() => setMarketFilter('BTC')}
                                            className={`px-3 py-1.5 rounded text-sm ${marketFilter === 'BTC' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}
                                        >
                                            BTC
                                        </button>
                                        <button
                                            onClick={() => setMarketFilter('USDT')}
                                            className={`px-3 py-1.5 rounded text-sm ${marketFilter === 'USDT' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}
                                        >
                                            USDT
                                        </button>
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="종목코드 또는 종목명 검색..."
                                            value={searchText}
                                            onChange={(e) => setSearchText(e.target.value)}
                                            className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button onClick={handleSelectAllFiltered} className="px-4 py-1.5 text-sm">
                                            전체 선택
                                        </Button>
                                        <Button onClick={handleDeselectAllFiltered} className="px-4 py-1.5 text-sm">
                                            전체 해제
                                        </Button>
                                    </div>
                                </div>

                                <div className="max-h-96 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {filteredCoins.map((coin) => (
                                            <label
                                                key={coin.market}
                                                className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCoins.has(coin.market)}
                                                    onChange={() => handleCoinToggle(coin.market)}
                                                    className="w-4 h-4"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1">
                                                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getMarketBadgeColor(coin.market)}`}>
                                                            {coin.market.split('-')[0]}
                                                        </span>
                                                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                                            {coin.market}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                                                        {coin.korean_name}
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                                    ✓ {selectedCoins.size}개 종목 선택됨
                                </div>
                            </>
                        )}
                    </div>

                    {/* 기간 선택 */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
                                기간 선택
                            </h2>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                ⚠️ 60일 이상의 기간을 선택해야 정상적으로 동작합니다.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                            <button
                                onClick={() => handleDatePreset('3months')}
                                className={`px-3 py-1.5 rounded text-sm ${selectedPreset === '3months'
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                                    }`}
                            >
                                최근 3개월
                            </button>
                            <button
                                onClick={() => handleDatePreset('6months')}
                                className={`px-3 py-1.5 rounded text-sm ${selectedPreset === '6months'
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                                    }`}
                            >
                                최근 6개월
                            </button>
                            <button
                                onClick={() => handleDatePreset('1year')}
                                className={`px-3 py-1.5 rounded text-sm ${selectedPreset === '1year'
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                                    }`}
                            >
                                최근 1년
                            </button>
                            <button
                                onClick={() => handleDatePreset('lastyear')}
                                className={`px-3 py-1.5 rounded text-sm ${selectedPreset === 'lastyear'
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                                    }`}
                            >
                                전년도 전체
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    시작일
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        setSelectedPreset('');
                                    }}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    종료일
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value);
                                        setSelectedPreset('');
                                    }}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 옵티마이저 설정 */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                            옵티마이저 설정
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div>
                                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">최대 실행 횟수</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="1000"
                                    value={localMaxRuns}
                                    onChange={(e) => setLocalMaxRuns(e.target.value)}
                                    onBlur={() => {
                                        const val = parseInt(localMaxRuns) || 50;
                                        setMaxRuns(val);
                                        setLocalMaxRuns(val.toString());
                                    }}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">최대 실행 시간 (분)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="180"
                                    value={localMaxTimeMinutes}
                                    onChange={(e) => setLocalMaxTimeMinutes(e.target.value)}
                                    onBlur={() => {
                                        const val = parseInt(localMaxTimeMinutes) || 30;
                                        setMaxTimeMinutes(val);
                                        setLocalMaxTimeMinutes(val.toString());
                                    }}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">목표 수익률 (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={localTargetReturn}
                                    onChange={(e) => setLocalTargetReturn(e.target.value)}
                                    onBlur={() => {
                                        const val = parseFloat(localTargetReturn) || 15.0;
                                        setTargetReturn(val);
                                        setLocalTargetReturn(val.toString());
                                    }}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                                />
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">목표 수익률 미만의 결과는 결과에 포함되지 않습니다.</p>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">병렬 작업자 수</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="8"
                                    value={localNumWorkers}
                                    onChange={(e) => setLocalNumWorkers(e.target.value)}
                                    onBlur={() => {
                                        const val = parseInt(localNumWorkers) || 2;
                                        setNumWorkers(val);
                                        setLocalNumWorkers(val.toString());
                                    }}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                                />
                            </div>
                        </div>

                        {/* 커스텀 파라미터 토글 */}
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                            <label className="flex items-center gap-2 cursor-pointer mb-4">
                                <input
                                    type="checkbox"
                                    checked={useCustomParams}
                                    onChange={(e) => setUseCustomParams(e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <span className="text-slate-700 dark:text-slate-300 font-medium">커스텀 파라미터 범위 설정</span>
                            </label>

                            {useCustomParams && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <ParamRangeInput
                                        label="최소 상승 확률"
                                        paramKey="min_up_probability"
                                        value={paramRanges.min_up_probability}
                                        onChange={handleParamRangeChange}
                                        step={0.05}
                                        unit="0~1"
                                    />
                                    <ParamRangeInput
                                        label="매수 조건 (기대 수익률)"
                                        paramKey="buy_profit_threshold"
                                        value={paramRanges.buy_profit_threshold}
                                        onChange={handleParamRangeChange}
                                        step={1}
                                        unit="%"
                                    />
                                    <ParamRangeInput
                                        label="손절선"
                                        paramKey="stop_loss_threshold"
                                        value={paramRanges.stop_loss_threshold}
                                        onChange={handleParamRangeChange}
                                        step={0.5}
                                        unit="%"
                                    />
                                    <ParamRangeInput
                                        label="익절 버퍼"
                                        paramKey="take_profit_buffer"
                                        value={paramRanges.take_profit_buffer}
                                        onChange={handleParamRangeChange}
                                        step={0.5}
                                        unit="%"
                                    />
                                    <ParamRangeInput
                                        label="최소 익절률"
                                        paramKey="min_profit_rate"
                                        value={paramRanges.min_profit_rate}
                                        onChange={handleParamRangeChange}
                                        step={1}
                                        unit="%"
                                    />
                                    <ParamRangeInput
                                        label="최대 익절률"
                                        paramKey="max_profit_rate"
                                        value={paramRanges.max_profit_rate}
                                        onChange={handleParamRangeChange}
                                        step={5}
                                        unit="%"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 실행 버튼 */}
                    <div className="flex justify-center">
                        <Button
                            size="lg"
                            onClick={handleOpenRunConfirmModal}
                            disabled={loading || (runningTaskId && taskStatus?.status === 'running')}
                        >
                            {loading ? '실행 중...' : '옵티마이저 실행'}
                        </Button>
                    </div>

                    {/* 실행 상태 표시 */}
                    {runningTaskId && taskStatus && (
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                                    실행 상태
                                </h2>
                                <div className="flex items-center gap-4">
                                    {getStatusBadge(taskStatus.status)}
                                    {taskStatus.status === 'completed' && (
                                        <Button size="sm" variant="outline" onClick={handleResetTask}>
                                            새로 실행
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                    <div className="text-sm text-slate-500 dark:text-slate-400">Task ID</div>
                                    <div className="font-mono text-sm text-slate-800 dark:text-slate-200">
                                        <TogglableTaskId taskId={runningTaskId} maxLength={15} />
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                    <div className="text-sm text-slate-500 dark:text-slate-400">진행률</div>
                                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                                        {taskStatus.progress || `${taskStatus.current_trial || 0}/${taskStatus.total_trials || '?'}`}
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                    <div className="text-sm text-slate-500 dark:text-slate-400">최고 점수</div>
                                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                                        {taskStatus.best_score?.toFixed(2) || '-'}
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                    <div className="text-sm text-slate-500 dark:text-slate-400">최고 수익률</div>
                                    <div className={`font-semibold ${taskStatus.best_return >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {taskStatus.best_return != null ? `${taskStatus.best_return.toFixed(2)}%` : '-'}
                                    </div>
                                </div>
                            </div>

                            {taskStatus.status === 'running' && (
                                <div className="flex justify-center gap-2">
                                    <Button size="sm" variant="outline" onClick={handleCheckStatus} disabled={loading}>
                                        상태 새로고침
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleCancelOptimizer}
                                        disabled={loading}
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                    >
                                        중지
                                    </Button>
                                </div>
                            )}

                            {taskStatus.status === 'failed' && taskStatus.error_message && (
                                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
                                    <div className="text-sm text-red-600 dark:text-red-400">
                                        {taskStatus.error_message}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 결과 표시 */}
                    {taskResult && (
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                                    최적화 결과
                                </h2>
                                <Button size="sm" variant="outline" onClick={handleViewAllTrials}>
                                    모든 시행 결과 보기
                                </Button>
                            </div>

                            {/* 최적 파라미터 */}
                            <div className="mb-6">
                                <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-4">
                                    최적 파라미터
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                    {taskResult.best_params && Object.entries(taskResult.best_params).map(([key, value]) => (
                                        <div key={key} className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                                            <div className="text-xs text-blue-600 dark:text-blue-400 mb-0.5">
                                                {getParamLabel(key)}
                                            </div>
                                            <div className="text-[10px] text-slate-400 dark:text-slate-500 mb-1 font-mono">
                                                {key}
                                            </div>
                                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                {typeof value === 'number' ? value.toFixed(2) : value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 결과 요약 */}
                            <div className="mb-6">
                                <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-4">
                                    결과 요약
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                        <div className="text-sm text-slate-500 dark:text-slate-400">최고 점수</div>
                                        <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                            {taskResult.best_score?.toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                        <div className="text-sm text-slate-500 dark:text-slate-400">최고 수익률</div>
                                        <div className={`text-xl font-bold ${taskResult.best_return >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {taskResult.best_return?.toFixed(2)}%
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                        <div className="text-sm text-slate-500 dark:text-slate-400">총 시행 횟수</div>
                                        <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                            {taskResult.total_trials || 0}회
                                        </div>
                                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                            성공: {taskResult.completed_trials || 0} / 실패: {taskResult.failed_trials || 0}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                        <div className="text-sm text-slate-500 dark:text-slate-400">목표 달성</div>
                                        <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                            {taskResult.target_met_trials || 0}회
                                        </div>
                                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                            목표 수익률 이상
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                        <div className="text-sm text-slate-500 dark:text-slate-400">소요 시간</div>
                                        <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                            {taskResult.elapsed_time_seconds?.toFixed(1)}초
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 고정 파라미터 */}
                            {taskResult.fixed_params && (
                                <div className="mb-6">
                                    <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-4">
                                        고정 파라미터
                                    </h3>
                                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
                                            {Object.entries(taskResult.fixed_params).map(([key, value]) => (
                                                <div key={key}>
                                                    <div className="text-slate-500 dark:text-slate-400">{key}</div>
                                                    <div className="font-medium text-slate-800 dark:text-slate-200">
                                                        {typeof value === 'number'
                                                            ? (key.includes('fee_rate') || Math.abs(value) < 0.01
                                                                ? value.toFixed(4)
                                                                : value.toLocaleString())
                                                            : value}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 파라미터 범위 */}
                            {taskResult.param_ranges && (
                                <div>
                                    <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-4">
                                        탐색된 파라미터 범위
                                    </h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-100 dark:bg-slate-700">
                                                    <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-300">파라미터</th>
                                                    <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-300">최소</th>
                                                    <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-300">최대</th>
                                                    <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-300">증가값</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(taskResult.param_ranges).map(([key, range]) => (
                                                    <tr key={key} className="border-b border-slate-200 dark:border-slate-600">
                                                        <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                                                            <div>{getParamLabel(key)}</div>
                                                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{key}</div>
                                                        </td>
                                                        <td className="px-4 py-2 text-right text-slate-800 dark:text-slate-200">{range.min}</td>
                                                        <td className="px-4 py-2 text-right text-slate-800 dark:text-slate-200">{range.max}</td>
                                                        <td className="px-4 py-2 text-right text-slate-800 dark:text-slate-200">{range.step}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 모든 시행 결과 모달 */}
                    {showAllTrials && detailResult?.data?.all_trials && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
                            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
                                <div className="flex items-center justify-between p-3 md:p-4 border-b border-slate-200 dark:border-slate-700">
                                    <h3 className="text-base md:text-lg font-semibold text-slate-800 dark:text-slate-200">
                                        모든 시행 결과 ({detailResult.data.all_trials.length}개)
                                    </h3>
                                    <button
                                        onClick={() => setShowAllTrials(false)}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                    >
                                        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="flex-1 overflow-auto p-2 md:p-4">
                                    <table className="w-full text-sm min-w-[800px]">
                                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700">
                                            <tr>
                                                <th className="px-2 py-2 text-left font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">#</th>
                                                <th className="px-2 py-2 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">수익률</th>
                                                <th className="px-2 py-2 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">승률</th>
                                                <th className="px-2 py-2 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">거래</th>
                                                <th className="px-2 py-2 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">MDD</th>
                                                <th className="px-2 py-2 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">Sharpe</th>
                                                <th className="px-2 py-2 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">안정성</th>
                                                <th className="px-2 py-2 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">점수</th>
                                                <th className="px-2 py-2 text-center font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">파라미터</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detailResult.data.all_trials
                                                .sort((a, b) => b.final_score - a.final_score)
                                                .map((trial, index) => (
                                                    <tr
                                                        key={trial.trial_id}
                                                        className={`border-b border-slate-200 dark:border-slate-600 ${index === 0 ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}
                                                    >
                                                        <td className="px-2 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                            {trial.trial_id}
                                                            {index === 0 && <span className="ml-1 text-yellow-600">★</span>}
                                                        </td>
                                                        <td className={`px-2 py-2 text-right font-medium whitespace-nowrap ${trial.total_return >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                            {trial.total_return?.toFixed(2)}%
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                            {typeof trial.win_rate === 'number' ? trial.win_rate.toFixed(2) : trial.win_rate}%
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                            {trial.total_trades}
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                            {typeof trial.max_drawdown === 'number' ? trial.max_drawdown.toFixed(2) : trial.max_drawdown}%
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                            {trial.sharpe_ratio?.toFixed(2)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                            {trial.stability_score?.toFixed(2)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                            {trial.final_score?.toFixed(2)}
                                                        </td>
                                                        <td className="px-2 py-2">
                                                            <div className="flex flex-wrap gap-1 justify-center min-w-[150px]">
                                                                {trial.params && Object.entries(trial.params).map(([k, v]) => (
                                                                    <span
                                                                        key={k}
                                                                        className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-600 rounded whitespace-nowrap"
                                                                        title={getParamLabel(k)}
                                                                    >
                                                                        {typeof v === 'number' ? v.toFixed(2) : v}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 결과 조회 탭 */}
            {activeTab === 'history' && (
                <div className="space-y-6">
                    {/* 이력 목록 */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                                옵티마이저 이력
                            </h2>
                            <Button size="sm" variant="outline" onClick={() => fetchHistory()} disabled={loading}>
                                {loading ? '조회 중...' : '새로고침'}
                            </Button>
                        </div>

                        {historyList.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                이력이 없습니다.
                            </div>
                        ) : (
                            <>
                                {/* 모바일: 카드 형태 */}
                                <div className="lg:hidden space-y-4">
                                    {historyList.map((item) => (
                                        <div
                                            key={item.task_id}
                                            className="border border-slate-200 dark:border-slate-600 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                {getStatusBadge(item.status)}
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                    {item.created_at ? new Date(item.created_at).toLocaleString('ko-KR') : '-'}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {item.coin_codes?.slice(0, 5).map(code => (
                                                    <span key={code} className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                                                        {code.replace('KRW-', '')}
                                                    </span>
                                                ))}
                                                {item.coin_codes?.length > 5 && (
                                                    <span className="text-xs text-slate-500">+{item.coin_codes.length - 5}</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                                                {item.start_date} ~ {item.end_date}
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 mb-3">
                                                <div className="bg-slate-50 dark:bg-slate-700 rounded p-2">
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">점수</div>
                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                        {item.best_score?.toFixed(1) || '-'}
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-700 rounded p-2">
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">수익률</div>
                                                    <div className={`font-semibold ${item.best_return >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        {item.best_return != null ? `${item.best_return.toFixed(1)}%` : '-'}
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-700 rounded p-2">
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">시행</div>
                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                        {item.total_trials || '-'}
                                                    </div>
                                                </div>
                                            </div>
                                            {item.stop_reason && (
                                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                                    중단: {item.stop_reason}
                                                </div>
                                            )}
                                            <div className="flex gap-2 pt-2">
                                                <button
                                                    className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                                                    onClick={async () => {
                                                        setSelectedDetailTaskId(item.task_id);
                                                        setLoading(true);
                                                        try {
                                                            await fetchTaskResult(item.task_id, true);
                                                        } finally {
                                                            setLoading(false);
                                                        }
                                                    }}
                                                    disabled={loading}
                                                >
                                                    상세 보기
                                                </button>
                                                <button
                                                    className="flex-1 px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 bg-white dark:bg-red-900/30 text-red-600 dark:text-red-200 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                                                    onClick={() => handleDeleteResult(item.task_id)}
                                                    disabled={loading}
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* 데스크톱: 테이블 형태 */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="w-full text-sm min-w-[900px]">
                                        <thead>
                                            <tr className="bg-slate-100 dark:bg-slate-700">
                                                <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">상태</th>
                                                <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">코인</th>
                                                <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">기간</th>
                                                <th className="px-3 py-3 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">점수</th>
                                                <th className="px-3 py-3 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">수익률</th>
                                                <th className="px-3 py-3 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">시행</th>
                                                <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">중단</th>
                                                <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">생성일시</th>
                                                <th className="px-3 py-3 text-center font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">상세</th>
                                                <th className="px-3 py-3 text-center font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">삭제</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historyList.map((item) => (
                                                <tr key={item.task_id} className="border-b border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                    <td className="px-3 py-3">
                                                        {getStatusBadge(item.status)}
                                                    </td>
                                                    <td className="px-3 py-3 text-slate-700 dark:text-slate-300">
                                                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                                                            {item.coin_codes?.slice(0, 3).map(code => (
                                                                <span key={code} className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                                                                    {code.replace('KRW-', '')}
                                                                </span>
                                                            ))}
                                                            {item.coin_codes?.length > 3 && (
                                                                <span className="text-xs text-slate-500">+{item.coin_codes.length - 3}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">
                                                        {item.start_date} ~ {item.end_date}
                                                    </td>
                                                    <td className="px-3 py-3 text-right font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                        {item.best_score?.toFixed(2) || '-'}
                                                    </td>
                                                    <td className={`px-3 py-3 text-right font-medium whitespace-nowrap ${item.best_return >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        {item.best_return != null ? `${item.best_return.toFixed(2)}%` : '-'}
                                                    </td>
                                                    <td className="px-3 py-3 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                        {item.total_trials || '-'}
                                                    </td>
                                                    <td className="px-3 py-3 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">
                                                        {item.stop_reason || '-'}
                                                    </td>
                                                    <td className="px-3 py-3 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">
                                                        {item.created_at ? new Date(item.created_at).toLocaleString('ko-KR') : '-'}
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <button
                                                            className="text-blue-600 dark:text-blue-200 hover:text-blue-700 dark:hover:text-white bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-50"
                                                            onClick={async () => {
                                                                setSelectedDetailTaskId(item.task_id);
                                                                setLoading(true);
                                                                try {
                                                                    await fetchTaskResult(item.task_id, true);
                                                                } finally {
                                                                    setLoading(false);
                                                                }
                                                            }}
                                                            disabled={loading}
                                                        >
                                                            상세
                                                        </button>
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <button
                                                            className="text-red-600 dark:text-red-200 hover:text-red-700 dark:hover:text-white bg-red-50 dark:bg-red-900/40 hover:bg-red-100 dark:hover:bg-red-900/60 px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-50"
                                                            onClick={() => handleDeleteResult(item.task_id)}
                                                            disabled={loading}
                                                        >
                                                            삭제
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Task ID 직접 입력 */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-4">
                            Task ID로 직접 조회
                        </h3>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="text"
                                placeholder="Task ID 입력..."
                                value={selectedDetailTaskId || ''}
                                onChange={(e) => setSelectedDetailTaskId(e.target.value)}
                                className="flex-1 min-w-0 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                            />
                            <Button
                                className="shrink-0"
                                onClick={async () => {
                                    if (!selectedDetailTaskId) {
                                        setToast('Task ID를 입력해주세요.');
                                        return;
                                    }
                                    setLoading(true);
                                    try {
                                        await fetchTaskResult(selectedDetailTaskId, true);
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={loading}
                            >
                                {loading ? '조회 중...' : '결과 조회'}
                            </Button>
                        </div>
                    </div>

                    {/* 조회된 결과 표시 */}
                    {detailResult && !showAllTrials && (
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                                    조회 결과
                                </h3>
                                <div className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                                    <TogglableTaskId taskId={detailResult.taskId} maxLength={30} />
                                </div>
                            </div>

                            {/* 최적 파라미터 */}
                            <div className="mb-6">
                                <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">
                                    최적 파라미터
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                    {detailResult.data.best_params && Object.entries(detailResult.data.best_params).map(([key, value]) => (
                                        <div key={key} className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
                                            <div className="text-xs text-blue-600 dark:text-blue-400 mb-0.5">
                                                {getParamLabel(key)}
                                            </div>
                                            <div className="text-[10px] text-slate-400 dark:text-slate-500 mb-1 font-mono">
                                                {key}
                                            </div>
                                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                {typeof value === 'number' ? value.toFixed(2) : value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 결과 요약 */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                    <div className="text-sm text-slate-500 dark:text-slate-400">최고 점수</div>
                                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                        {detailResult.data.best_score?.toFixed(2)}
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                    <div className="text-sm text-slate-500 dark:text-slate-400">최고 수익률</div>
                                    <div className={`text-xl font-bold ${detailResult.data.best_return >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {detailResult.data.best_return?.toFixed(2)}%
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                    <div className="text-sm text-slate-500 dark:text-slate-400">총 시행 횟수</div>
                                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                        {detailResult.data.total_trials || 0}회
                                    </div>
                                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                        성공: {detailResult.data.completed_trials || 0} / 실패: {detailResult.data.failed_trials || 0}
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                    <div className="text-sm text-slate-500 dark:text-slate-400">목표 달성</div>
                                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                        {detailResult.data.target_met_trials || 0}회
                                    </div>
                                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                        목표 수익률 이상
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                    <div className="text-sm text-slate-500 dark:text-slate-400">소요 시간</div>
                                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                        {detailResult.data.elapsed_time_seconds?.toFixed(1)}초
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                    <div className="text-sm text-slate-500 dark:text-slate-400">중단 사유</div>
                                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                        {detailResult.data.stop_reason || '-'}
                                    </div>
                                </div>
                            </div>

                            {/* 고정 파라미터 */}
                            {detailResult.data.fixed_params && (
                                <div className="mb-6">
                                    <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">
                                        고정 파라미터
                                    </h4>
                                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
                                            {Object.entries(detailResult.data.fixed_params).map(([key, value]) => (
                                                <div key={key}>
                                                    <div className="text-slate-500 dark:text-slate-400">{key}</div>
                                                    <div className="font-medium text-slate-800 dark:text-slate-200">
                                                        {typeof value === 'number'
                                                            ? (key.includes('fee_rate') || Math.abs(value) < 0.01
                                                                ? value.toFixed(4)
                                                                : value.toLocaleString())
                                                            : value}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 파라미터 범위 */}
                            {detailResult.data.param_ranges && (
                                <div className="mb-6">
                                    <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">
                                        탐색된 파라미터 범위
                                    </h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-100 dark:bg-slate-700">
                                                    <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-300">파라미터</th>
                                                    <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-300">최소</th>
                                                    <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-300">최대</th>
                                                    <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-300">증가값</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(detailResult.data.param_ranges).map(([key, range]) => (
                                                    <tr key={key} className="border-b border-slate-200 dark:border-slate-600">
                                                        <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                                                            <div>{getParamLabel(key)}</div>
                                                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{key}</div>
                                                        </td>
                                                        <td className="px-4 py-2 text-right text-slate-800 dark:text-slate-200">{range.min}</td>
                                                        <td className="px-4 py-2 text-right text-slate-800 dark:text-slate-200">{range.max}</td>
                                                        <td className="px-4 py-2 text-right text-slate-800 dark:text-slate-200">{range.step}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* 모든 시행 결과 */}
                            {detailResult.data.all_trials && detailResult.data.all_trials.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">
                                        모든 시행 결과 ({detailResult.data.all_trials.length}개)
                                    </h4>
                                    <div className="overflow-x-auto max-h-96">
                                        <table className="w-full text-sm min-w-[800px]">
                                            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700">
                                                <tr>
                                                    <th className="px-2 py-2 text-left font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">#</th>
                                                    <th className="px-2 py-2 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">수익률</th>
                                                    <th className="px-2 py-2 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">승률</th>
                                                    <th className="px-2 py-2 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">거래</th>
                                                    <th className="px-2 py-2 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">MDD</th>
                                                    <th className="px-2 py-2 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">Sharpe</th>
                                                    <th className="px-2 py-2 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">안정성</th>
                                                    <th className="px-2 py-2 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">점수</th>
                                                    <th className="px-2 py-2 text-center font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">파라미터</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detailResult.data.all_trials
                                                    .sort((a, b) => b.final_score - a.final_score)
                                                    .map((trial, index) => (
                                                        <tr
                                                            key={trial.trial_id}
                                                            className={`border-b border-slate-200 dark:border-slate-600 ${index === 0 ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}
                                                        >
                                                            <td className="px-2 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                                {trial.trial_id}
                                                                {index === 0 && <span className="ml-1 text-yellow-600">★</span>}
                                                            </td>
                                                            <td className={`px-2 py-2 text-right font-medium whitespace-nowrap ${trial.total_return >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                {trial.total_return?.toFixed(2)}%
                                                            </td>
                                                            <td className="px-2 py-2 text-right text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                                {typeof trial.win_rate === 'number' ? trial.win_rate.toFixed(2) : trial.win_rate}%
                                                            </td>
                                                            <td className="px-2 py-2 text-right text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                                {trial.total_trades}
                                                            </td>
                                                            <td className="px-2 py-2 text-right text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                                {typeof trial.max_drawdown === 'number' ? trial.max_drawdown.toFixed(2) : trial.max_drawdown}%
                                                            </td>
                                                            <td className="px-2 py-2 text-right text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                                {trial.sharpe_ratio?.toFixed(2)}
                                                            </td>
                                                            <td className="px-2 py-2 text-right text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                                {trial.stability_score?.toFixed(2)}
                                                            </td>
                                                            <td className="px-2 py-2 text-right font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                                {trial.final_score?.toFixed(2)}
                                                            </td>
                                                            <td className="px-2 py-2">
                                                                <div className="flex flex-wrap gap-1 justify-center min-w-[150px]">
                                                                    {trial.params && Object.entries(trial.params).map(([k, v]) => (
                                                                        <span
                                                                            key={k}
                                                                            className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-600 rounded whitespace-nowrap"
                                                                            title={getParamLabel(k)}
                                                                        >
                                                                            {typeof v === 'number' ? v.toFixed(2) : v}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                        </div>
                    )}
                </div>
            )}

            {/* 실행 확인 모달 */}
            {isRunConfirmModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 animate-fade-in overflow-y-auto"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsRunConfirmModalOpen(false);
                    }}
                >
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg my-4">
                        {/* 헤더 */}
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                옵티마이저 실행 확인
                            </h3>
                        </div>

                        {/* 콘텐츠 */}
                        <div className="px-6 py-4 space-y-4">
                            {/* 기본 정보 */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">종목 선택</span>
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                        {coinSelectionMode === 'all' && '전체 종목'}
                                        {coinSelectionMode === 'active' && `활성화된 종목 (${selectedCoins.size}개)`}
                                        {coinSelectionMode === 'custom' && `직접 선택 (${selectedCoins.size}개)`}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">기간</span>
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                        {startDate} ~ {endDate}
                                    </span>
                                </div>
                            </div>

                            {/* 옵티마이저 설정 */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">최대 실행 횟수</span>
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{maxRuns}회</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">최대 실행 시간</span>
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{maxTimeMinutes}분</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">목표 수익률</span>
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{targetReturn}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">병렬 작업자</span>
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{numWorkers}개</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">커스텀 파라미터</span>
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                        {useCustomParams ? '사용' : '기본값'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 푸터 */}
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => setIsRunConfirmModalOpen(false)}>
                                취소
                            </Button>
                            <Button onClick={handleConfirmRun}>
                                실행
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* 삭제 확인 모달 */}
            {isDeleteConfirmModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsDeleteConfirmModalOpen(false);
                    }}
                >
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
                        {/* 헤더 */}
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                옵티마이저 결과 삭제
                            </h3>
                        </div>

                        {/* 콘텐츠 */}
                        <div className="px-6 py-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                이 옵티마이저 결과를 삭제하시겠습니까?
                            </p>
                            {deleteTargetTaskId && (
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 mb-4">
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Task ID</div>
                                    <div className="text-sm font-mono text-slate-800 dark:text-slate-200 break-all">
                                        <TogglableTaskId taskId={deleteTargetTaskId} maxLength={30} />
                                    </div>
                                </div>
                            )}
                            <p className="text-xs text-red-600 dark:text-red-400">
                                ⚠️ 삭제된 데이터는 복구할 수 없습니다.
                            </p>
                        </div>

                        {/* 푸터 */}
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-3 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsDeleteConfirmModalOpen(false);
                                    setDeleteTargetTaskId(null);
                                }}
                            >
                                취소
                            </Button>
                            <Button
                                onClick={handleConfirmDelete}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                삭제
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-4 right-4 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 px-6 py-3 rounded-lg shadow-lg z-50">
                    {toast}
                </div>
            )}
        </div>
    );
}
