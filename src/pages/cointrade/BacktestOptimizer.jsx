import { useState, useEffect, useMemo } from 'react';
import { send } from '@/util/ClientUtil';
import Toast from '@/component/common/display/Toast';
import useModalAnimation from '@/hooks/useModalAnimation';
import PageTitle from '@/component/common/display/PageTitle';
import Button from '@/component/common/button/Button';
import ExcelJS from 'exceljs';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

/**
 * 점수를 색상으로 변환 (빨강 → 노랑 → 초록)
 */
function scoreToColor(score, minScore, maxScore) {
    if (minScore === maxScore) return '#3b82f6';
    const ratio = Math.max(0, Math.min(1, (score - minScore) / (maxScore - minScore)));
    // 색각이상 친화 팔레트: 파란색(낮음) → 노란색(중간) → 주황색(높음)
    if (ratio < 0.5) {
        const t = ratio * 2;
        const r = Math.round(59 + (251 - 59) * t);
        const g = Math.round(130 + (191 - 130) * t);
        const b = Math.round(246 + (36 - 246) * t);
        return `rgb(${r},${g},${b})`;
    } else {
        const t = (ratio - 0.5) * 2;
        const r = Math.round(251 + (249 - 251) * t);
        const g = Math.round(191 + (115 - 191) * t);
        const b = Math.round(36 + (22 - 36) * t);
        return `rgb(${r},${g},${b})`;
    }
}

/**
 * 파라미터 탐색 분포 차트 컴포넌트
 */
function ParamExplorationChart({ allTrials, paramRanges, bestParams, getParamLabel }) {
    const paramKeys = Object.keys(paramRanges || {});
    const [selectedPairX, setSelectedPairX] = useState(paramKeys[0] || '');
    const [selectedPairY, setSelectedPairY] = useState(paramKeys[1] || '');

    if (!allTrials || allTrials.length === 0 || paramKeys.length === 0) return null;

    const scores = allTrials.map(t => t.final_score).filter(s => s != null);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    // 파라미터별 스트립 차트 데이터
    const stripData = paramKeys.map(key => {
        const range = paramRanges[key];
        const points = allTrials
            .filter(t => t.params && t.params[key] != null)
            .map(t => ({
                value: t.params[key],
                score: t.final_score,
                totalReturn: t.total_return,
                trialId: t.trial_id,
            }));

        // 범위 내 step 단위로 탐색된 값 빈도 계산
        const valueCounts = {};
        points.forEach(p => {
            const rounded = Number(p.value.toFixed(4));
            valueCounts[rounded] = (valueCounts[rounded] || 0) + 1;
        });

        // 가능한 전체 step 값
        const allSteps = [];
        if (range.step > 0) {
            for (let v = range.min; v <= range.max + range.step * 0.01; v += range.step) {
                allSteps.push(Number(v.toFixed(4)));
            }
        }
        const exploredSteps = allSteps.filter(v => valueCounts[v]);

        return { key, range, points, valueCounts, allSteps, exploredSteps };
    });

    // 2D 산점도 데이터
    const scatterData = allTrials
        .filter(t => t.params && t.params[selectedPairX] != null && t.params[selectedPairY] != null)
        .map(t => ({
            x: t.params[selectedPairX],
            y: t.params[selectedPairY],
            score: t.final_score,
            totalReturn: t.total_return,
            trialId: t.trial_id,
            params: t.params,
        }));

    const CustomScatterTooltip = ({ active, payload }) => {
        if (!active || !payload?.[0]) return null;
        const d = payload[0].payload;
        return (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg p-3 text-xs">
                <div className="font-semibold mb-1">시행 #{d.trialId}</div>
                <div>점수: <span className="font-bold">{d.score?.toFixed(2)}</span></div>
                <div>수익률: <span className={d.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}>{d.totalReturn?.toFixed(2)}%</span></div>
                {d.params && Object.entries(d.params).map(([k, v]) => (
                    <div key={k} className="text-slate-500">{getParamLabel(k)}: {typeof v === 'number' ? v.toFixed(2) : v}</div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* 파라미터별 스트립 차트 */}
            <div>
                <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">
                    파라미터별 탐색 분포
                </h4>
                <div className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                    각 파라미터의 탐색 범위에서 실제 탐색된 값을 점으로 표시합니다. 점 색상은 점수를 나타냅니다 (
                    <span style={{ color: '#3b82f6' }}>파랑</span>=낮음 →
                    <span style={{ color: '#fbbf24' }}> 노랑</span>=중간 →
                    <span style={{ color: '#f97316' }}> 주황</span>=높음).
                </div>
                <div className="space-y-3">
                    {stripData.map(({ key, range, points, allSteps, exploredSteps }) => (
                        <div key={key} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{getParamLabel(key)}</span>
                                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-2 font-mono">{key}</span>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    탐색: <span className="font-semibold text-blue-600 dark:text-blue-400">{exploredSteps.length}</span>/{allSteps.length}개 구간
                                    ({allSteps.length > 0 ? (exploredSteps.length / allSteps.length * 100).toFixed(0) : 0}%)
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={60}>
                                <ScatterChart margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                                    <XAxis
                                        type="number"
                                        dataKey="value"
                                        domain={[range.min, range.max]}
                                        tick={{ fontSize: 10 }}
                                        tickCount={Math.min(allSteps.length, 10)}
                                    />
                                    <YAxis type="number" dataKey="jitter" domain={[0, 1]} hide />
                                    <Tooltip content={({ active, payload }) => {
                                        if (!active || !payload?.[0]) return null;
                                        const d = payload[0].payload;
                                        return (
                                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded shadow-lg p-2 text-xs">
                                                <div>값: <span className="font-bold">{d.value}</span></div>
                                                <div>점수: <span className="font-bold">{d.score?.toFixed(2)}</span></div>
                                                <div>수익률: <span className={d.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}>{d.totalReturn?.toFixed(2)}%</span></div>
                                                <div className="text-slate-400">시행 #{d.trialId}</div>
                                            </div>
                                        );
                                    }} />
                                    {/* 탐색되지 않은 구간 표시 */}
                                    {allSteps.filter(v => !exploredSteps.includes(v)).map(v => (
                                        <ReferenceLine key={v} x={v} stroke="#cbd5e1" strokeDasharray="2 2" strokeWidth={1} />
                                    ))}
                                    {/* 최적값 표시 */}
                                    {bestParams && bestParams[key] != null && (
                                        <ReferenceLine x={bestParams[key]} stroke="#f59e0b" strokeWidth={2} label={{ value: '★', position: 'top', fontSize: 12 }} />
                                    )}
                                    <Scatter
                                        data={points.map((p, i) => ({ ...p, jitter: 0.3 + Math.random() * 0.4 }))}
                                        isAnimationActive={false}
                                    >
                                        {points.map((p, i) => (
                                            <Cell key={i} fill={scoreToColor(p.score, minScore, maxScore)} fillOpacity={0.8} r={5} />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                            {/* 커버리지 바 */}
                            <div className="mt-1 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-full transition-all"
                                    style={{ width: `${allSteps.length > 0 ? (exploredSteps.length / allSteps.length * 100) : 0}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 2D 산점도 */}
            {paramKeys.length >= 2 && (
                <div>
                    <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">
                        파라미터 조합 탐색 (2D 산점도)
                    </h4>
                    <div className="flex flex-wrap gap-3 mb-3">
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-slate-500 dark:text-slate-400">X축:</label>
                            <select
                                value={selectedPairX}
                                onChange={(e) => setSelectedPairX(e.target.value)}
                                className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                            >
                                {paramKeys.map(k => (
                                    <option key={k} value={k}>{getParamLabel(k)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-slate-500 dark:text-slate-400">Y축:</label>
                            <select
                                value={selectedPairY}
                                onChange={(e) => setSelectedPairY(e.target.value)}
                                className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                            >
                                {paramKeys.map(k => (
                                    <option key={k} value={k}>{getParamLabel(k)}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                        <ResponsiveContainer width="100%" height={300}>
                            <ScatterChart margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis
                                    type="number"
                                    dataKey="x"
                                    name={getParamLabel(selectedPairX)}
                                    domain={[paramRanges[selectedPairX]?.min, paramRanges[selectedPairX]?.max]}
                                    tick={{ fontSize: 10 }}
                                    label={{ value: getParamLabel(selectedPairX), position: 'bottom', offset: 15, fontSize: 11 }}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="y"
                                    name={getParamLabel(selectedPairY)}
                                    domain={[paramRanges[selectedPairY]?.min, paramRanges[selectedPairY]?.max]}
                                    tick={{ fontSize: 10 }}
                                    label={{ value: getParamLabel(selectedPairY), angle: -90, position: 'insideLeft', offset: 5, fontSize: 11 }}
                                />
                                <Tooltip content={<CustomScatterTooltip />} />
                                {/* 최적값 십자선 */}
                                {bestParams && bestParams[selectedPairX] != null && (
                                    <ReferenceLine x={bestParams[selectedPairX]} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={1.5} />
                                )}
                                {bestParams && bestParams[selectedPairY] != null && (
                                    <ReferenceLine y={bestParams[selectedPairY]} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={1.5} />
                                )}
                                <Scatter data={scatterData} isAnimationActive={false}>
                                    {scatterData.map((d, i) => (
                                        <Cell key={i} fill={scoreToColor(d.score, minScore, maxScore)} fillOpacity={0.8} r={6} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                        <div className="flex items-center justify-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                                <span>낮은 점수</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#fbbf24' }} />
                                <span>중간 점수</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f97316' }} />
                                <span>높은 점수</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-4 h-0.5 bg-yellow-500" />
                                <span>최적값</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

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

    // 전체 파라미터 조합 수 계산
    const totalCombinations = useMemo(() => {
        return Object.values(paramRanges).reduce((total, range) => {
            const steps = Math.round((range.max_value - range.min_value) / range.step) + 1;
            return total * Math.max(steps, 1);
        }, 1);
    }, [paramRanges]);

    // TPE 추천 실행 횟수 계산
    const recommendedRuns = useMemo(() => {
        const paramCount = Object.keys(paramRanges).length;
        return paramCount * 50; // 높은 신뢰도 기준
    }, [paramRanges]);

    // 실행 제목
    const [runTitle, setRunTitle] = useState('');

    // 실행 상태
    const [runningTaskId, setRunningTaskId] = useState(null);
    const [taskStatus, setTaskStatus] = useState(null);
    const [taskResult, setTaskResult] = useState(null);
    const [isRunConfirmModalOpen, setIsRunConfirmModalOpen] = useState(false);
    const { shouldRender: renderRunConfirm, isAnimatingOut: isRunConfirmClosing } = useModalAnimation(isRunConfirmModalOpen, 250);

    // 이력 탭 상태
    const [historyList, setHistoryList] = useState([]);
    const [historyRunningStatuses, setHistoryRunningStatuses] = useState({}); // { taskId: { progress, current_trial, total_trials, best_score, best_return } }
    const [selectedDetailTaskId, setSelectedDetailTaskId] = useState(null);
    const [detailResult, setDetailResult] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const { shouldRender: renderDetailModal, isAnimatingOut: isDetailModalClosing } = useModalAnimation(isDetailModalOpen, 250);
    const [showAllTrials, setShowAllTrials] = useState(false);
    const { shouldRender: renderAllTrials, isAnimatingOut: isAllTrialsClosing } = useModalAnimation(showAllTrials, 250);

    // 전체 탐색 시행 테이블 필터/정렬
    const [exploredTrialFilter, setExploredTrialFilter] = useState('all'); // 'all' | 'met' | 'unmet'
    const [exploredTrialSortKey, setExploredTrialSortKey] = useState('final_score'); // 'final_score' | 'total_return' | 'trial_id'
    const [exploredTrialSortDir, setExploredTrialSortDir] = useState('desc'); // 'asc' | 'desc'

    // 인라인 제목 수정
    const [editingTitleTaskId, setEditingTitleTaskId] = useState(null);
    const [editingTitleValue, setEditingTitleValue] = useState('');

    // 삭제 확인 모달
    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
    const { shouldRender: renderDeleteConfirm, isAnimatingOut: isDeleteConfirmClosing } = useModalAnimation(isDeleteConfirmModalOpen, 250);
    const [deleteTargetTaskId, setDeleteTargetTaskId] = useState(null);

    // 다중 선택 삭제
    const [selectedHistoryIds, setSelectedHistoryIds] = useState([]);
    const [isDeleteSelectedModalOpen, setIsDeleteSelectedModalOpen] = useState(false);
    const { shouldRender: renderDeleteSelected, isAnimatingOut: isDeleteSelectedClosing } = useModalAnimation(isDeleteSelectedModalOpen, 250);

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

    // 이력 탭에서 실행 중인 항목들 진행사항 폴링
    useEffect(() => {
        if (activeTab !== 'history') return;

        const runningItems = historyList.filter(item => item.status === 'running');
        if (runningItems.length === 0) return;

        // 즉시 한번 조회
        const fetchRunningStatuses = async () => {
            const newStatuses = {};
            for (const item of runningItems) {
                try {
                    const { data, error } = await send(`/dart/api/backtest/optimizer/status/${item.task_id}`, {}, 'GET');
                    if (!error && data?.success && data?.response) {
                        newStatuses[item.task_id] = data.response;
                        // 완료/실패로 변경된 경우 이력 목록 갱신
                        if (data.response.status === 'completed' || data.response.status === 'failed') {
                            fetchHistory();
                            return;
                        }
                    }
                } catch (e) {
                    console.error('이력 상태 조회 실패:', e);
                }
            }
            setHistoryRunningStatuses(prev => ({ ...prev, ...newStatuses }));
        };

        fetchRunningStatuses();

        const intervalId = setInterval(fetchRunningStatuses, 5000);
        return () => clearInterval(intervalId);
    }, [activeTab, historyList]);

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
                if (isDetailModalOpen) {
                    setIsDetailModalOpen(false);
                } else if (isRunConfirmModalOpen) {
                    setIsRunConfirmModalOpen(false);
                }
            }
        };
        const anyModalOpen = isRunConfirmModalOpen || isDetailModalOpen;
        if (anyModalOpen) {
            window.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isRunConfirmModalOpen, isDetailModalOpen]);

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

    // 다중 선택 핸들러
    const handleHistorySelect = (taskId) => {
        if (selectedHistoryIds.includes(taskId)) {
            setSelectedHistoryIds(selectedHistoryIds.filter(id => id !== taskId));
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
                    const { data, error } = await send(`/dart/api/backtest/optimizer/result/${taskId}`, {}, 'DELETE');
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
                await fetchHistory();
                setSelectedHistoryIds([]);
                if (selectedHistoryIds.includes(selectedDetailTaskId)) {
                    setSelectedDetailTaskId(null);
                    setDetailResult(null);
                }
            } else {
                setToast('삭제에 실패했습니다.');
            }
        } catch (e) {
            console.error('선택 삭제 실패:', e);
            setToast('삭제 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 인라인 제목 수정 핸들러
    const handleStartEditTitle = (taskId, currentTitle) => {
        setEditingTitleTaskId(taskId);
        setEditingTitleValue(currentTitle || '');
    };

    const handleSaveTitle = async (taskId) => {
        const newTitle = editingTitleValue.trim() || null;
        setEditingTitleTaskId(null);

        try {
            const { data, error } = await send(`/dart/api/backtest/optimizer/result/${taskId}`, { title: newTitle }, 'PATCH');
            if (error) {
                setToast('제목 수정 실패: ' + error);
            } else {
                setHistoryList(prev => prev.map(item =>
                    item.task_id === taskId ? { ...item, title: newTitle } : item
                ));
            }
        } catch (e) {
            console.error('제목 수정 실패:', e);
            setToast('제목 수정 중 오류가 발생했습니다.');
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
                title: runTitle.trim() || null,
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
        await handleCancelTask(runningTaskId);
    };

    const handleCancelTask = async (taskId) => {
        if (!taskId) return;

        if (!confirm('실행 중인 옵티마이저를 취소하시겠습니까?')) return;

        setLoading(true);
        try {
            const { data, error } = await send(`/dart/api/backtest/optimizer/cancel/${taskId}`, {}, 'POST');

            if (error) {
                setToast('취소 실패: ' + error);
            } else if (data?.success) {
                setToast('옵티마이저가 취소되었습니다.');
                // 실행 탭의 현재 태스크인 경우
                if (taskId === runningTaskId) {
                    setTaskStatus(prev => prev ? { ...prev, status: 'cancelled' } : null);
                    localStorage.removeItem('optimizer_running_task_id');
                }
                // 이력 목록 새로고침
                fetchHistory();
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

    const handleOpenDetailModal = async (taskId) => {
        setDetailResult(null);
        setSelectedDetailTaskId(taskId);
        setIsDetailModalOpen(true);
        setLoading(true);
        try {
            await fetchTaskResult(taskId, true);
        } finally {
            setLoading(false);
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

    const handleExportExcel = async (resultData, taskId) => {
        try {
            const wb = new ExcelJS.Workbook();

            // ===== Sheet 1: 요약 =====
            const summaryWs = wb.addWorksheet('요약');

            const titleRow = summaryWs.addRow(['백테스트 옵티마이저 결과 요약']);
            titleRow.font = { size: 16, bold: true };
            titleRow.height = 25;
            summaryWs.mergeCells('A1:B1');

            summaryWs.addRow([]);

            // 결과 요약 헤더
            const headerRow = summaryWs.addRow(['항목', '값']);
            headerRow.height = 20;
            [1, 2].forEach(col => {
                headerRow.getCell(col).font = { bold: true, color: { argb: 'FFFFFFFF' } };
                headerRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
                headerRow.getCell(col).alignment = { vertical: 'middle', horizontal: 'center' };
            });

            const summaryRows = [
                ['Task ID', taskId || '-'],
                ['최고 점수', resultData.best_score?.toFixed(2) ?? '-'],
                ['최고 수익률 (%)', resultData.best_return?.toFixed(2) ?? '-'],
                ['총 시행 횟수', resultData.total_trials || 0],
                ['성공 시행', resultData.completed_trials || 0],
                ['실패 시행', resultData.failed_trials || 0],
                ['목표 달성 횟수', resultData.target_met_trials || 0],
                ['소요 시간 (초)', resultData.elapsed_time_seconds?.toFixed(1) ?? '-'],
                ['중단 사유', resultData.stop_reason || '-']
            ];

            summaryRows.forEach(rowData => {
                const row = summaryWs.addRow(rowData);
                row.alignment = { vertical: 'middle' };
                row.getCell(1).font = { bold: true };
                row.getCell(2).alignment = { horizontal: 'right' };

                if (rowData[0] === '최고 수익률 (%)') {
                    const val = resultData.best_return;
                    if (val != null) {
                        row.getCell(2).font = {
                            color: { argb: val >= 0 ? 'FF00B050' : 'FFFF0000' },
                            bold: true
                        };
                    }
                }
            });

            // 최적 파라미터 섹션
            if (resultData.best_params) {
                summaryWs.addRow([]);
                summaryWs.addRow([]);

                const paramsTitleRow = summaryWs.addRow(['최적 파라미터']);
                paramsTitleRow.font = { size: 14, bold: true };
                paramsTitleRow.height = 25;
                summaryWs.mergeCells(`A${paramsTitleRow.number}:B${paramsTitleRow.number}`);

                summaryWs.addRow([]);

                const paramsHeaderRow = summaryWs.addRow(['파라미터', '값']);
                paramsHeaderRow.height = 20;
                [1, 2].forEach(col => {
                    paramsHeaderRow.getCell(col).font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    paramsHeaderRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
                    paramsHeaderRow.getCell(col).alignment = { vertical: 'middle', horizontal: 'center' };
                });

                Object.entries(resultData.best_params).forEach(([key, value]) => {
                    const row = summaryWs.addRow([
                        `${getParamLabel(key)} (${key})`,
                        typeof value === 'number' ? value.toFixed(2) : value
                    ]);
                    row.getCell(1).font = { bold: true };
                    row.getCell(2).alignment = { horizontal: 'right' };
                });
            }

            // 고정 파라미터 섹션
            if (resultData.fixed_params) {
                summaryWs.addRow([]);
                summaryWs.addRow([]);

                const fixedTitleRow = summaryWs.addRow(['고정 파라미터']);
                fixedTitleRow.font = { size: 14, bold: true };
                fixedTitleRow.height = 25;
                summaryWs.mergeCells(`A${fixedTitleRow.number}:B${fixedTitleRow.number}`);

                summaryWs.addRow([]);

                const fixedHeaderRow = summaryWs.addRow(['파라미터', '값']);
                fixedHeaderRow.height = 20;
                [1, 2].forEach(col => {
                    fixedHeaderRow.getCell(col).font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    fixedHeaderRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B9BD5' } };
                    fixedHeaderRow.getCell(col).alignment = { vertical: 'middle', horizontal: 'center' };
                });

                Object.entries(resultData.fixed_params).forEach(([key, value]) => {
                    const row = summaryWs.addRow([
                        key,
                        typeof value === 'number'
                            ? (key.includes('fee_rate') || Math.abs(value) < 0.01 ? value.toFixed(4) : value.toLocaleString())
                            : value
                    ]);
                    row.getCell(1).font = { bold: true };
                    row.getCell(2).alignment = { horizontal: 'right' };
                });
            }

            // 탐색 파라미터 범위 섹션
            if (resultData.param_ranges) {
                summaryWs.addRow([]);
                summaryWs.addRow([]);

                const rangeTitleRow = summaryWs.addRow(['탐색 파라미터 범위']);
                rangeTitleRow.font = { size: 14, bold: true };
                rangeTitleRow.height = 25;
                summaryWs.mergeCells(`A${rangeTitleRow.number}:D${rangeTitleRow.number}`);

                summaryWs.addRow([]);

                const rangeHeaderRow = summaryWs.addRow(['파라미터', '최소', '최대', '증가값']);
                rangeHeaderRow.height = 20;
                [1, 2, 3, 4].forEach(col => {
                    rangeHeaderRow.getCell(col).font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    rangeHeaderRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
                    rangeHeaderRow.getCell(col).alignment = { vertical: 'middle', horizontal: 'center' };
                });

                Object.entries(resultData.param_ranges).forEach(([key, range]) => {
                    const row = summaryWs.addRow([
                        `${getParamLabel(key)} (${key})`,
                        range.min,
                        range.max,
                        range.step
                    ]);
                    row.getCell(1).font = { bold: true };
                    [2, 3, 4].forEach(col => {
                        row.getCell(col).alignment = { horizontal: 'right' };
                    });
                });
            }

            // 열 너비 조정
            summaryWs.getColumn(1).width = 40;
            summaryWs.getColumn(2).width = 30;
            summaryWs.getColumn(3).width = 15;
            summaryWs.getColumn(4).width = 15;

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

            // ===== Sheet 2: 시행 결과 (all_trials가 있을 경우) =====
            if (resultData.all_trials && resultData.all_trials.length > 0) {
                const trialsWs = wb.addWorksheet('시행 결과');
                const sortedTrials = [...resultData.all_trials].sort((a, b) => b.final_score - a.final_score);

                // 파라미터 키 목록 (첫 trial 기준)
                const paramKeys = sortedTrials[0]?.params ? Object.keys(sortedTrials[0].params) : [];

                // 헤더
                const trialHeaders = ['#', '수익률(%)', '승률(%)', '거래수', 'MDD(%)', 'Sharpe', '안정성', '점수', ...paramKeys.map(k => getParamLabel(k))];
                const trialHeaderRow = trialsWs.addRow(trialHeaders);
                trialHeaderRow.height = 20;
                trialHeaderRow.eachCell((cell) => {
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                });

                // 데이터 행
                sortedTrials.forEach((trial, index) => {
                    const paramValues = paramKeys.map(k => {
                        const v = trial.params?.[k];
                        return typeof v === 'number' ? v.toFixed(2) : (v ?? '-');
                    });

                    const row = trialsWs.addRow([
                        index + 1,
                        trial.total_return?.toFixed(2) ?? '-',
                        typeof trial.win_rate === 'number' ? trial.win_rate.toFixed(2) : (trial.win_rate ?? '-'),
                        trial.total_trades ?? '-',
                        typeof trial.max_drawdown === 'number' ? trial.max_drawdown.toFixed(2) : (trial.max_drawdown ?? '-'),
                        trial.sharpe_ratio?.toFixed(2) ?? '-',
                        trial.stability_score?.toFixed(2) ?? '-',
                        trial.final_score?.toFixed(2) ?? '-',
                        ...paramValues
                    ]);

                    // 1등 행 노란색 배경
                    if (index === 0) {
                        row.eachCell(cell => {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
                        });
                    }

                    // 수익률 색상 (2번째 셀)
                    if (trial.total_return != null) {
                        row.getCell(2).font = {
                            color: { argb: trial.total_return >= 0 ? 'FF00B050' : 'FFFF0000' },
                            bold: index === 0
                        };
                    }

                    // 숫자 컬럼 오른쪽 정렬
                    for (let col = 2; col <= row.cellCount; col++) {
                        row.getCell(col).alignment = { horizontal: 'right' };
                    }
                });

                // 열 너비 조정
                trialsWs.getColumn(1).width = 6;
                trialsWs.getColumn(2).width = 12;
                trialsWs.getColumn(3).width = 10;
                trialsWs.getColumn(4).width = 8;
                trialsWs.getColumn(5).width = 10;
                trialsWs.getColumn(6).width = 10;
                trialsWs.getColumn(7).width = 10;
                trialsWs.getColumn(8).width = 10;
                for (let i = 9; i <= 8 + paramKeys.length; i++) {
                    trialsWs.getColumn(i).width = 14;
                }

                // 테두리 추가
                trialsWs.eachRow((row) => {
                    row.eachCell(cell => {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    });
                });
            }

            const buf = await wb.xlsx.writeBuffer();
            const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const now = new Date();
            const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            const shortTaskId = taskId ? taskId.substring(0, 12) : 'unknown';
            a.download = `optimizer_${shortTaskId}_${timestamp}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('엑셀 내보내기 실패:', e);
            setToast('엑셀 내보내기 중 오류가 발생했습니다.');
        }
    };

    const handleExportText = (resultData, taskId) => {
        try {
            const lines = [];
            const now = new Date();
            const dateStr = now.toLocaleString('ko-KR');

            lines.push(`백테스트 옵티마이저 결과 (${dateStr})`);
            lines.push('='.repeat(50));
            lines.push(`Task ID: ${taskId || '-'}`);
            lines.push('');

            // 결과 요약
            lines.push('[결과 요약]');
            lines.push(`최고 점수: ${resultData.best_score?.toFixed(2) ?? '-'}`);
            lines.push(`최고 수익률: ${resultData.best_return?.toFixed(2) ?? '-'}%`);
            lines.push(`총 시행 횟수: ${resultData.total_trials || 0} (성공: ${resultData.completed_trials || 0} / 실패: ${resultData.failed_trials || 0})`);
            lines.push(`목표 달성: ${resultData.target_met_trials || 0}회`);
            lines.push(`소요 시간: ${resultData.elapsed_time_seconds?.toFixed(1) ?? '-'}초`);
            lines.push(`중단 사유: ${resultData.stop_reason || '-'}`);
            lines.push('');

            // 최적 파라미터
            if (resultData.best_params) {
                lines.push('[최적 파라미터]');
                Object.entries(resultData.best_params).forEach(([key, value]) => {
                    const formatted = typeof value === 'number' ? value.toFixed(2) : value;
                    lines.push(`${getParamLabel(key)} (${key}): ${formatted}`);
                });
                lines.push('');
            }

            // 고정 파라미터
            if (resultData.fixed_params) {
                lines.push('[고정 파라미터]');
                Object.entries(resultData.fixed_params).forEach(([key, value]) => {
                    const formatted = typeof value === 'number'
                        ? (key.includes('fee_rate') || Math.abs(value) < 0.01 ? value.toFixed(4) : value.toLocaleString())
                        : value;
                    lines.push(`${key}: ${formatted}`);
                });
                lines.push('');
            }

            // 파라미터 탐색 범위
            if (resultData.param_ranges) {
                lines.push('[파라미터 탐색 범위]');
                Object.entries(resultData.param_ranges).forEach(([key, range]) => {
                    lines.push(`${getParamLabel(key)} (${key}): ${range.min} ~ ${range.max} (step: ${range.step})`);
                });
                lines.push('');
            }

            // 시행 결과
            if (resultData.all_trials && resultData.all_trials.length > 0) {
                const sortedTrials = [...resultData.all_trials].sort((a, b) => b.final_score - a.final_score);
                lines.push(`[시행 결과 (${sortedTrials.length}개)]`);
                sortedTrials.forEach((trial, index) => {
                    const best = index === 0 ? ' [★]' : '';
                    const params = trial.params
                        ? Object.entries(trial.params).map(([k, v]) => `${k}=${typeof v === 'number' ? v.toFixed(2) : v}`).join(', ')
                        : '';
                    lines.push(`#${index + 1}${best} 수익률:${trial.total_return?.toFixed(2) ?? '-'}% 승률:${typeof trial.win_rate === 'number' ? trial.win_rate.toFixed(2) : (trial.win_rate ?? '-')}% 거래:${trial.total_trades ?? '-'} MDD:${typeof trial.max_drawdown === 'number' ? trial.max_drawdown.toFixed(2) : (trial.max_drawdown ?? '-')}% Sharpe:${trial.sharpe_ratio?.toFixed(2) ?? '-'} 안정성:${trial.stability_score?.toFixed(2) ?? '-'} 점수:${trial.final_score?.toFixed(2) ?? '-'}`);
                    if (params) {
                        lines.push(`  파라미터: ${params}`);
                    }
                });
            }

            const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            const shortTaskId = taskId ? taskId.substring(0, 12) : 'unknown';
            a.download = `optimizer_${shortTaskId}_${timestamp}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('텍스트 내보내기 실패:', e);
            setToast('텍스트 내보내기 중 오류가 발생했습니다.');
        }
    };

    const handleExportExploredTrialsCsv = (trials, targetMetTrials, taskId) => {
        try {
            if (!trials || trials.length === 0) return;
            const targetMetIds = new Set(targetMetTrials?.map(t => t.trial_id) || []);
            const paramKeys = trials[0]?.params ? Object.keys(trials[0].params) : [];

            const headers = ['trial_id', '목표달성', '수익률(%)', '점수', ...paramKeys.map(k => getParamLabel(k))];
            const rows = [...trials]
                .sort((a, b) => b.final_score - a.final_score)
                .map(t => {
                    const paramValues = paramKeys.map(k => {
                        const v = t.params?.[k];
                        return typeof v === 'number' ? v.toFixed(2) : (v ?? '');
                    });
                    return [
                        t.trial_id,
                        targetMetIds.has(t.trial_id) ? 'Y' : 'N',
                        t.total_return?.toFixed(2) ?? '',
                        t.final_score?.toFixed(2) ?? '',
                        ...paramValues
                    ];
                });

            const escapeCsv = (v) => {
                const s = String(v ?? '');
                return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
            };
            const csv = [headers.map(escapeCsv).join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\n');

            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const now = new Date();
            const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            const shortTaskId = taskId ? taskId.substring(0, 12) : 'unknown';
            a.download = `explored_trials_${shortTaskId}_${timestamp}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('CSV 내보내기 실패:', e);
            setToast('CSV 내보내기 중 오류가 발생했습니다.');
        }
    };

    const handleExportExploredTrialsExcel = async (trials, targetMetTrials, taskId) => {
        try {
            if (!trials || trials.length === 0) return;
            const targetMetIds = new Set(targetMetTrials?.map(t => t.trial_id) || []);
            const sortedTrials = [...trials].sort((a, b) => b.final_score - a.final_score);
            const paramKeys = sortedTrials[0]?.params ? Object.keys(sortedTrials[0].params) : [];

            const wb = new ExcelJS.Workbook();
            const ws = wb.addWorksheet('전체 탐색 시행');

            // 헤더
            const headers = ['#', '목표달성', '수익률(%)', '점수', ...paramKeys.map(k => getParamLabel(k))];
            const headerRow = ws.addRow(headers);
            headerRow.height = 20;
            headerRow.eachCell(cell => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });

            // 데이터
            sortedTrials.forEach((trial) => {
                const isMet = targetMetIds.has(trial.trial_id);
                const paramValues = paramKeys.map(k => {
                    const v = trial.params?.[k];
                    return typeof v === 'number' ? v.toFixed(2) : (v ?? '-');
                });

                const row = ws.addRow([
                    trial.trial_id,
                    isMet ? 'Y' : 'N',
                    trial.total_return?.toFixed(2) ?? '-',
                    trial.final_score?.toFixed(2) ?? '-',
                    ...paramValues
                ]);

                // 수익률 색상
                if (trial.total_return != null) {
                    row.getCell(3).font = { color: { argb: trial.total_return >= 0 ? 'FF00B050' : 'FFFF0000' } };
                }

                // 목표 달성 색상
                row.getCell(2).font = { color: { argb: isMet ? 'FF00B050' : 'FFFF0000' }, bold: true };

                // 미달 행 회색 배경
                if (!isMet) {
                    row.eachCell(cell => {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                    });
                }

                // 숫자 컬럼 오른쪽 정렬
                for (let col = 3; col <= row.cellCount; col++) {
                    row.getCell(col).alignment = { horizontal: 'right' };
                }
            });

            // 열 너비
            ws.getColumn(1).width = 8;
            ws.getColumn(2).width = 10;
            ws.getColumn(3).width = 12;
            ws.getColumn(4).width = 10;
            for (let i = 5; i <= 4 + paramKeys.length; i++) {
                ws.getColumn(i).width = 14;
            }

            // 테두리
            ws.eachRow(row => {
                row.eachCell(cell => {
                    cell.border = {
                        top: { style: 'thin' }, left: { style: 'thin' },
                        bottom: { style: 'thin' }, right: { style: 'thin' }
                    };
                });
            });

            const buf = await wb.xlsx.writeBuffer();
            const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const now = new Date();
            const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            const shortTaskId = taskId ? taskId.substring(0, 12) : 'unknown';
            a.download = `explored_trials_${shortTaskId}_${timestamp}.xlsx`;
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

    const getStatusBadge = (status) => {
        switch (status) {
            case 'running':
                return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 whitespace-nowrap">실행 중</span>;
            case 'completed':
                return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 whitespace-nowrap">완료</span>;
            case 'failed':
                return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 whitespace-nowrap">실패</span>;
            default:
                return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 whitespace-nowrap">{status}</span>;
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

    const getParamShortLabel = (key) => {
        const shorts = {
            min_up_probability: '확률',
            buy_profit_threshold: '매수',
            stop_loss_threshold: '손절',
            take_profit_buffer: '익절버퍼',
            min_profit_rate: '최소익절',
            max_profit_rate: '최대익절',
        };
        return shorts[key] || key;
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
                                        <Button size="sm" onClick={handleSelectAllFiltered}>
                                            전체 선택
                                        </Button>
                                        <Button size="sm" onClick={handleDeselectAllFiltered}>
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
                        {/* TPE 추천 실행 횟수 표시 */}
                        <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                            <div className="flex flex-col gap-1 text-sm">
                                <span className="text-slate-600 dark:text-slate-400">
                                    탐색 방식: <span className="font-semibold text-slate-800 dark:text-slate-200">TPE (Bayesian Optimization)</span>
                                </span>
                                <span className="text-slate-600 dark:text-slate-400">
                                    파라미터 <span className="font-semibold text-slate-800 dark:text-slate-200">{Object.keys(paramRanges).length}</span>종 · 추천 실행 횟수: <span className="font-semibold text-slate-800 dark:text-slate-200">{recommendedRuns.toLocaleString()}</span>회 <span className="text-xs">(높은 신뢰도)</span>
                                </span>
                                <span className="text-slate-600 dark:text-slate-400">
                                    현재 설정: <span className={`font-semibold ${
                                        maxRuns >= recommendedRuns ? 'text-emerald-600 dark:text-emerald-400' :
                                        maxRuns >= recommendedRuns * 0.5 ? 'text-amber-600 dark:text-amber-400' :
                                        'text-orange-600 dark:text-orange-400'
                                    }`}>{maxRuns.toLocaleString()}회</span>
                                    {' '}<span className={`text-xs ${
                                        maxRuns >= recommendedRuns ? 'text-emerald-600 dark:text-emerald-400' :
                                        maxRuns >= recommendedRuns * 0.5 ? 'text-amber-600 dark:text-amber-400' :
                                        'text-orange-600 dark:text-orange-400'
                                    }`}>(추천 대비 {(maxRuns / recommendedRuns * 100).toFixed(1)}%)</span>
                                </span>
                            </div>
                        </div>

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
                                        <Button size="sm" variant="secondary" onClick={handleResetTask}>
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
                                    <Button size="sm" variant="secondary" onClick={handleCheckStatus} disabled={loading}>
                                        상태 새로고침
                                    </Button>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={handleCancelOptimizer}
                                        disabled={loading}
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
                                <Button size="sm" variant="secondary" onClick={handleViewAllTrials}>
                                    모든 시행 결과 보기
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => handleExportExcel(taskResult, runningTaskId)}>
                                    엑셀 저장
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => handleExportText(taskResult, runningTaskId)}>
                                    텍스트 저장
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
                    {renderAllTrials && detailResult?.data?.all_trials && (
                        <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4 animate__animated ${isAllTrialsClosing ? 'animate__fadeOut' : 'animate__fadeIn'}`} style={{ animationDuration: '0.25s' }}>
                            <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col animate__animated ${isAllTrialsClosing ? 'animate__zoomOut' : 'animate__zoomIn'}`} style={{ animationDuration: '0.25s' }}>
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
                                                                        <span className="text-slate-500 dark:text-slate-400">{getParamShortLabel(k)}</span>{' '}{typeof v === 'number' ? v.toFixed(2) : v}
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
                                옵티마이저 이력 ({historyList.length})
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
                                <Button size="sm" variant="secondary" onClick={() => fetchHistory()} disabled={loading}>
                                    {loading ? '조회 중...' : '새로고침'}
                                </Button>
                            </div>
                        </div>

                        {/* 선택 상태 배너 */}
                        {selectedHistoryIds.length > 0 && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-blue-700 dark:text-blue-300">
                                        {selectedHistoryIds.length}개 항목 선택됨
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={handleDeselectAll}>
                                            선택 취소
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={handleDeleteSelected}
                                        >
                                            선택 삭제
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

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
                                            className={`border rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 ${selectedHistoryIds.includes(item.task_id) ? 'border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-600'}`}
                                        >
                                            {/* 체크박스 + 제목 */}
                                            <div className="flex items-start gap-2 mb-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedHistoryIds.includes(item.task_id)}
                                                    onChange={() => handleHistorySelect(item.task_id)}
                                                    className="w-4 h-4 mt-1 cursor-pointer shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                            {editingTitleTaskId === item.task_id ? (
                                                <input
                                                    type="text"
                                                    value={editingTitleValue}
                                                    onChange={(e) => setEditingTitleValue(e.target.value)}
                                                    onBlur={() => handleSaveTitle(item.task_id)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(item.task_id); if (e.key === 'Escape') setEditingTitleTaskId(null); }}
                                                    maxLength={200}
                                                    autoFocus
                                                    className="w-full px-2 py-1 mb-2 rounded border border-blue-400 dark:border-blue-500 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    placeholder="제목 입력..."
                                                />
                                            ) : (
                                                <div
                                                    className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 min-h-[20px]"
                                                    onClick={() => handleStartEditTitle(item.task_id, item.title)}
                                                    title="클릭하여 제목 수정"
                                                >
                                                    {item.title || <span className="text-slate-400 dark:text-slate-500 italic text-xs">제목 없음 (클릭하여 추가)</span>}
                                                </div>
                                            )}
                                                </div>
                                            </div>
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
                                            {item.status === 'running' && historyRunningStatuses[item.task_id] ? (
                                                <div className="grid grid-cols-3 gap-2 mb-3">
                                                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded p-2">
                                                        <div className="text-xs text-blue-500 dark:text-blue-400">진행률</div>
                                                        <div className="font-semibold text-blue-700 dark:text-blue-300">
                                                            {historyRunningStatuses[item.task_id].progress || `${historyRunningStatuses[item.task_id].current_trial || 0}/${historyRunningStatuses[item.task_id].total_trials || '?'}`}
                                                        </div>
                                                    </div>
                                                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded p-2">
                                                        <div className="text-xs text-blue-500 dark:text-blue-400">최고 점수</div>
                                                        <div className="font-semibold text-blue-700 dark:text-blue-300">
                                                            {historyRunningStatuses[item.task_id].best_score?.toFixed(1) || '-'}
                                                        </div>
                                                    </div>
                                                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded p-2">
                                                        <div className="text-xs text-blue-500 dark:text-blue-400">최고 수익률</div>
                                                        <div className={`font-semibold ${(historyRunningStatuses[item.task_id].best_return ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                            {historyRunningStatuses[item.task_id].best_return != null ? `${historyRunningStatuses[item.task_id].best_return.toFixed(1)}%` : '-'}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
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
                                            )}
                                            {item.stop_reason && (
                                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                                    중단: {item.stop_reason}
                                                </div>
                                            )}
                                            <div className="flex gap-2 pt-2">
                                                {item.status === 'running' && (
                                                    <button
                                                        className="flex-1 px-4 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-amber-900/30 text-amber-600 dark:text-amber-200 text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
                                                        onClick={() => handleCancelTask(item.task_id)}
                                                        disabled={loading}
                                                    >
                                                        중지
                                                    </button>
                                                )}
                                                <button
                                                    className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                                                    onClick={() => handleOpenDetailModal(item.task_id)}
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
                                                <th className="px-3 py-3 text-left w-10">
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
                                                <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">상태</th>
                                                <th className="px-3 py-3 text-left font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap min-w-[120px]">제목</th>
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
                                            {historyList.map((item) => {
                                                const runStatus = item.status === 'running' ? historyRunningStatuses[item.task_id] : null;
                                                return (
                                                <tr key={item.task_id} className={`border-b border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 ${selectedHistoryIds.includes(item.task_id) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''} ${item.status === 'running' ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedHistoryIds.includes(item.task_id)}
                                                            onChange={() => handleHistorySelect(item.task_id)}
                                                            className="w-4 h-4 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-3 whitespace-nowrap">
                                                        <div className="flex flex-col gap-1">
                                                            {getStatusBadge(item.status)}
                                                            {runStatus && (
                                                                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">
                                                                    {runStatus.progress || `${runStatus.current_trial || 0}/${runStatus.total_trials || '?'}`}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        {editingTitleTaskId === item.task_id ? (
                                                            <input
                                                                type="text"
                                                                value={editingTitleValue}
                                                                onChange={(e) => setEditingTitleValue(e.target.value)}
                                                                onBlur={() => handleSaveTitle(item.task_id)}
                                                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(item.task_id); if (e.key === 'Escape') setEditingTitleTaskId(null); }}
                                                                maxLength={200}
                                                                autoFocus
                                                                className="w-full px-2 py-1 rounded border border-blue-400 dark:border-blue-500 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                placeholder="제목 입력..."
                                                            />
                                                        ) : (
                                                            <span
                                                                className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                                                onClick={() => handleStartEditTitle(item.task_id, item.title)}
                                                                title="클릭하여 제목 수정"
                                                            >
                                                                {item.title || <span className="text-slate-400 dark:text-slate-500 italic text-xs">-</span>}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                        <div className="flex flex-nowrap gap-1">
                                                            {item.coin_codes?.slice(0, 3).map(code => (
                                                                <span key={code} className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded whitespace-nowrap">
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
                                                        {runStatus ? (runStatus.best_score?.toFixed(2) || '-') : (item.best_score?.toFixed(2) || '-')}
                                                    </td>
                                                    <td className={`px-3 py-3 text-right font-medium whitespace-nowrap ${(runStatus ? runStatus.best_return : item.best_return) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        {runStatus
                                                            ? (runStatus.best_return != null ? `${runStatus.best_return.toFixed(2)}%` : '-')
                                                            : (item.best_return != null ? `${item.best_return.toFixed(2)}%` : '-')
                                                        }
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
                                                            onClick={() => handleOpenDetailModal(item.task_id)}
                                                            disabled={loading}
                                                        >
                                                            상세
                                                        </button>
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        {item.status === 'running' ? (
                                                            <button
                                                                className="text-amber-600 dark:text-amber-200 hover:text-amber-700 dark:hover:text-white bg-amber-50 dark:bg-amber-900/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-50"
                                                                onClick={() => handleCancelTask(item.task_id)}
                                                                disabled={loading}
                                                            >
                                                                중지
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="text-red-600 dark:text-red-200 hover:text-red-700 dark:hover:text-white bg-red-50 dark:bg-red-900/40 hover:bg-red-100 dark:hover:bg-red-900/60 px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-50"
                                                                onClick={() => handleDeleteResult(item.task_id)}
                                                                disabled={loading}
                                                            >
                                                                삭제
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                                );
                                            })}
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
                                onClick={() => {
                                    if (!selectedDetailTaskId) {
                                        setToast('Task ID를 입력해주세요.');
                                        return;
                                    }
                                    handleOpenDetailModal(selectedDetailTaskId);
                                }}
                                disabled={loading}
                            >
                                {loading ? '조회 중...' : '결과 조회'}
                            </Button>
                        </div>
                    </div>

                </div>
            )}

            {/* 상세 결과 모달 */}
            {renderDetailModal && (
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate__animated ${isDetailModalClosing ? 'animate__fadeOut' : 'animate__fadeIn'}`}
                    style={{ animationDuration: '0.25s' }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsDetailModalOpen(false);
                    }}
                >
                    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[80vh] sm:max-h-[90vh] overflow-hidden flex flex-col my-4 animate__animated ${isDetailModalClosing ? 'animate__zoomOut' : 'animate__zoomIn'}`} style={{ animationDuration: '0.25s' }}>
                        {/* 헤더 */}
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                    옵티마이저 상세 결과
                                </h3>
                                {detailResult && (
                                    <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                                        <TogglableTaskId taskId={detailResult.taskId} maxLength={20} />
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {detailResult && (
                                    <>
                                        <Button size="sm" variant="secondary" onClick={() => handleExportExcel(detailResult.data, detailResult.taskId)}>
                                            엑셀 저장
                                        </Button>
                                        <Button size="sm" variant="secondary" onClick={() => handleExportText(detailResult.data, detailResult.taskId)}>
                                            텍스트 저장
                                        </Button>
                                    </>
                                )}
                                <button
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* 콘텐츠 */}
                        <div className="flex-1 overflow-auto p-6">
                            {loading && !detailResult ? (
                                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                                    조회 중...
                                </div>
                            ) : detailResult ? (
                                <div className="space-y-6">
                                    {/* 최적 파라미터 */}
                                    <div>
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
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                                        <div>
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
                                        <div>
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

                                    {/* 파라미터 탐색 시각화 */}
                                    {(detailResult.data.all_explored_trials?.length > 0 || detailResult.data.all_trials?.length > 0) && detailResult.data.param_ranges && (
                                        <ParamExplorationChart
                                            allTrials={detailResult.data.all_explored_trials?.length > 0 ? detailResult.data.all_explored_trials : detailResult.data.all_trials}
                                            paramRanges={detailResult.data.param_ranges}
                                            bestParams={detailResult.data.best_params}
                                            getParamLabel={getParamLabel}
                                        />
                                    )}

                                    {/* 모든 시행 결과 */}
                                    {(() => {
                                        const exploredTrials = detailResult.data.all_explored_trials;
                                        const targetMetTrials = detailResult.data.all_trials;
                                        const showAllExplored = exploredTrials?.length > 0;
                                        const sourceTrials = showAllExplored ? exploredTrials : targetMetTrials;
                                        if (!sourceTrials || sourceTrials.length === 0) return null;

                                        const targetMetIds = new Set(targetMetTrials?.map(t => t.trial_id) || []);

                                        // 필터 적용
                                        const filteredTrials = showAllExplored
                                            ? sourceTrials.filter(t => {
                                                if (exploredTrialFilter === 'met') return targetMetIds.has(t.trial_id);
                                                if (exploredTrialFilter === 'unmet') return !targetMetIds.has(t.trial_id);
                                                return true;
                                            })
                                            : sourceTrials;

                                        // 정렬 적용
                                        const sortedTrials = [...filteredTrials].sort((a, b) => {
                                            const key = showAllExplored ? exploredTrialSortKey : 'final_score';
                                            const dir = showAllExplored ? exploredTrialSortDir : 'desc';
                                            const av = a[key] ?? 0;
                                            const bv = b[key] ?? 0;
                                            return dir === 'desc' ? bv - av : av - bv;
                                        });

                                        const handleSortClick = (key) => {
                                            if (exploredTrialSortKey === key) {
                                                setExploredTrialSortDir(d => d === 'desc' ? 'asc' : 'desc');
                                            } else {
                                                setExploredTrialSortKey(key);
                                                setExploredTrialSortDir('desc');
                                            }
                                        };

                                        const SortIcon = ({ colKey }) => {
                                            if (exploredTrialSortKey !== colKey) return <span className="ml-0.5 text-slate-300 dark:text-slate-600 text-[10px]">&#x2195;</span>;
                                            return <span className="ml-0.5 text-blue-500 text-[10px]">{exploredTrialSortDir === 'desc' ? '\u25BC' : '\u25B2'}</span>;
                                        };

                                        return (
                                        <div>
                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                                <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                    {showAllExplored ? '전체 탐색 시행' : '목표 달성 시행'} 결과 ({filteredTrials.length}개{showAllExplored && filteredTrials.length !== sourceTrials.length ? ` / ${sourceTrials.length}` : ''})
                                                    {showAllExplored && targetMetTrials?.length > 0 && exploredTrialFilter === 'all' && (
                                                        <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
                                                            목표 달성: {targetMetTrials.length}개
                                                        </span>
                                                    )}
                                                </h4>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {showAllExplored && (
                                                        <div className="flex items-center gap-1">
                                                            {[
                                                                { key: 'all', label: '전체' },
                                                                { key: 'met', label: '달성' },
                                                                { key: 'unmet', label: '미달' },
                                                            ].map(({ key, label }) => (
                                                                <button
                                                                    key={key}
                                                                    onClick={() => setExploredTrialFilter(key)}
                                                                    className={`px-2 py-0.5 text-xs rounded whitespace-nowrap transition-colors ${
                                                                        exploredTrialFilter === key
                                                                            ? 'bg-blue-500 text-white'
                                                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                                                                    }`}
                                                                >
                                                                    {label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1 ml-1">
                                                        <button
                                                            onClick={() => handleExportExploredTrialsCsv(filteredTrials, targetMetTrials, detailResult.taskId)}
                                                            className="px-2 py-0.5 text-xs rounded whitespace-nowrap bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                                        >
                                                            CSV
                                                        </button>
                                                        <button
                                                            onClick={() => handleExportExploredTrialsExcel(filteredTrials, targetMetTrials, detailResult.taskId)}
                                                            className="px-2 py-0.5 text-xs rounded whitespace-nowrap bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                                        >
                                                            Excel
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="overflow-x-auto max-h-96 overflow-y-auto">
                                                {showAllExplored ? (
                                                <table className="w-full text-sm">
                                                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-700 shadow-[0_1px_0_0_rgb(148,163,184)]  dark:shadow-[0_1px_0_0_rgb(71,85,105)]">
                                                        <tr>
                                                            <th className="px-2 py-2 text-left font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap cursor-pointer select-none hover:text-blue-500" onClick={() => handleSortClick('trial_id')}>
                                                                #<SortIcon colKey="trial_id" />
                                                            </th>
                                                            <th className="px-2 py-2 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap cursor-pointer select-none hover:text-blue-500" onClick={() => handleSortClick('total_return')}>
                                                                수익률<SortIcon colKey="total_return" />
                                                            </th>
                                                            <th className="px-2 py-2 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap cursor-pointer select-none hover:text-blue-500" onClick={() => handleSortClick('final_score')}>
                                                                점수<SortIcon colKey="final_score" />
                                                            </th>
                                                            <th className="px-2 py-2 text-center font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">파라미터</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {sortedTrials.map((trial) => {
                                                                const isTargetMet = targetMetIds.has(trial.trial_id);
                                                                return (
                                                                <tr
                                                                    key={trial.trial_id}
                                                                    className={`border-b border-slate-200 dark:border-slate-600 ${!isTargetMet ? 'opacity-60' : ''}`}
                                                                >
                                                                    <td className="px-2 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                                        {trial.trial_id}
                                                                        {isTargetMet && <span className="ml-1 text-xs text-green-500" title="목표 달성">&#10003;</span>}
                                                                        {!isTargetMet && <span className="ml-1 text-xs text-slate-400" title="목표 미달">&#10005;</span>}
                                                                    </td>
                                                                    <td className={`px-2 py-2 text-right font-medium whitespace-nowrap ${trial.total_return >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                        {trial.total_return?.toFixed(2)}%
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
                                                                                    <span className="text-slate-500 dark:text-slate-400">{getParamShortLabel(k)}</span>{' '}{typeof v === 'number' ? v.toFixed(2) : v}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                );
                                                            })}
                                                    </tbody>
                                                </table>
                                                ) : (
                                                <table className="w-full text-sm min-w-[800px]">
                                                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-700 shadow-[0_1px_0_0_rgb(148,163,184)] dark:shadow-[0_1px_0_0_rgb(71,85,105)]">
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
                                                        {sortedTrials.map((trial, index) => (
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
                                                                                    <span className="text-slate-500 dark:text-slate-400">{getParamShortLabel(k)}</span>{' '}{typeof v === 'number' ? v.toFixed(2) : v}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                                )}
                                            </div>
                                        </div>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                                    결과를 불러올 수 없습니다.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 실행 확인 모달 */}
            {renderRunConfirm && (
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate__animated ${isRunConfirmClosing ? 'animate__fadeOut' : 'animate__fadeIn'}`} style={{ animationDuration: '0.25s' }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsRunConfirmModalOpen(false);
                    }}
                >
                    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg my-4 animate__animated ${isRunConfirmClosing ? 'animate__zoomOut' : 'animate__zoomIn'}`} style={{ animationDuration: '0.25s' }}>
                        {/* 헤더 */}
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                옵티마이저 실행 확인
                            </h3>
                        </div>

                        {/* 콘텐츠 */}
                        <div className="px-6 py-4 space-y-4">
                            {/* 제목 입력 */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    제목 (선택)
                                </label>
                                <input
                                    type="text"
                                    value={runTitle}
                                    onChange={(e) => setRunTitle(e.target.value)}
                                    placeholder="실행 목적이나 메모를 입력하세요"
                                    maxLength={200}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

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
                            <Button variant="secondary" onClick={() => setIsRunConfirmModalOpen(false)}>
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
            {renderDeleteConfirm && (
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate__animated ${isDeleteConfirmClosing ? 'animate__fadeOut' : 'animate__fadeIn'}`} style={{ animationDuration: '0.25s' }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsDeleteConfirmModalOpen(false);
                    }}
                >
                    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md animate__animated ${isDeleteConfirmClosing ? 'animate__zoomOut' : 'animate__zoomIn'}`} style={{ animationDuration: '0.25s' }}>
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
                                variant="secondary"
                                onClick={() => {
                                    setIsDeleteConfirmModalOpen(false);
                                    setDeleteTargetTaskId(null);
                                }}
                            >
                                취소
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleConfirmDelete}
                            >
                                삭제
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* 선택 삭제 확인 모달 */}
            {renderDeleteSelected && (
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 animate__animated ${isDeleteSelectedClosing ? 'animate__fadeOut' : 'animate__fadeIn'}`} style={{ animationDuration: '0.25s' }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsDeleteSelectedModalOpen(false);
                    }}
                >
                    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md animate__animated ${isDeleteSelectedClosing ? 'animate__zoomOut' : 'animate__zoomIn'}`} style={{ animationDuration: '0.25s' }}>
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                선택 항목 삭제
                            </h3>
                        </div>

                        <div className="px-6 py-4 space-y-4">
                            <p className="text-slate-700 dark:text-slate-300">
                                선택한 {selectedHistoryIds.length}개의 옵티마이저 결과를 삭제하시겠습니까?
                            </p>
                            <div className="text-xs text-slate-500 dark:text-slate-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                                ⚠️ 삭제된 데이터는 복구할 수 없습니다.
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-3 justify-end">
                            <Button variant="secondary" onClick={() => setIsDeleteSelectedModalOpen(false)}>
                                취소
                            </Button>
                            <Button variant="danger" onClick={handleConfirmDeleteSelected}>
                                삭제
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            <Toast message={toast} />
        </div>
    );
}
