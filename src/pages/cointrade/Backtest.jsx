import { useState, useEffect, useMemo } from 'react';
import { send } from '@/util/ClientUtil';
import PageTitle from '@/component/common/display/PageTitle';
import Button from '@/component/common/button/Button';
import ExcelJS from 'exceljs';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

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
 * 진행률 문자열 보정 (0/? -> 0/10 형태로 변환)
 */
function formatProgress(progress) {
    if (!progress) return '-';

    // "0/?" 형태인 경우 localStorage에서 전체 개수 가져오기
    if (progress.includes('?')) {
        const totalCount = localStorage.getItem('backtest_total_count');
        if (totalCount) {
            return progress.replace('?', totalCount);
        }
    }

    return progress;
}

/**
 * 백테스트 진행률 바 컴포넌트
 */
function BacktestProgressBar({ currentStep, totalSteps, progress, status }) {
    // 진행률 계산
    const isIndeterminate = !totalSteps || totalSteps === 0;
    const percent = isIndeterminate ? 0 : Math.round((currentStep / totalSteps) * 100);

    // 완료/실패 상태면 프로그레스 바 숨김
    if (status === 'completed' || status === 'failed') {
        return null;
    }

    return (
        <div className="space-y-2">
            {/* 프로그레스 바 */}
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden relative">
                {isIndeterminate ? (
                    // 불확정 상태 (데이터/모델 로드 중) - 좌우 움직이는 애니메이션
                    <div
                        className="h-full w-1/3 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 rounded-full absolute animate-[shimmer_1.5s_ease-in-out_infinite]"
                        style={{
                            animation: 'shimmer 1.5s ease-in-out infinite',
                        }}
                    />
                ) : (
                    // 확정 상태 (시뮬레이션 진행 중)
                    <div
                        className="h-full bg-blue-500 transition-all duration-300 ease-out"
                        style={{ width: `${percent}%` }}
                    />
                )}
            </div>
            {/* 진행률 텍스트 */}
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>{formatProgress(progress)}</span>
                {!isIndeterminate ? (
                    <span className="font-medium">{percent}%</span>
                ) : (
                    <span className="text-blue-500 animate-pulse">준비 중...</span>
                )}
            </div>
            {/* CSS 애니메이션 정의 */}
            <style>{`
                @keyframes shimmer {
                    0% { left: -33%; }
                    100% { left: 100%; }
                }
            `}</style>
        </div>
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
 * 백테스트 페이지
 */
export default function Backtest() {
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

    // 실행 상태
    const [runningTaskId, setRunningTaskId] = useState(null);
    const [taskStatus, setTaskStatus] = useState(null);
    const [taskResult, setTaskResult] = useState(null);
    const [isRunConfirmModalOpen, setIsRunConfirmModalOpen] = useState(false);

    // 백테스트 파라미터 설정
    const [configLoading, setConfigLoading] = useState(false);
    const [backtestConfig, setBacktestConfig] = useState({
        initial_capital: 1000000,
        buy_amount_per_coin: 100000,
        min_up_probability: 60,
        buy_profit_threshold: 10,
        take_profit_buffer: 3,
        stop_loss_threshold: 5,
        min_profit_rate: 5,
        max_profit_rate: 30,
        prediction_days: 3,
        buy_fee_rate: 0.05,
        sell_fee_rate: 0.05,
        sequence_length: 60
    });

    // 삭제 확인 모달
    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
    const [deleteTargetTaskId, setDeleteTargetTaskId] = useState(null);
    const [isDeleteSelectedModalOpen, setIsDeleteSelectedModalOpen] = useState(false);

    // 이력 탭 상태
    const [historyList, setHistoryList] = useState([]);
    const [selectedHistoryIds, setSelectedHistoryIds] = useState([]);
    const [compareResults, setCompareResults] = useState([]);
    const [selectedDetailTaskId, setSelectedDetailTaskId] = useState(null);
    const [detailResult, setDetailResult] = useState(null);

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
        restoreRunningBacktest();
        loadActiveCoins(); // 활성 종목 자동 로드
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

    // localStorage에서 진행 중인 백테스트 복원
    const restoreRunningBacktest = async () => {
        try {
            const savedTaskId = localStorage.getItem('backtest_running_task_id');
            if (savedTaskId) {
                setRunningTaskId(savedTaskId);
                // 상태 조회하여 현재 상태 확인
                const { data, error } = await send(`/dart/api/backtest/status/${savedTaskId}`, {}, 'GET');

                if (error) {
                    // 에러 시 localStorage 정리
                    localStorage.removeItem('backtest_running_task_id');
                    localStorage.removeItem('backtest_total_count');
                } else if (data?.success && data?.response) {
                    setTaskStatus(data.response);

                    // 완료되었으면 결과 자동 조회
                    if (data.response.status === 'completed') {
                        await fetchTaskResult(savedTaskId);
                        localStorage.removeItem('backtest_running_task_id');
                        localStorage.removeItem('backtest_total_count');
                    } else if (data.response.status === 'failed') {
                        // 실패한 경우도 localStorage 정리
                        localStorage.removeItem('backtest_running_task_id');
                        localStorage.removeItem('backtest_total_count');
                    }
                }
            }
        } catch (e) {
            console.error('백테스트 복원 실패:', e);
            localStorage.removeItem('backtest_running_task_id');
            localStorage.removeItem('backtest_total_count');
        }
    };

    // 이력 탭 활성화 시 이력 조회
    useEffect(() => {
        if (activeTab === 'history') {
            fetchHistory();
        }
    }, [activeTab]);

    // 실행 중인 백테스트 자동 폴링
    useEffect(() => {
        if (!runningTaskId || activeTab !== 'run') return;

        // 현재 상태가 완료 또는 실패면 폴링 중지
        if (taskStatus?.status === 'completed' || taskStatus?.status === 'failed') {
            return;
        }

        // 5초마다 상태 체크
        const intervalId = setInterval(async () => {
            try {
                const { data, error } = await send(`/dart/api/backtest/status/${runningTaskId}`, {}, 'GET');

                if (!error && data?.success && data?.response) {
                    setTaskStatus(data.response);

                    // 완료되면 결과 자동 조회 및 폴링 중지
                    if (data.response.status === 'completed') {
                        await fetchTaskResult(runningTaskId);
                        localStorage.removeItem('backtest_running_task_id');
                        localStorage.removeItem('backtest_total_count');
                        clearInterval(intervalId);
                    } else if (data.response.status === 'failed') {
                        localStorage.removeItem('backtest_running_task_id');
                        localStorage.removeItem('backtest_total_count');
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
                if (isDeleteConfirmModalOpen) {
                    setIsDeleteConfirmModalOpen(false);
                }
                if (isDeleteSelectedModalOpen) {
                    setIsDeleteSelectedModalOpen(false);
                }
            }
        };
        if (isRunConfirmModalOpen || isDeleteConfirmModalOpen || isDeleteSelectedModalOpen) {
            window.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isRunConfirmModalOpen, isDeleteConfirmModalOpen, isDeleteSelectedModalOpen]);

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

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const { data, error } = await send('/dart/api/backtest/history', {}, 'GET');
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

    const handleOpenRunConfirmModal = async () => {
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

        // 설정값 조회
        setConfigLoading(true);
        try {
            const { data, error } = await send('/dart/api/cointrade/config', {}, 'GET');
            if (data?.success && data?.response) {
                const configList = data.response;
                const configMap = {};
                configList.forEach(c => {
                    const key = c.configKey || c.paramName;
                    const val = c.configValue || c.paramValue;
                    if (key && val) configMap[key] = val;
                });

                setBacktestConfig(prev => ({
                    ...prev,
                    initial_capital: parseFloat(configMap['INITIAL_CAPITAL']) || prev.initial_capital,
                    buy_amount_per_coin: parseFloat(configMap['BUY_AMOUNT_PER_COIN']) || prev.buy_amount_per_coin,
                    min_up_probability: parseFloat(configMap['MIN_UP_PROBABILITY']) || prev.min_up_probability,
                    buy_profit_threshold: parseFloat(configMap['BUY_PROFIT_THRESHOLD']) || prev.buy_profit_threshold,
                    take_profit_buffer: parseFloat(configMap['TAKE_PROFIT_BUFFER']) || prev.take_profit_buffer,
                    stop_loss_threshold: parseFloat(configMap['STOP_LOSS_THRESHOLD']) || prev.stop_loss_threshold,
                    min_profit_rate: parseFloat(configMap['MIN_PROFIT_RATE']) || prev.min_profit_rate,
                    max_profit_rate: parseFloat(configMap['MAX_PROFIT_RATE']) || prev.max_profit_rate,
                    prediction_days: parseInt(configMap['PREDICTION_DAYS']) || prev.prediction_days,
                    buy_fee_rate: parseFloat(configMap['TRADING_FEE_RATE']) * 100 || prev.buy_fee_rate,
                    sell_fee_rate: parseFloat(configMap['TRADING_FEE_RATE']) * 100 || prev.sell_fee_rate,
                }));
            }
        } catch (e) {
            console.error('설정값 조회 실패:', e);
        } finally {
            setConfigLoading(false);
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
        // 'all' 모드면 빈 배열로 전송

        // 전체 종목 수 계산
        let totalCount = 0;
        if (coinSelectionMode === 'all') {
            totalCount = allCoins.length;
        } else {
            totalCount = selectedCoins.size;
        }

        setLoading(true);
        try {
            const payload = {
                coin_codes: coinCodes,
                start_date: startDate,
                end_date: endDate,
                config: {
                    initial_capital: backtestConfig.initial_capital,
                    buy_amount_per_coin: backtestConfig.buy_amount_per_coin,
                    min_up_probability: backtestConfig.min_up_probability / 100,
                    buy_profit_threshold: backtestConfig.buy_profit_threshold,
                    take_profit_buffer: backtestConfig.take_profit_buffer,
                    stop_loss_threshold: backtestConfig.stop_loss_threshold,
                    min_profit_rate: backtestConfig.min_profit_rate,
                    max_profit_rate: backtestConfig.max_profit_rate,
                    prediction_days: backtestConfig.prediction_days,
                    buy_fee_rate: backtestConfig.buy_fee_rate / 100,
                    sell_fee_rate: backtestConfig.sell_fee_rate / 100,
                    sequence_length: backtestConfig.sequence_length
                }
            };

            const { data, error } = await send('/dart/api/backtest/run', payload, 'POST');

            if (error) {
                setToast('백테스트 실행 실패: ' + error);
            } else if (data?.success && data?.response?.task_id) {
                const taskId = data.response.task_id;
                setRunningTaskId(taskId);
                setTaskResult(null);
                // localStorage에 실행 중인 백테스트 정보 및 전체 종목 수 저장
                localStorage.setItem('backtest_running_task_id', taskId);
                localStorage.setItem('backtest_total_count', totalCount.toString());

                // 백테스트 실행 응답에 상태 정보가 포함되어 있으면 설정, 없으면 즉시 조회
                if (data.response.status) {
                    setTaskStatus(data.response);
                } else {
                    // 즉시 상태 조회
                    const statusResponse = await send(`/dart/api/backtest/status/${taskId}`, {}, 'GET');
                    if (statusResponse.data?.success && statusResponse.data?.response) {
                        setTaskStatus(statusResponse.data.response);
                    }
                }

                setToast('백테스트가 시작되었습니다.');
            }
        } catch (e) {
            console.error('백테스트 실행 실패:', e);
            setToast('백테스트 실행 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckStatus = async () => {
        if (!runningTaskId) return;

        setLoading(true);
        try {
            const { data, error } = await send(`/dart/api/backtest/status/${runningTaskId}`, {}, 'GET');

            if (error) {
                setToast('상태 조회 실패: ' + error);
            } else if (data?.success && data?.response) {
                setTaskStatus(data.response);

                // 완료되면 결과 자동 조회 및 localStorage 정리
                if (data.response.status === 'completed') {
                    await fetchTaskResult(runningTaskId);
                    localStorage.removeItem('backtest_running_task_id');
                    localStorage.removeItem('backtest_total_count');
                } else if (data.response.status === 'failed') {
                    // 실패한 경우도 localStorage 정리
                    localStorage.removeItem('backtest_running_task_id');
                    localStorage.removeItem('backtest_total_count');
                }
            }
        } catch (e) {
            console.error('상태 조회 실패:', e);
            setToast('상태 조회 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 백테스트 취소
    const handleCancelBacktest = async () => {
        if (!runningTaskId) return;

        if (!confirm('실행 중인 백테스트를 취소하시겠습니까?')) return;

        setLoading(true);
        try {
            const { data, error } = await send(`/dart/api/backtest/cancel/${runningTaskId}`, {}, 'POST');

            if (error) {
                setToast('취소 실패: ' + error);
            } else if (data?.success) {
                setToast('백테스트가 취소되었습니다.');
                setTaskStatus(prev => prev ? { ...prev, status: 'cancelled' } : null);
                localStorage.removeItem('backtest_running_task_id');
                localStorage.removeItem('backtest_total_count');
            }
        } catch (e) {
            console.error('백테스트 취소 실패:', e);
            setToast('취소 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const fetchTaskResult = async (taskId, includeDetails = false) => {
        try {
            const params = includeDetails ? '?include_individual=true&include_trades=true' : '';
            const { data, error } = await send(`/dart/api/backtest/result/${taskId}${params}`, {}, 'GET');

            if (error) {
                setToast('결과 조회 실패: ' + error);
            } else if (data?.success && data?.response?.data) {
                if (includeDetails) {
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

    const handleDeleteResult = (taskId) => {
        setDeleteTargetTaskId(taskId);
        setIsDeleteConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        setIsDeleteConfirmModalOpen(false);
        const taskId = deleteTargetTaskId;
        setDeleteTargetTaskId(null);

        try {
            const { data, error } = await send(`/dart/api/backtest/result/${taskId}`, {}, 'DELETE');

            if (error) {
                setToast('삭제 실패: ' + error);
            } else if (data?.success) {
                setToast('삭제되었습니다.');
                fetchHistory();

                if (runningTaskId === taskId) {
                    setRunningTaskId(null);
                    setTaskStatus(null);
                    setTaskResult(null);
                }
            }
        } catch (e) {
            console.error('삭제 실패:', e);
            setToast('삭제 중 오류가 발생했습니다.');
        }
    };

    const handleHistorySelect = (taskId) => {
        if (selectedHistoryIds.includes(taskId)) {
            setSelectedHistoryIds(selectedHistoryIds.filter(id => id !== taskId));
            setCompareResults(compareResults.filter(r => r.taskId !== taskId));
        } else {
            setSelectedHistoryIds([...selectedHistoryIds, taskId]);
        }
    };

    const handleSelectAll = () => {
        const allIds = historyList.map(item => item.task_id);
        setSelectedHistoryIds(allIds);
    };

    const handleDeselectAll = () => {
        setSelectedHistoryIds([]);
        setCompareResults([]);
    };

    const handleDeleteSelected = () => {
        if (selectedHistoryIds.length === 0) {
            setToast('삭제할 항목을 선택해주세요.');
            return;
        }
        setIsDeleteSelectedModalOpen(true);
    };

    const handleConfirmDeleteSelected = async () => {
        setIsDeleteSelectedModalOpen(false);

        setLoading(true);
        try {
            let successCount = 0;
            let failCount = 0;

            for (const taskId of selectedHistoryIds) {
                try {
                    const { data, error } = await send(`/dart/api/backtest/result/${taskId}`, {}, 'DELETE');
                    if (error || !data?.success) {
                        failCount++;
                    } else {
                        successCount++;
                    }
                } catch (e) {
                    failCount++;
                }
            }

            if (successCount > 0) {
                setToast(`${successCount}개 항목이 삭제되었습니다.${failCount > 0 ? ` (${failCount}개 실패)` : ''}`);
                fetchHistory();
                setSelectedHistoryIds([]);
                setCompareResults([]);
            } else {
                setToast('삭제에 실패했습니다.');
            }
        } catch (e) {
            console.error('삭제 실패:', e);
            setToast('삭제 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleCompare = async () => {
        if (selectedHistoryIds.length !== 2) {
            setToast('비교하기는 정확히 2개만 선택해야 합니다.');
            return;
        }

        setLoading(true);
        try {
            const results = [];
            for (const taskId of selectedHistoryIds) {
                const { data, error } = await send(`/dart/api/backtest/result/${taskId}`, {}, 'GET');
                if (error) {
                    setToast('결과 조회 실패: ' + error);
                    return;
                } else if (data?.success && data?.response?.data) {
                    results.push({ taskId, data: data.response.data });
                }
            }
            setCompareResults(results);
        } catch (e) {
            console.error('비교 실패:', e);
            setToast('비교 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = async (taskId) => {
        setSelectedDetailTaskId(taskId);
        await fetchTaskResult(taskId, true);
    };

    const handleExportExcel = async (result, includeIndividual = false) => {
        try {
            const wb = new ExcelJS.Workbook();
            const portfolio = result.data.portfolio;

            // 요약 시트
            const summaryWs = wb.addWorksheet('요약');

            // 제목
            const titleRow = summaryWs.addRow(['백테스트 결과 요약']);
            titleRow.font = { size: 16, bold: true };
            titleRow.height = 25;
            summaryWs.mergeCells('A1:B1');

            summaryWs.addRow([]);

            // 헤더
            const headerRow = summaryWs.addRow(['항목', '값']);
            headerRow.height = 20;

            // 각 셀에 개별적으로 스타일 적용
            headerRow.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.getCell(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };
            headerRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

            headerRow.getCell(2).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.getCell(2).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };
            headerRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };

            // 데이터 행
            const dataRows = [
                ['종목 수', portfolio.coin_count],
                ['기간', `${portfolio.start_date} ~ ${portfolio.end_date}`],
                ['초기 자본 (KRW)', portfolio.initial_capital],
                ['최종 자본 (KRW)', portfolio.final_capital],
                ['총 수익률 (%)', portfolio.total_return.toFixed(2)],
                ['총 거래 횟수', portfolio.total_trades],
                ['승리 거래', portfolio.winning_trades],
                ['패배 거래', portfolio.losing_trades],
                ['승률 (%)', portfolio.win_rate.toFixed(2)],
                ['최대 낙폭 (%)', (portfolio.max_drawdown * 100).toFixed(2)],
                ['샤프 지수', portfolio.sharpe_ratio.toFixed(2)]
            ];

            dataRows.forEach((rowData, idx) => {
                const row = summaryWs.addRow(rowData);
                row.alignment = { vertical: 'middle' };
                row.getCell(1).font = { bold: true };
                row.getCell(2).alignment = { horizontal: 'right' };

                // 수익률 색상
                if (rowData[0] === '총 수익률 (%)') {
                    row.getCell(2).font = {
                        color: { argb: portfolio.total_return >= 0 ? 'FF00B050' : 'FFFF0000' },
                        bold: true
                    };
                }

                // 승률 색상
                if (rowData[0] === '승률 (%)') {
                    row.getCell(2).font = { bold: true };
                }
            });

            // 실행 시점 파라미터 추가
            if (result.data.params) {
                summaryWs.addRow([]);
                summaryWs.addRow([]);

                const paramsTitleRow = summaryWs.addRow(['실행 시점 파라미터']);
                paramsTitleRow.font = { size: 14, bold: true };
                paramsTitleRow.height = 25;
                summaryWs.mergeCells(`A${paramsTitleRow.number}:B${paramsTitleRow.number}`);

                summaryWs.addRow([]);

                const paramsHeaderRow = summaryWs.addRow(['파라미터', '값']);
                paramsHeaderRow.height = 20;

                // 각 셀에 개별적으로 스타일 적용
                paramsHeaderRow.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
                paramsHeaderRow.getCell(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF70AD47' }
                };
                paramsHeaderRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

                paramsHeaderRow.getCell(2).font = { bold: true, color: { argb: 'FFFFFFFF' } };
                paramsHeaderRow.getCell(2).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF70AD47' }
                };
                paramsHeaderRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };

                Object.entries(result.data.params).forEach(([key, value]) => {
                    const row = summaryWs.addRow([
                        `${getParamLabel(key)} (${key})`,
                        formatParamValue(key, value)
                    ]);
                    row.getCell(1).font = { bold: true };
                    row.getCell(2).alignment = { horizontal: 'right' };
                });
            }

            // 열 너비 조정
            summaryWs.getColumn(1).width = 35;
            summaryWs.getColumn(2).width = 30;

            // 테두리 추가
            summaryWs.eachRow((row, rowNumber) => {
                if (rowNumber >= 3) {
                    row.eachCell(cell => {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    });
                }
            });

            // 개별 종목 상세 (includeIndividual이 true일 때)
            if (includeIndividual && result.data.individual) {
                Object.entries(result.data.individual).filter(([coin, data]) => data !== null).forEach(([coin, data]) => {
                    // 시트 이름에서 특수문자 제거
                    const sheetName = coin.replace(/[:\\/?*\[\]]/g, '_').substring(0, 31);
                    const coinWs = wb.addWorksheet(sheetName);

                    // 종목 정보
                    const coinTitleRow = coinWs.addRow([`${coin} 거래 내역`]);
                    coinTitleRow.font = { size: 14, bold: true };
                    coinTitleRow.height = 25;
                    coinWs.mergeCells('A1:L1');

                    coinWs.addRow([]);

                    // 종목 요약 정보
                    const coinSummaryRow = coinWs.addRow(['종목 요약']);
                    coinSummaryRow.font = { bold: true };
                    coinWs.mergeCells('A3:B3');

                    // 총 수익/손실 계산
                    const totalProfit = data.trades && data.trades.length > 0
                        ? data.trades.reduce((sum, trade) => sum + trade.profit_loss, 0)
                        : (() => {
                            const winningTrades = Math.round(data.total_trades * (data.win_rate / 100));
                            const losingTrades = data.total_trades - winningTrades;
                            return (data.avg_profit * winningTrades) + (data.avg_loss * losingTrades);
                        })();

                    const summaryData = [
                        ['총 수익률 (%)', data.total_return.toFixed(2)],
                        ['총 수익/손실 (KRW)', totalProfit.toFixed(2)],
                        ['총 거래 횟수', data.total_trades],
                        ['승률 (%)', data.win_rate.toFixed(2)],
                        ['평균 보유일', data.avg_holding_days.toFixed(1)],
                        ['평균 수익 (KRW)', data.avg_profit.toFixed(2)],
                        ['평균 손실 (KRW)', data.avg_loss.toFixed(2)],
                        ['Profit Factor', data.profit_factor.toFixed(2)]
                    ];

                    summaryData.forEach(rowData => {
                        const row = coinWs.addRow(rowData);
                        row.getCell(1).font = { bold: true };
                        row.getCell(2).alignment = { horizontal: 'right' };

                        // 총 수익률 색상
                        if (rowData[0] === '총 수익률 (%)') {
                            row.getCell(2).font = {
                                color: { argb: data.total_return >= 0 ? 'FF00B050' : 'FFFF0000' },
                                bold: true
                            };
                        }

                        // 총 수익/손실 색상
                        if (rowData[0] === '총 수익/손실 (KRW)') {
                            row.getCell(2).font = {
                                color: { argb: totalProfit >= 0 ? 'FF00B050' : 'FFFF0000' },
                                bold: true
                            };
                        }
                    });

                    coinWs.addRow([]);
                    coinWs.addRow([]);

                    // 거래 내역 헤더
                    const tradeHeaderRow = coinWs.addRow([
                        '진입일', '청산일', '진입가', '청산가', '수량',
                        '손익', '수익률(%)', '예측 고가', '예측 저가',
                        '상승 확률(%)', '기대 수익률(%)', '사유'
                    ]);
                    tradeHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    tradeHeaderRow.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF4472C4' }
                    };
                    tradeHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
                    tradeHeaderRow.height = 20;

                    // 거래 내역 데이터
                    if (data.trades && data.trades.length > 0) {
                        data.trades.forEach(trade => {
                            const row = coinWs.addRow([
                                trade.entry_date,
                                trade.exit_date,
                                trade.entry_price,
                                trade.exit_price,
                                trade.quantity,
                                trade.profit_loss,
                                trade.profit_loss_rate.toFixed(2),
                                trade.predicted_high,
                                trade.predicted_low,
                                (trade.up_probability * 100).toFixed(2),
                                trade.expected_return.toFixed(2),
                                trade.reason
                            ]);

                            // 숫자 컬럼 오른쪽 정렬
                            [3, 4, 5, 6, 7, 8, 9, 10, 11].forEach(colIdx => {
                                row.getCell(colIdx).alignment = { horizontal: 'right' };
                            });

                            // 손익 색상
                            row.getCell(6).font = {
                                color: { argb: trade.profit_loss >= 0 ? 'FF00B050' : 'FFFF0000' }
                            };
                            row.getCell(7).font = {
                                color: { argb: trade.profit_loss_rate >= 0 ? 'FF00B050' : 'FFFF0000' },
                                bold: true
                            };
                        });
                    }

                    // 열 너비 조정
                    coinWs.getColumn(1).width = 12; // 진입일
                    coinWs.getColumn(2).width = 12; // 청산일
                    coinWs.getColumn(3).width = 15; // 진입가
                    coinWs.getColumn(4).width = 15; // 청산가
                    coinWs.getColumn(5).width = 15; // 수량
                    coinWs.getColumn(6).width = 12; // 손익
                    coinWs.getColumn(7).width = 12; // 수익률
                    coinWs.getColumn(8).width = 15; // 예측 고가
                    coinWs.getColumn(9).width = 15; // 예측 저가
                    coinWs.getColumn(10).width = 12; // 상승 확률
                    coinWs.getColumn(11).width = 14; // 기대 수익률
                    coinWs.getColumn(12).width = 15; // 사유

                    // 테두리 추가
                    const startRow = 13; // 거래 내역 시작 행
                    coinWs.eachRow((row, rowNumber) => {
                        if (rowNumber >= startRow) {
                            row.eachCell(cell => {
                                cell.border = {
                                    top: { style: 'thin' },
                                    left: { style: 'thin' },
                                    bottom: { style: 'thin' },
                                    right: { style: 'thin' }
                                };
                            });
                        }
                    });
                });
            }

            const buf = await wb.xlsx.writeBuffer();
            const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // 파일명 생성: backtest_[종목수]_[시작기간]_[종료기간]_[백테스트실행시간]
            const formatDate = (dateStr) => dateStr.replace(/-/g, '');
            const now = new Date();
            const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            const startDate = formatDate(portfolio.start_date);
            const endDate = formatDate(portfolio.end_date);
            const coinCount = portfolio.coin_count;
            const detailSuffix = includeIndividual ? '_detailed' : '';

            a.download = `backtest_${coinCount}coins_${startDate}_${endDate}_${timestamp}${detailSuffix}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('엑셀 내보내기 실패:', e);
            setToast('엑셀 내보내기 중 오류가 발생했습니다.');
        }
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

    const filteredCoins = getFilteredCoins();

    return (
        <div className="p-2 md:p-4">
            <PageTitle>백테스트</PageTitle>

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
                        백테스트 실행
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 px-6 py-3 font-medium transition-colors ${activeTab === 'history'
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                    >
                        이력 조회
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

                    {/* 날짜 선택 */}
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
                                        setSelectedPreset(null);
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
                                        setSelectedPreset(null);
                                    }}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 백테스트 안내 */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <div className="text-blue-600 dark:text-blue-400 text-lg mt-0.5">
                                💡
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
                                    백테스트는 <span className="font-semibold">초기 자본 100만원</span>을 기준으로 진행됩니다.
                                    <br />
                                    각 종목당 <span className="font-semibold">BUY_AMOUNT_PER_COIN</span> 값만큼 투자하여 수익률이 계산됩니다.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 실행 버튼 */}
                    <div className="flex justify-end gap-3">
                        <Button
                            onClick={handleOpenRunConfirmModal}
                            disabled={loading}
                            className="px-6 py-2"
                        >
                            {loading ? '실행 중...' : '백테스트 실행'}
                        </Button>
                    </div>

                    {/* 실행 상태 및 결과 */}
                    {runningTaskId && (
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                                    실행 상태
                                </h2>
                                <div className="flex gap-2">
                                    <Button onClick={handleCheckStatus} className="px-4 py-2 text-sm">
                                        상태 확인
                                    </Button>
                                    {taskStatus?.status === 'running' && (
                                        <Button
                                            onClick={handleCancelBacktest}
                                            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white"
                                            disabled={loading}
                                        >
                                            중지
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {taskStatus && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-sm text-slate-600 dark:text-slate-400">Task ID:</span>
                                            <div className="text-sm font-mono text-slate-900 dark:text-slate-100">
                                                <TogglableTaskId taskId={taskStatus.task_id} maxLength={20} />
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-sm text-slate-600 dark:text-slate-400">상태:</span>
                                            <div className={`text-sm font-semibold ${taskStatus.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                                                taskStatus.status === 'running' ? 'text-blue-600 dark:text-blue-400' :
                                                    taskStatus.status === 'failed' ? 'text-red-600 dark:text-red-400' :
                                                        'text-slate-600 dark:text-slate-400'
                                                }`}>
                                                {taskStatus.status === 'running' ? '실행 중' :
                                                    taskStatus.status === 'completed' ? '완료' :
                                                        taskStatus.status === 'failed' ? '실패' : taskStatus.status}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-sm text-slate-600 dark:text-slate-400">생성 시간:</span>
                                            <div className="text-sm text-slate-900 dark:text-slate-100">{taskStatus.created_at}</div>
                                        </div>
                                        {taskStatus.completed_at && (
                                            <div>
                                                <span className="text-sm text-slate-600 dark:text-slate-400">완료 시간:</span>
                                                <div className="text-sm text-slate-900 dark:text-slate-100">{taskStatus.completed_at}</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 진행률 바 (실행 중일 때만 표시) */}
                                    {taskStatus.status === 'running' && (
                                        <BacktestProgressBar
                                            currentStep={taskStatus.current_step}
                                            totalSteps={taskStatus.total_steps}
                                            progress={taskStatus.progress}
                                            status={taskStatus.status}
                                        />
                                    )}

                                    {/* 완료 시 진행률 텍스트 */}
                                    {taskStatus.status === 'completed' && taskStatus.progress && (
                                        <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                                            {formatProgress(taskStatus.progress)}
                                        </div>
                                    )}

                                    {taskStatus.error_message && (
                                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                                            <span className="text-sm text-red-700 dark:text-red-300">{taskStatus.error_message}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {taskResult && (
                                <ResultSummary result={taskResult} onExport={() => handleExportExcel({ taskId: runningTaskId, data: taskResult }, false)} />
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* 이력 탭 */}
            {activeTab === 'history' && (
                <div className="space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-slate-600 dark:text-slate-400">로딩 중...</div>
                        </div>
                    ) : (
                        <>
                            {/* 비교 기능 */}
                            {selectedHistoryIds.length > 0 && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-blue-700 dark:text-blue-300">
                                            {selectedHistoryIds.length}개 항목 선택됨
                                        </div>
                                        <div className="flex gap-2">
                                            <Button onClick={() => { setSelectedHistoryIds([]); setCompareResults([]); }} className="px-4 py-2 text-sm">
                                                선택 취소
                                            </Button>
                                            <Button
                                                onClick={handleDeleteSelected}
                                                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white"
                                            >
                                                선택 삭제
                                            </Button>
                                            {selectedHistoryIds.length === 2 && (
                                                <Button onClick={handleCompare} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700">
                                                    비교하기
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 비교 결과 */}
                            {compareResults.length === 2 && (
                                <ComparisonView results={compareResults} />
                            )}

                            {/* 이력 목록 */}
                            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                                        백테스트 이력 ({historyList.length})
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleSelectAll}
                                            disabled={historyList.length === 0}
                                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            전체선택
                                        </button>
                                        <button
                                            onClick={handleDeselectAll}
                                            disabled={selectedHistoryIds.length === 0}
                                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            전체해제
                                        </button>
                                    </div>
                                </div>

                                {historyList.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                                        이력이 없습니다.
                                    </div>
                                ) : (
                                    <>
                                        {/* 데스크톱 테이블 뷰 */}
                                        <div className="hidden md:block overflow-x-auto">
                                            <table className="w-full text-sm min-w-max">
                                                <thead className="bg-slate-50 dark:bg-slate-700">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left w-12">
                                                            <input
                                                                type="checkbox"
                                                                className="w-4 h-4 cursor-pointer"
                                                                checked={historyList.length > 0 && selectedHistoryIds.length === historyList.length}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        handleSelectAll();
                                                                    } else {
                                                                        handleDeselectAll();
                                                                    }
                                                                }}
                                                                disabled={historyList.length === 0}
                                                                title="전체 선택/해제"
                                                            />
                                                        </th>
                                                        <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200 min-w-[200px]">Task ID</th>
                                                        <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-200 w-20">종목 수</th>
                                                        <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-200 min-w-[240px]">기간</th>
                                                        <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200 w-24">총 수익률</th>
                                                        <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200 w-24">매수금 수익률</th>
                                                        <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200 w-20">승률</th>
                                                        <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200 w-24">거래 횟수</th>
                                                        <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200 w-20">MDD</th>
                                                        <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200 w-24">샤프 지수</th>
                                                        <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-200 w-32">작업</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                    {historyList.map((item) => (
                                                        <tr
                                                            key={item.task_id}
                                                            className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                                                            onDoubleClick={() => handleViewDetail(item.task_id)}
                                                        >
                                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedHistoryIds.includes(item.task_id)}
                                                                    onChange={() => handleHistorySelect(item.task_id)}
                                                                    className="w-4 h-4"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                                                                <TogglableTaskId taskId={item.task_id} maxLength={20} />
                                                            </td>
                                                            <td className="px-4 py-3 text-center text-slate-900 dark:text-slate-100">{item.coin_count}</td>
                                                            <td className="px-4 py-3 text-center text-slate-900 dark:text-slate-100 text-xs whitespace-nowrap">{item.start_date} ~ {item.end_date}</td>
                                                            <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${item.total_return >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                {item.total_return.toFixed(2)}%
                                                            </td>
                                                            <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${item.invested_return != null ? (item.invested_return >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') : 'text-slate-400 dark:text-slate-500'}`}>
                                                                {item.invested_return != null ? `${item.invested_return.toFixed(2)}%` : '-'}
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100 whitespace-nowrap">{item.win_rate.toFixed(2)}%</td>
                                                            <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100">{item.total_trades}</td>
                                                            <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 whitespace-nowrap">{(item.max_drawdown * 100).toFixed(2)}%</td>
                                                            <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100">{item.sharpe_ratio.toFixed(2)}</td>
                                                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                                <button
                                                                    onClick={() => handleDeleteResult(item.task_id)}
                                                                    className="text-red-600 dark:text-red-200 hover:text-red-700 dark:hover:text-white bg-red-50 dark:bg-red-900/40 hover:bg-red-100 dark:hover:bg-red-900/60 px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap"
                                                                >
                                                                    삭제
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* 모바일 카드 뷰 */}
                                        <div className="md:hidden p-4 space-y-4">
                                            {historyList.map((item) => (
                                                <div
                                                    key={item.task_id}
                                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm space-y-3 cursor-pointer"
                                                    onDoubleClick={() => handleViewDetail(item.task_id)}
                                                >
                                                    {/* 체크박스와 Task ID */}
                                                    <div className="flex items-start gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                                                        <div onClick={(e) => e.stopPropagation()}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedHistoryIds.includes(item.task_id)}
                                                                onChange={() => handleHistorySelect(item.task_id)}
                                                                className="w-4 h-4 mt-1"
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                                                Task ID
                                                            </div>
                                                            <div className="font-mono text-xs text-slate-600 dark:text-slate-400">
                                                                <TogglableTaskId taskId={item.task_id} maxLength={25} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* 주요 지표 - 2열 그리드 */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                                                총 수익률
                                                            </div>
                                                            <div className={`text-lg font-bold ${item.total_return >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                {item.total_return.toFixed(2)}%
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                                                매수금 수익률
                                                            </div>
                                                            <div className={`text-lg font-bold ${item.invested_return != null ? (item.invested_return >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') : 'text-slate-400 dark:text-slate-500'}`}>
                                                                {item.invested_return != null ? `${item.invested_return.toFixed(2)}%` : '-'}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                                                승률
                                                            </div>
                                                            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                                                {item.win_rate.toFixed(2)}%
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                                                거래 횟수
                                                            </div>
                                                            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                                                {item.total_trades}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                                                종목 수
                                                            </div>
                                                            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                                                {item.coin_count}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* 기타 정보 */}
                                                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-slate-600 dark:text-slate-400">기간</span>
                                                            <span className="text-slate-900 dark:text-slate-100 font-medium text-xs">
                                                                {item.start_date} ~ {item.end_date}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-slate-600 dark:text-slate-400">MDD</span>
                                                            <span className="text-red-600 dark:text-red-400 font-medium">
                                                                {(item.max_drawdown * 100).toFixed(2)}%
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-slate-600 dark:text-slate-400">샤프 지수</span>
                                                            <span className="text-slate-900 dark:text-slate-100 font-medium">
                                                                {item.sharpe_ratio.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* 액션 버튼 */}
                                                    <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => handleDeleteResult(item.task_id)}
                                                            className="flex-1 px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 bg-white dark:bg-red-900/30 text-red-600 dark:text-red-200 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors"
                                                        >
                                                            삭제
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* 상세 보기 */}
                            {detailResult && selectedDetailTaskId && (
                                <DetailView
                                    result={detailResult}
                                    onClose={() => { setDetailResult(null); setSelectedDetailTaskId(null); }}
                                    onExport={(includeIndividual) => handleExportExcel(detailResult, includeIndividual)}
                                />
                            )}
                        </>
                    )}
                </div>
            )}

            {/* 백테스트 실행 확인 모달 */}
            {isRunConfirmModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 animate-fade-in overflow-y-auto"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsRunConfirmModalOpen(false);
                    }}
                >
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl my-4">
                        {/* 헤더 */}
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                백테스트 실행 설정
                            </h3>
                        </div>

                        {/* 콘텐츠 */}
                        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                            {configLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <span className="ml-3 text-slate-600 dark:text-slate-400">설정값 로딩 중...</span>
                                </div>
                            ) : (
                                <>
                                    {/* 기본 정보 */}
                                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-3">
                                        <div className="flex flex-wrap gap-4">
                                            <div className="flex-1 min-w-[150px]">
                                                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">종목 선택</div>
                                                <div className="text-sm text-slate-900 dark:text-slate-100">
                                                    {coinSelectionMode === 'all' && '전체 종목'}
                                                    {coinSelectionMode === 'active' && `활성화된 종목 (${selectedCoins.size}개)`}
                                                    {coinSelectionMode === 'custom' && `직접 선택 (${selectedCoins.size}개)`}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-[150px]">
                                                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">백테스트 기간</div>
                                                <div className="text-sm text-slate-900 dark:text-slate-100">{startDate} ~ {endDate}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                                    {(() => {
                                                        const diffDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
                                                        return `총 ${diffDays}일`;
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 파라미터 설정 */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">
                                            자본 설정
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    초기 자본금 (원) <code className="text-blue-500">initial_capital</code>
                                                </label>
                                                <input
                                                    type="number"
                                                    value={backtestConfig.initial_capital}
                                                    onChange={(e) => setBacktestConfig(prev => ({ ...prev, initial_capital: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                                                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    1회 매수 금액 (원) <code className="text-blue-500">buy_amount_per_coin</code>
                                                </label>
                                                <input
                                                    type="number"
                                                    value={backtestConfig.buy_amount_per_coin}
                                                    onChange={(e) => setBacktestConfig(prev => ({ ...prev, buy_amount_per_coin: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                                                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>

                                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2 mt-4">
                                            매수 조건
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    최소 상승 확률 (%) <code className="text-blue-500">min_up_probability</code>
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={backtestConfig.min_up_probability}
                                                    onChange={(e) => setBacktestConfig(prev => ({ ...prev, min_up_probability: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                                                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    기대 수익률 하한 (%) <code className="text-blue-500">buy_profit_threshold</code>
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={backtestConfig.buy_profit_threshold}
                                                    onChange={(e) => setBacktestConfig(prev => ({ ...prev, buy_profit_threshold: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                                                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>

                                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2 mt-4">
                                            매도 조건
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    익절 버퍼 (%) <code className="text-blue-500">take_profit_buffer</code>
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={backtestConfig.take_profit_buffer}
                                                    onChange={(e) => setBacktestConfig(prev => ({ ...prev, take_profit_buffer: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                                                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    손절 임계값 (%) <code className="text-blue-500">stop_loss_threshold</code>
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={backtestConfig.stop_loss_threshold}
                                                    onChange={(e) => setBacktestConfig(prev => ({ ...prev, stop_loss_threshold: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                                                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    최소 익절률 (%) <code className="text-blue-500">min_profit_rate</code>
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={backtestConfig.min_profit_rate}
                                                    onChange={(e) => setBacktestConfig(prev => ({ ...prev, min_profit_rate: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                                                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    최대 익절률 (%) <code className="text-blue-500">max_profit_rate</code>
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={backtestConfig.max_profit_rate}
                                                    onChange={(e) => setBacktestConfig(prev => ({ ...prev, max_profit_rate: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                                                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>

                                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2 mt-4">
                                            기타 설정
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    예측 기간 (일) <code className="text-blue-500">prediction_days</code>
                                                </label>
                                                <input
                                                    type="number"
                                                    value={backtestConfig.prediction_days}
                                                    onChange={(e) => setBacktestConfig(prev => ({ ...prev, prediction_days: e.target.value === '' ? '' : parseInt(e.target.value) }))}
                                                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    매수 수수료 (%) <code className="text-blue-500">buy_fee_rate</code>
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    value={backtestConfig.buy_fee_rate}
                                                    onChange={(e) => setBacktestConfig(prev => ({ ...prev, buy_fee_rate: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                                                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    매도 수수료 (%) <code className="text-blue-500">sell_fee_rate</code>
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    value={backtestConfig.sell_fee_rate}
                                                    onChange={(e) => setBacktestConfig(prev => ({ ...prev, sell_fee_rate: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                                                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    시퀀스 길이 <code className="text-blue-500">sequence_length</code>
                                                </label>
                                                <input
                                                    type="number"
                                                    value={backtestConfig.sequence_length}
                                                    onChange={(e) => setBacktestConfig(prev => ({ ...prev, sequence_length: e.target.value === '' ? '' : parseInt(e.target.value) }))}
                                                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-xs text-slate-500 dark:text-slate-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-3">
                                        ⚠️ 백테스트는 시간이 소요될 수 있습니다. 실행 후 상태 확인 버튼으로 진행 상황을 확인하세요.
                                    </div>
                                </>
                            )}
                        </div>

                        {/* 버튼 */}
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => setIsRunConfirmModalOpen(false)}
                                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleConfirmRun}
                                disabled={configLoading}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                실행
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 삭제 확인 모달 */}
            {isDeleteConfirmModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 animate-fade-in"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsDeleteConfirmModalOpen(false);
                    }}
                >
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
                        {/* 헤더 */}
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                백테스트 결과 삭제
                            </h3>
                        </div>

                        {/* 콘텐츠 */}
                        <div className="px-6 py-4 space-y-4">
                            <p className="text-slate-700 dark:text-slate-300">
                                이 백테스트 결과를 삭제하시겠습니까?
                            </p>

                            {deleteTargetTaskId && (
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                        Task ID
                                    </div>
                                    <div className="text-sm font-mono text-slate-900 dark:text-slate-100">
                                        <TogglableTaskId taskId={deleteTargetTaskId} maxLength={30} />
                                    </div>
                                </div>
                            )}

                            <div className="text-xs text-slate-500 dark:text-slate-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                                ⚠️ 삭제된 데이터는 복구할 수 없습니다.
                            </div>
                        </div>

                        {/* 버튼 */}
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 flex items-center justify-end gap-2">
                            <button
                                onClick={() => {
                                    setIsDeleteConfirmModalOpen(false);
                                    setDeleteTargetTaskId(null);
                                }}
                                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
                            >
                                삭제
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 선택 삭제 확인 모달 */}
            {isDeleteSelectedModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 animate-fade-in"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsDeleteSelectedModalOpen(false);
                    }}
                >
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
                        {/* 헤더 */}
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                선택 항목 삭제
                            </h3>
                        </div>

                        {/* 콘텐츠 */}
                        <div className="px-6 py-4 space-y-4">
                            <p className="text-slate-700 dark:text-slate-300">
                                선택한 {selectedHistoryIds.length}개의 항목을 삭제하시겠습니까?
                            </p>

                            <div className="text-xs text-slate-500 dark:text-slate-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                                ⚠️ 삭제된 데이터는 복구할 수 없습니다.
                            </div>
                        </div>

                        {/* 버튼 */}
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 flex items-center justify-end gap-2">
                            <button
                                onClick={() => setIsDeleteSelectedModalOpen(false)}
                                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleConfirmDeleteSelected}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
                            >
                                삭제
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-4 right-4 z-50 animate-fade-in bg-slate-800 text-white px-6 py-3 rounded shadow-lg">
                    {toast}
                </div>
            )}
        </div>
    );
}

// 결과 요약 컴포넌트
function ResultSummary({ result, onExport }) {
    const portfolio = result.portfolio;
    const totalInvested = Object.values(result.individual || {})
        .reduce((sum, coin) => sum + (coin.initial_capital || 0), 0);
    const profitLoss = portfolio.final_capital - portfolio.initial_capital;
    const investedReturn = totalInvested > 0 ? (profitLoss / totalInvested * 100) : null;

    return (
        <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">결과 요약</h3>
                <Button onClick={onExport} className="px-4 py-2 text-sm">
                    요약 엑셀 내보내기
                </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">총 수익률</div>
                    <div className={`text-2xl font-bold ${portfolio.total_return >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {portfolio.total_return.toFixed(2)}%
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">매수금 수익률</div>
                    <div className={`text-2xl font-bold ${investedReturn != null ? (investedReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') : 'text-slate-400 dark:text-slate-500'}`}>
                        {investedReturn != null ? `${investedReturn.toFixed(2)}%` : '-'}
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">승률</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {portfolio.win_rate.toFixed(2)}%
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">거래 횟수</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {portfolio.total_trades}
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">샤프 지수</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {portfolio.sharpe_ratio.toFixed(2)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">자본 변화</div>
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-400">초기 자본</span>
                            <span className="text-sm text-slate-900 dark:text-slate-100">
                                <NumberWithBoldInteger value={portfolio.initial_capital} decimals={2} suffix=" KRW" />
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-400">최종 자본</span>
                            <span className="text-sm text-slate-900 dark:text-slate-100">
                                <NumberWithBoldInteger value={portfolio.final_capital} decimals={2} suffix=" KRW" />
                            </span>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">거래 통계</div>
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-400">승리 거래</span>
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                {portfolio.winning_trades}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-400">패배 거래</span>
                            <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                {portfolio.losing_trades}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-400">최대 낙폭 (MDD)</span>
                            <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                {(portfolio.max_drawdown * 100).toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// 비교 뷰 컴포넌트
function ComparisonView({ results }) {
    const [result1, result2] = results;

    const comparisonData = [
        { name: '총 수익률', value1: result1.data.portfolio.total_return, value2: result2.data.portfolio.total_return, unit: '%' },
        { name: '승률', value1: result1.data.portfolio.win_rate, value2: result2.data.portfolio.win_rate, unit: '%' },
        { name: '거래 횟수', value1: result1.data.portfolio.total_trades, value2: result2.data.portfolio.total_trades, unit: '' },
        { name: 'MDD', value1: result1.data.portfolio.max_drawdown * 100, value2: result2.data.portfolio.max_drawdown * 100, unit: '%' },
        { name: '샤프 지수', value1: result1.data.portfolio.sharpe_ratio, value2: result2.data.portfolio.sharpe_ratio, unit: '' },
    ];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-6">결과 비교</h2>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">지표</th>
                            <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">
                                Test 1<br />
                                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                                    <TogglableTaskId taskId={result1.taskId} maxLength={20} />
                                </span>
                            </th>
                            <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">
                                Test 2<br />
                                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                                    <TogglableTaskId taskId={result2.taskId} maxLength={20} />
                                </span>
                            </th>
                            <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">차이</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {comparisonData.map((item) => {
                            const diff = item.value1 - item.value2;
                            const better = diff > 0 ? 1 : diff < 0 ? 2 : 0;

                            return (
                                <tr key={item.name}>
                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{item.name}</td>
                                    <td className={`px-4 py-3 text-center ${better === 1 ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>
                                        {item.value1.toFixed(2)}{item.unit}
                                    </td>
                                    <td className={`px-4 py-3 text-center ${better === 2 ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>
                                        {item.value2.toFixed(2)}{item.unit}
                                    </td>
                                    <td className={`px-4 py-3 text-center font-medium ${diff > 0 ? 'text-green-600 dark:text-green-400' : diff < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {diff > 0 ? '+' : ''}{diff.toFixed(2)}{item.unit}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// 파라미터 한글 라벨 매핑 (대소문자 구분 없음)
function getParamLabel(key) {
    const labels = {
        INITIAL_CAPITAL: '초기 자본 (원)',  // 백테스트에만 사용하는 파라미터
        SEQUENCE_LENGTH: '시퀀스 길이', // 백테스트에만 사용하는 파라미터

        BUY_PROFIT_THRESHOLD: '매수 조건 (기대 수익률 %)',
        TAKE_PROFIT_BUFFER: '익절 버퍼 (%)',
        STOP_LOSS_THRESHOLD: '손절선 (%)',
        BUY_AMOUNT_PER_COIN: '종목당 매수금액 (원)',
        BUY_WAIT_SECONDS: '매수 체결 대기 (초)',
        BUY_RETRY_COUNT: '매수 재시도 (회)',
        SELL_CHECK_SECONDS: '매도 체결 확인 (초)',
        PRICE_MONITOR_SECONDS: '가격 모니터링 주기 (초)',
        BUY_CHECK_HOURS: '매수 체크 주기 (시간)',
        MIN_UP_PROBABILITY: '최소 상승 확률 (%)',
        MIN_PROFIT_RATE: '최소 익절률 (%)',
        MAX_PROFIT_RATE: '최대 익절률 (%)',
        TARGET_MODE: '대상 모드 (ALL/SELECTED)',
        PREDICTION_DAYS: '예측 기간 (일)',
        TRAIN_SCHEDULE_ENABLED: '재학습 스케줄러 활성화 여부',
        TRAIN_SCHEDULE_CRON: '모델 재학습 스케줄 (Cron)',
        ENSEMBLE_MODE: '앙상블 모드',
        BUY_SCHEDULER_ENABLED: '매수 스케줄러 활성화 여부',
        SELL_SCHEDULER_ENABLED: '매도 스케줄러 활성화 여부',
        BUY_FEE_RATE: '매수 수수료율(0.05%면 0.0005)',
        SELL_FEE_RATE: '매도 수수료율(0.05%면 0.0005)',
    };

    // 대소문자 구분 없이 매칭
    const upperKey = key.toUpperCase();
    const matchedKey = Object.keys(labels).find(k => k.toUpperCase() === upperKey);
    return matchedKey ? labels[matchedKey] : key;
}

// 파라미터 값 포맷팅 (퍼센트 값 변환)
function formatParamValue(key, value) {
    // MIN_UP_PROBABILITY만 백엔드에서 0~1 비율로 저장됨
    const percentParams = [
        'MIN_UP_PROBABILITY'
    ];

    const upperKey = key.toUpperCase();

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    // 퍼센트 파라미터인 경우 100을 곱해서 표시
    if (percentParams.some(param => upperKey === param)) {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            return (numValue * 100).toFixed(2);
        }
    }

    return String(value);
}

// 커스텀 툴팁 컴포넌트 (정수 부분만 볼드체 + % 표시)
function CustomProfitTooltip({ active, payload, label }) {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-3 shadow-lg">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    날짜: {label}
                </p>
                {data.profit !== undefined && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        수익/손실: {data.profit >= 0 ? '+' : ''}<NumberWithBoldInteger value={Math.abs(data.profit)} decimals={0} suffix=" KRW" />
                        {data.dailyReturnPct !== undefined && (
                            <span className={`ml-2 ${data.dailyReturnPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                (<span className="font-bold">{data.dailyReturnPct >= 0 ? '+' : ''}{data.dailyReturnPct.toFixed(2)}%</span>)
                            </span>
                        )}
                    </p>
                )}
                {data.cumulativeProfit !== undefined && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        누적: {data.cumulativeProfit >= 0 ? '+' : ''}<NumberWithBoldInteger value={Math.abs(data.cumulativeProfit)} decimals={0} suffix=" KRW" />
                        {data.cumulativeReturnPct !== undefined && (
                            <span className={`ml-2 ${data.cumulativeReturnPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                (<span className="font-bold">{data.cumulativeReturnPct >= 0 ? '+' : ''}{data.cumulativeReturnPct.toFixed(2)}%</span>)
                            </span>
                        )}
                    </p>
                )}
            </div>
        );
    }
    return null;
}

// 상세 뷰 컴포넌트
function DetailView({ result, onClose, onExport }) {
    const [showProfitRanking, setShowProfitRanking] = useState(false);
    const [showTradeCountRanking, setShowTradeCountRanking] = useState(false);
    const [showParams, setShowParams] = useState(false);
    const [showDailyProfitRanking, setShowDailyProfitRanking] = useState(false);
    const [showCumulativeProfitRanking, setShowCumulativeProfitRanking] = useState(false);

    const portfolio = result.data.portfolio;
    const individual = result.data.individual || {};

    // 월별 데이터 계산 (실제로는 trades 데이터를 기반으로 계산해야 함 - 여기서는 샘플)
    const monthlyData = useMemo(() => {
        // 실제 구현: trades를 월별로 그룹화하여 수익률 계산
        // 여기서는 샘플 데이터
        return [];
    }, [result]);

    // 승률/패율 차트 데이터
    const winLossData = [
        { name: '승리', value: portfolio.winning_trades, color: '#10b981' },
        { name: '패배', value: portfolio.losing_trades, color: '#ef4444' },
    ];

    // 종목별 수익 기여도 (individual 데이터 기반)
    const coinContributionData = Object.entries(individual)
        .filter(([coin, data]) => data !== null) // null인 종목 제외
        .map(([coin, data]) => ({
            name: coin,
            return: data.total_return,
            trades: data.total_trades
        }));

    // 기간별 거래 건수 데이터 (날짜별 매수/매도 건수)
    const dailyTradeData = useMemo(() => {
        const tradesByDate = {};

        // 모든 종목의 거래 내역을 순회
        Object.entries(individual).forEach(([coin, data]) => {
            if (data && data.trades && data.trades.length > 0) {
                data.trades.forEach(trade => {
                    // 매수 날짜
                    if (trade.entry_date) {
                        const date = trade.entry_date.split(' ')[0]; // 날짜만 추출
                        if (!tradesByDate[date]) {
                            tradesByDate[date] = { date, buy: 0, sell: 0 };
                        }
                        tradesByDate[date].buy += 1;
                    }
                    // 매도 날짜
                    if (trade.exit_date) {
                        const date = trade.exit_date.split(' ')[0]; // 날짜만 추출
                        if (!tradesByDate[date]) {
                            tradesByDate[date] = { date, buy: 0, sell: 0 };
                        }
                        tradesByDate[date].sell += 1;
                    }
                });
            }
        });

        // 날짜순으로 정렬
        return Object.values(tradesByDate).sort((a, b) => a.date.localeCompare(b.date));
    }, [individual]);

    // 일별 평균 거래건수 및 최댓값 계산
    const dailyTradeAverage = useMemo(() => {
        if (dailyTradeData.length === 0) {
            return { avgBuy: 0, avgSell: 0, totalDays: 0, maxBuy: 0, maxSell: 0 };
        }

        const totalBuy = dailyTradeData.reduce((sum, day) => sum + day.buy, 0);
        const totalSell = dailyTradeData.reduce((sum, day) => sum + day.sell, 0);
        const totalDays = dailyTradeData.length;
        const maxBuy = Math.max(...dailyTradeData.map(day => day.buy));
        const maxSell = Math.max(...dailyTradeData.map(day => day.sell));

        return {
            avgBuy: totalBuy / totalDays,
            avgSell: totalSell / totalDays,
            totalDays: totalDays,
            maxBuy: maxBuy,
            maxSell: maxSell
        };
    }, [dailyTradeData]);

    // 하루 최대 보유량 계산
    const maxDailyHoldings = useMemo(() => {
        const holdingsByDate = {};

        // 모든 종목의 거래 내역을 순회
        Object.entries(individual).forEach(([coin, data]) => {
            if (data && data.trades && data.trades.length > 0) {
                data.trades.forEach(trade => {
                    if (trade.entry_date && trade.exit_date) {
                        const entryDate = new Date(trade.entry_date.split(' ')[0]);
                        const exitDate = new Date(trade.exit_date.split(' ')[0]);

                        // entry_date부터 exit_date까지 모든 날짜에 보유량 +1
                        let currentDate = new Date(entryDate);
                        while (currentDate <= exitDate) {
                            const dateStr = currentDate.toISOString().split('T')[0];
                            holdingsByDate[dateStr] = (holdingsByDate[dateStr] || 0) + 1;
                            currentDate.setDate(currentDate.getDate() + 1);
                        }
                    }
                });
            }
        });

        // 최대 보유량 찾기
        const maxHoldings = Object.values(holdingsByDate).length > 0
            ? Math.max(...Object.values(holdingsByDate))
            : 0;

        return maxHoldings;
    }, [individual]);

    // 날짜별 수익률 데이터 계산
    const dailyProfitData = useMemo(() => {
        const profitByDate = {};
        const initialCapital = result.data.params?.INITIAL_CAPITAL || result.data.params?.initial_capital || 10000000; // 기본값 1000만원

        // 모든 종목의 거래 내역을 순회
        Object.entries(individual).forEach(([coin, data]) => {
            if (data && data.trades && data.trades.length > 0) {
                data.trades.forEach(trade => {
                    // 매도 날짜를 기준으로 수익 집계
                    if (trade.exit_date && trade.profit_loss !== undefined) {
                        const date = trade.exit_date.split(' ')[0];
                        if (!profitByDate[date]) {
                            profitByDate[date] = {
                                date,
                                profit: 0,
                                trades: 0
                            };
                        }
                        profitByDate[date].profit += trade.profit_loss;
                        profitByDate[date].trades += 1;
                    }
                });
            }
        });

        // 날짜순으로 정렬하고 누적 수익률 계산
        const sortedData = Object.values(profitByDate).sort((a, b) => a.date.localeCompare(b.date));

        let cumulativeProfit = 0;
        const dataWithCumulative = sortedData.map((item, index) => {
            cumulativeProfit += item.profit;

            // 당일 수익률 % = (당일 수익 / 초기 자본) * 100
            const dailyReturnPct = (item.profit / initialCapital) * 100;
            // 누적 수익률 % = (누적 수익 / 초기 자본) * 100
            const cumulativeReturnPct = (cumulativeProfit / initialCapital) * 100;

            return {
                ...item,
                cumulativeProfit: cumulativeProfit,
                dailyReturnPct: dailyReturnPct,
                cumulativeReturnPct: cumulativeReturnPct
            };
        });

        return dataWithCumulative;
    }, [individual, result.data.params]);

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="flex items-center justify-center min-h-screen p-2 sm:p-4 py-8 sm:py-4">
                <div
                    className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[80vh] sm:max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 헤더 */}
                    <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between z-10">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">백테스트 상세 결과</h2>
                        <div className="flex items-center gap-2">
                            <Button onClick={() => onExport(false)} className="px-4 py-2 text-sm bg-slate-600 hover:bg-slate-700">
                                요약 엑셀
                            </Button>
                            <Button onClick={() => onExport(true)} className="px-4 py-2 text-sm">
                                상세 엑셀
                            </Button>
                            <button
                                onClick={onClose}
                                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* 콘텐츠 */}
                    <div className="p-6 space-y-6">
                        {/* 요약 */}
                        <ResultSummary result={result.data} onExport={() => onExport(false)} />

                        {/* 실행 파라미터 */}
                        {result.data.params && (
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-lg p-6 border border-blue-200 dark:border-slate-600">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        실행 시점 파라미터
                                    </h3>
                                    <button
                                        onClick={() => setShowParams(!showParams)}
                                        className="text-sm px-3 py-1 rounded bg-blue-200 dark:bg-blue-600 hover:bg-blue-300 dark:hover:bg-blue-500 text-blue-800 dark:text-blue-100 transition-colors"
                                    >
                                        {showParams ? '숨기기' : '보기'}
                                    </button>
                                </div>
                                {showParams && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {Object.entries(result.data.params).map(([key, value]) => (
                                            <div key={key} className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm">
                                                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                                                    {getParamLabel(key)}
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                                                    {key}
                                                </div>
                                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                    {formatParamValue(key, value)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 차트 섹션 */}
                        <div className="space-y-6">
                            {/* 승률/패율 파이 차트 */}
                            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-6">
                                <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-4">승률 / 패율</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={winLossData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={(entry) => `${entry.name}: ${entry.value}`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {winLossData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* 종목별 수익 기여도 */}
                            {coinContributionData.length > 0 && (
                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200">종목별 수익 기여도</h3>
                                        <button
                                            onClick={() => setShowProfitRanking(!showProfitRanking)}
                                            className="text-sm px-3 py-1 rounded bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 transition-colors"
                                        >
                                            {showProfitRanking ? '순위 숨기기' : '순위 보기'}
                                        </button>
                                    </div>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={coinContributionData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="return" fill="#3b82f6" name="수익률 (%)" />
                                        </BarChart>
                                    </ResponsiveContainer>

                                    {/* 순위별 리스트 */}
                                    {showProfitRanking && (
                                        <div className="mt-4 bg-white dark:bg-slate-800 rounded-lg p-4">
                                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">수익률 순위</h4>
                                            <div className="space-y-2">
                                                {[...coinContributionData]
                                                    .sort((a, b) => b.return - a.return)
                                                    .map((coin, index) => (
                                                        <div
                                                            key={coin.name}
                                                            className="flex items-center justify-between py-2 px-3 rounded bg-slate-50 dark:bg-slate-700/50"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className={`text-sm font-bold ${index === 0 ? 'text-yellow-500' :
                                                                    index === 1 ? 'text-slate-400' :
                                                                        index === 2 ? 'text-amber-600' :
                                                                            'text-slate-600 dark:text-slate-400'
                                                                    }`}>
                                                                    {index + 1}위
                                                                </span>
                                                                <span className="font-medium text-slate-800 dark:text-slate-200">{coin.name}</span>
                                                            </div>
                                                            <span className={`font-semibold ${coin.return >= 0
                                                                ? 'text-green-600 dark:text-green-400'
                                                                : 'text-red-600 dark:text-red-400'
                                                                }`}>
                                                                {coin.return >= 0 ? '+' : ''}{coin.return.toFixed(2)}%
                                                            </span>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 종목별 거래횟수 */}
                            {coinContributionData.length > 0 && (
                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200">종목별 거래 횟수</h3>
                                        <button
                                            onClick={() => setShowTradeCountRanking(!showTradeCountRanking)}
                                            className="text-sm px-3 py-1 rounded bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 transition-colors"
                                        >
                                            {showTradeCountRanking ? '순위 숨기기' : '순위 보기'}
                                        </button>
                                    </div>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={coinContributionData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="trades" fill="#10b981" name="거래 횟수" />
                                        </BarChart>
                                    </ResponsiveContainer>

                                    {/* 순위별 리스트 */}
                                    {showTradeCountRanking && (
                                        <div className="mt-4 bg-white dark:bg-slate-800 rounded-lg p-4">
                                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">거래 횟수 순위</h4>
                                            <div className="space-y-2">
                                                {[...coinContributionData]
                                                    .sort((a, b) => b.trades - a.trades)
                                                    .map((coin, index) => (
                                                        <div
                                                            key={coin.name}
                                                            className="flex items-center justify-between py-2 px-3 rounded bg-slate-50 dark:bg-slate-700/50"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className={`text-sm font-bold ${index === 0 ? 'text-yellow-500' :
                                                                    index === 1 ? 'text-slate-400' :
                                                                        index === 2 ? 'text-amber-600' :
                                                                            'text-slate-600 dark:text-slate-400'
                                                                    }`}>
                                                                    {index + 1}위
                                                                </span>
                                                                <span className="font-medium text-slate-800 dark:text-slate-200">{coin.name}</span>
                                                            </div>
                                                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                                {coin.trades}회
                                                            </span>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 기간별 거래 차트 */}
                            {dailyTradeData.length > 0 && (
                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-6">
                                    <div className="mb-4">
                                        <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200">기간별 거래 현황</h3>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                            각 날짜별 매수/매도 거래 건수를 나타냅니다.
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-6 text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-600 dark:text-slate-400">거래일수:</span>
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                    {dailyTradeAverage.totalDays}일
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-600 dark:text-slate-400">일평균 매수:</span>
                                                <span className="font-semibold text-red-600 dark:text-red-400">
                                                    {dailyTradeAverage.avgBuy.toFixed(2)}건
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-600 dark:text-slate-400">일평균 매도:</span>
                                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                                    {dailyTradeAverage.avgSell.toFixed(2)}건
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-600 dark:text-slate-400">하루 최대 보유종목:</span>
                                                <span className="font-semibold text-purple-600 dark:text-purple-400">
                                                    {maxDailyHoldings}개
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-600 dark:text-slate-400">하루 최대 매수건수:</span>
                                                <span className="font-semibold text-orange-600 dark:text-orange-400">
                                                    {dailyTradeAverage.maxBuy}건
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-600 dark:text-slate-400">하루 최대 매도건수:</span>
                                                <span className="font-semibold text-teal-600 dark:text-teal-400">
                                                    {dailyTradeAverage.maxSell}건
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={dailyTradeData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="date"
                                                angle={-45}
                                                textAnchor="end"
                                                height={100}
                                                tick={{ fontSize: 11 }}
                                            />
                                            <YAxis
                                                label={{ value: '거래 건수', angle: -90, position: 'insideLeft' }}
                                            />
                                            <Tooltip
                                                formatter={(value) => `${value}건`}
                                                labelFormatter={(label) => `날짜: ${label}`}
                                            />
                                            <Legend />
                                            <Bar dataKey="buy" fill="#ef4444" name="매수" />
                                            <Bar dataKey="sell" fill="#3b82f6" name="매도" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* 기간별 수익률 현황 (하루 수익률) */}
                            {dailyProfitData.length > 0 && (
                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-6">
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200">기간별 수익률 현황</h3>
                                            <button
                                                onClick={() => setShowDailyProfitRanking(!showDailyProfitRanking)}
                                                className="text-sm px-3 py-1 rounded bg-blue-200 dark:bg-blue-600 hover:bg-blue-300 dark:hover:bg-blue-500 text-blue-800 dark:text-blue-100 transition-colors"
                                            >
                                                {showDailyProfitRanking ? '순위 숨기기' : '순위 보기'}
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            각 날짜별 당일 수익/손실을 나타냅니다. (% = 당일 수익 / 초기 자본 × 100)
                                        </p>
                                    </div>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={dailyProfitData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="date"
                                                angle={-45}
                                                textAnchor="end"
                                                height={100}
                                                tick={{ fontSize: 11 }}
                                            />
                                            <YAxis
                                                label={{ value: '수익/손실 (KRW)', angle: -90, position: 'insideLeft' }}
                                            />
                                            <Tooltip content={<CustomProfitTooltip />} />
                                            <Legend />
                                            <Bar dataKey="profit" name="수익/손실">
                                                {dailyProfitData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>

                                    {/* 수익률 순위 */}
                                    {showDailyProfitRanking && (
                                        <div className="mt-4 bg-white dark:bg-slate-800 rounded-lg p-4">
                                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">일별 수익률 순위 (상위 10개)</h4>
                                            <div className="space-y-2">
                                                {[...dailyProfitData]
                                                    .sort((a, b) => b.profit - a.profit)
                                                    .slice(0, 10)
                                                    .map((day, index) => (
                                                        <div
                                                            key={day.date}
                                                            className="flex items-center justify-between py-2 px-3 rounded bg-slate-50 dark:bg-slate-700/50"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className={`text-sm font-bold ${index === 0 ? 'text-yellow-500' :
                                                                    index === 1 ? 'text-slate-400' :
                                                                        index === 2 ? 'text-amber-600' :
                                                                            'text-slate-600 dark:text-slate-400'
                                                                    }`}>
                                                                    {index + 1}위
                                                                </span>
                                                                <span className="font-medium text-slate-800 dark:text-slate-200">{day.date}</span>
                                                            </div>
                                                            <span className={`${day.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                {day.profit >= 0 ? '+' : ''}<NumberWithBoldInteger value={Math.abs(day.profit)} decimals={2} suffix=" KRW" /> (<span className="font-semibold">{day.dailyReturnPct >= 0 ? '+' : ''}{day.dailyReturnPct.toFixed(2)}%</span>) · {day.trades}건
                                                            </span>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 기간별 누적 수익률 현황 */}
                            {dailyProfitData.length > 0 && (
                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-6">
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200">기간별 누적 수익률 현황</h3>
                                            <button
                                                onClick={() => setShowCumulativeProfitRanking(!showCumulativeProfitRanking)}
                                                className="text-sm px-3 py-1 rounded bg-blue-200 dark:bg-blue-600 hover:bg-blue-300 dark:hover:bg-blue-500 text-blue-800 dark:text-blue-100 transition-colors"
                                            >
                                                {showCumulativeProfitRanking ? '순위 숨기기' : '순위 보기'}
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            날짜별 누적 수익/손실을 나타냅니다. (% = 누적 수익 / 초기 자본 × 100, 마지막 값 = 최종 수익률)
                                        </p>
                                    </div>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={dailyProfitData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="date"
                                                angle={-45}
                                                textAnchor="end"
                                                height={100}
                                                tick={{ fontSize: 11 }}
                                            />
                                            <YAxis
                                                label={{ value: '누적 수익/손실 (KRW)', angle: -90, position: 'insideLeft' }}
                                            />
                                            <Tooltip content={<CustomProfitTooltip />} />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                dataKey="cumulativeProfit"
                                                stroke="#8b5cf6"
                                                strokeWidth={2}
                                                name="누적 수익/손실"
                                                dot={{ fill: '#8b5cf6', r: 3 }}
                                                activeDot={{ r: 5 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>

                                    {/* 누적 수익률 순위 */}
                                    {showCumulativeProfitRanking && (
                                        <div className="mt-4 bg-white dark:bg-slate-800 rounded-lg p-4">
                                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">누적 수익률 순위 (상위 10개)</h4>
                                            <div className="space-y-2">
                                                {[...dailyProfitData]
                                                    .sort((a, b) => b.cumulativeProfit - a.cumulativeProfit)
                                                    .slice(0, 10)
                                                    .map((day, index) => (
                                                        <div
                                                            key={day.date}
                                                            className="flex items-center justify-between py-2 px-3 rounded bg-slate-50 dark:bg-slate-700/50"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className={`text-sm font-bold ${index === 0 ? 'text-yellow-500' :
                                                                    index === 1 ? 'text-slate-400' :
                                                                        index === 2 ? 'text-amber-600' :
                                                                            'text-slate-600 dark:text-slate-400'
                                                                    }`}>
                                                                    {index + 1}위
                                                                </span>
                                                                <span className="font-medium text-slate-800 dark:text-slate-200">{day.date}</span>
                                                            </div>
                                                            <span className={`${day.cumulativeProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                {day.cumulativeProfit >= 0 ? '+' : ''}<NumberWithBoldInteger value={Math.abs(day.cumulativeProfit)} decimals={2} suffix=" KRW" /> (<span className="font-semibold">{day.cumulativeReturnPct >= 0 ? '+' : ''}{day.cumulativeReturnPct.toFixed(2)}%</span>)
                                                            </span>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 개별 종목 상세 */}
                        {Object.keys(individual).length > 0 && (
                            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-6">
                                <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-4">개별 종목 상세</h3>
                                <div className="space-y-4">
                                    {Object.entries(individual).filter(([coin, data]) => data !== null).map(([coin, data]) => (
                                        <details key={coin} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <summary className="px-4 py-3 cursor-pointer font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                {(() => {
                                                    // 실제 거래 내역이 있으면 정확한 합산, 없으면 평균값으로 근사치 계산
                                                    const totalProfit = data.trades && data.trades.length > 0
                                                        ? data.trades.reduce((sum, trade) => sum + trade.profit_loss, 0)
                                                        : (() => {
                                                            const winningTrades = Math.round(data.total_trades * (data.win_rate / 100));
                                                            const losingTrades = data.total_trades - winningTrades;
                                                            return (data.avg_profit * winningTrades) + (data.avg_loss * losingTrades);
                                                        })();
                                                    const sign = totalProfit >= 0 ? '+' : '';
                                                    const profitColor = totalProfit >= 0
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : 'text-red-600 dark:text-red-400';

                                                    return (
                                                        <span>
                                                            {coin} - 수익률: {data.total_return.toFixed(2)}% | 거래: {data.total_trades}회 | 승률: {data.win_rate.toFixed(2)}% | <span className={profitColor}>수익: {sign}{totalProfit.toFixed(2)} KRW</span>
                                                        </span>
                                                    );
                                                })()}
                                            </summary>
                                            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
                                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                                                    <div>
                                                        <div className="text-xs text-slate-600 dark:text-slate-400">평균 보유일</div>
                                                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                            {data.avg_holding_days.toFixed(1)}일
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-600 dark:text-slate-400">평균 수익</div>
                                                        <div className="text-sm text-green-600 dark:text-green-400">
                                                            <NumberWithBoldInteger value={data.avg_profit} decimals={2} suffix=" KRW" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-600 dark:text-slate-400">평균 손실</div>
                                                        <div className="text-sm text-red-600 dark:text-red-400">
                                                            <NumberWithBoldInteger value={data.avg_loss} decimals={2} suffix=" KRW" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-600 dark:text-slate-400">총 수익/손실</div>
                                                        <div className={`text-sm font-semibold ${(() => {
                                                            // 실제 거래 내역이 있으면 정확한 합산, 없으면 평균값으로 근사치 계산
                                                            const totalProfit = data.trades && data.trades.length > 0
                                                                ? data.trades.reduce((sum, trade) => sum + trade.profit_loss, 0)
                                                                : (() => {
                                                                    const winningTrades = Math.round(data.total_trades * (data.win_rate / 100));
                                                                    const losingTrades = data.total_trades - winningTrades;
                                                                    return (data.avg_profit * winningTrades) + (data.avg_loss * losingTrades);
                                                                })();
                                                            return totalProfit >= 0
                                                                ? 'text-green-600 dark:text-green-400'
                                                                : 'text-red-600 dark:text-red-400';
                                                        })()}`}>
                                                            {(() => {
                                                                // 실제 거래 내역이 있으면 정확한 합산, 없으면 평균값으로 근사치 계산
                                                                const totalProfit = data.trades && data.trades.length > 0
                                                                    ? data.trades.reduce((sum, trade) => sum + trade.profit_loss, 0)
                                                                    : (() => {
                                                                        const winningTrades = Math.round(data.total_trades * (data.win_rate / 100));
                                                                        const losingTrades = data.total_trades - winningTrades;
                                                                        return (data.avg_profit * winningTrades) + (data.avg_loss * losingTrades);
                                                                    })();
                                                                const sign = totalProfit >= 0 ? '+' : '';
                                                                return `${sign}${totalProfit.toFixed(2)} KRW`;
                                                            })()}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-slate-600 dark:text-slate-400">Profit Factor</div>
                                                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                            {data.profit_factor.toFixed(2)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 거래 내역 */}
                                                {data.trades && data.trades.length > 0 && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                                                총 {data.trades.length}개 거래
                                                            </div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-500 italic hidden sm:block">
                                                                ← 좌우로 스크롤 가능 →
                                                            </div>
                                                        </div>
                                                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800/50 shadow-sm">
                                                            <table className="w-full text-xs min-w-[1200px]">
                                                                <thead className="bg-slate-100 dark:bg-slate-700">
                                                                    <tr>
                                                                        <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">진입일</th>
                                                                        <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">청산일</th>
                                                                        <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">진입가</th>
                                                                        <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">청산가</th>
                                                                        <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">수량</th>
                                                                        <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">손익</th>
                                                                        <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">수익률</th>
                                                                        <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">예측 고가</th>
                                                                        <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">예측 저가</th>
                                                                        <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">상승 확률</th>
                                                                        <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">기대 수익률</th>
                                                                        <th className="px-3 py-2 text-center font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">사유</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                                    {data.trades.map((trade, idx) => (
                                                                        <tr key={idx} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                                            <td className="px-3 py-2 whitespace-nowrap">{trade.entry_date}</td>
                                                                            <td className="px-3 py-2 whitespace-nowrap">{trade.exit_date}</td>
                                                                            <td className="px-3 py-2 text-right whitespace-nowrap">
                                                                                <NumberWithBoldInteger value={trade.entry_price} decimals={2} />
                                                                            </td>
                                                                            <td className="px-3 py-2 text-right whitespace-nowrap">
                                                                                <NumberWithBoldInteger value={trade.exit_price} decimals={2} />
                                                                            </td>
                                                                            <td className="px-3 py-2 text-right whitespace-nowrap">
                                                                                {trade.quantity.toFixed(8)}
                                                                            </td>
                                                                            <td className={`px-3 py-2 text-right whitespace-nowrap ${trade.profit_loss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                                <NumberWithBoldInteger value={trade.profit_loss} decimals={2} />
                                                                            </td>
                                                                            <td className={`px-3 py-2 text-right font-medium whitespace-nowrap ${trade.profit_loss_rate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                                {trade.profit_loss_rate.toFixed(2)}%
                                                                            </td>
                                                                            <td className="px-3 py-2 text-right whitespace-nowrap text-blue-600 dark:text-blue-400">
                                                                                <NumberWithBoldInteger value={trade.predicted_high} decimals={2} />
                                                                            </td>
                                                                            <td className="px-3 py-2 text-right whitespace-nowrap text-orange-600 dark:text-orange-400">
                                                                                <NumberWithBoldInteger value={trade.predicted_low} decimals={2} />
                                                                            </td>
                                                                            <td className="px-3 py-2 text-right whitespace-nowrap text-purple-600 dark:text-purple-400">
                                                                                {(trade.up_probability * 100).toFixed(2)}%
                                                                            </td>
                                                                            <td className="px-3 py-2 text-right font-medium whitespace-nowrap text-indigo-600 dark:text-indigo-400">
                                                                                {trade.expected_return.toFixed(2)}%
                                                                            </td>
                                                                            <td className="px-3 py-2 text-center whitespace-nowrap">
                                                                                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                                                    {trade.reason}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </details>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
