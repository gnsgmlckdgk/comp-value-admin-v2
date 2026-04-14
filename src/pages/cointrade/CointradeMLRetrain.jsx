import { useState, useCallback, useEffect, useRef } from 'react';
import { send } from '@/util/ClientUtil';
import PageTitle from '@/component/common/display/PageTitle';
import Loading from '@/component/common/display/Loading';
import AlertModal from '@/component/layouts/common/popup/AlertModal';
import { RefreshCw, Play, Clock, CheckCircle2, XCircle, Brain, Server, Calendar, TreeDeciduous } from 'lucide-react';

const POLL_INTERVAL = 3000;

/** 상태 뱃지 */
const StateBadge = ({ state }) => {
    const map = {
        idle: { label: '대기', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
        running: { label: '학습 중', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 animate-pulse' },
        completed: { label: '완료', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
        failed: { label: '실패', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    };
    const { label, cls } = map[state] || map.idle;
    return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
};

/** 정보 카드 */
const InfoCard = ({ icon, label, value, sub }) => {
    const Icon = icon;
    return (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700">
            <div className="flex-shrink-0 p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                <Icon size={18} className="text-slate-500 dark:text-slate-400" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5 truncate">{value || '-'}</p>
                {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
};

/** 프로그레스 바 */
const ProgressBar = ({ completed, total, label }) => {
    if (!total) return null;
    const pct = Math.round((completed / total) * 100);
    return (
        <div className="w-full">
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span>{label || `${completed} / ${total} 종목`}</span>
                <span>{pct}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
};

const CointradeMLRetrain = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [modelStatus, setModelStatus] = useState(null);
    const [trainCoinCode, setTrainCoinCode] = useState('');
    const [alertConfig, setAlertConfig] = useState({ open: false, message: '', onConfirm: null });
    const pollRef = useRef(null);

    const openAlert = (message, onConfirm) => setAlertConfig({ open: true, message, onConfirm: onConfirm || null });
    const handleCloseAlert = () => setAlertConfig({ open: false, message: '', onConfirm: null });

    /** 재학습 진행률 상태 조회 */
    const fetchStatus = useCallback(async () => {
        try {
            const { data, error } = await send('/dart/api/cointrade/retrain/status', {}, 'GET');
            if (!error && data?.success && data?.response) {
                setStatus(data.response);
            }
        } catch {
            // 연결 실패 시 무시
        }
    }, []);

    /** 통합 모델 상태 조회 */
    const fetchModelStatus = useCallback(async () => {
        try {
            const { data, error } = await send('/dart/api/cointrade/model-status', {}, 'GET');
            if (!error && data?.success && data?.response) {
                setModelStatus(data.response);
            }
        } catch {
            // 연결 실패 시 무시
        }
    }, []);

    /** 재학습 시작 */
    const startRetrain = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = trainCoinCode.trim() ? { coin_code: trainCoinCode.trim() } : {};
            const { data, error } = await send('/dart/api/cointrade/trade/model/train', params, 'GET');
            if (error) {
                openAlert(error);
                return;
            }
            if (data?.success) {
                openAlert('재학습이 시작되었습니다.');
                setTrainCoinCode('');
                await fetchStatus();
            } else {
                openAlert(data?.message || '재학습 시작에 실패했습니다.');
            }
        } catch {
            openAlert('재학습 시작에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [fetchStatus, trainCoinCode]);

    /** 재학습 시작 확인 */
    const handleRetrainClick = useCallback(() => {
        const coinDesc = trainCoinCode.trim() || '활성화된 전체 종목';
        openAlert(
            `[${coinDesc}] 대상으로 재학습을 시작합니다.\n\n진행하시겠습니까?`,
            startRetrain
        );
    }, [startRetrain, trainCoinCode]);

    /** 초기 로드 + 폴링 */
    useEffect(() => {
        fetchStatus();
        fetchModelStatus();

        pollRef.current = setInterval(() => {
            fetchStatus();
            fetchModelStatus();
        }, POLL_INTERVAL);
        return () => clearInterval(pollRef.current);
    }, [fetchStatus, fetchModelStatus]);

    const isRunning = status?.state === 'running';
    const isCompleted = status?.state === 'completed';
    const isFailed = status?.state === 'failed';

    const formatElapsed = (seconds) => {
        if (!seconds) return '-';
        const s = Math.round(seconds);
        const m = Math.floor(s / 60);
        const rem = s % 60;
        return m > 0 ? `${m}분 ${rem}초` : `${rem}초`;
    };

    const FINETUNE_MAX_TREES = 5000;
    const numTrees = modelStatus?.num_trees || 0;
    const maxTrees = modelStatus?.max_trees || FINETUNE_MAX_TREES;

    return (
        <>
            <PageTitle />
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
                코인 자동매매 ML 모델을 관리합니다. 통합 LightGBM 모델의 사전 학습 및 미세 조정 상태를 모니터링합니다.
            </p>

            <Loading show={isLoading} />

            {/* 상태 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <InfoCard
                    icon={Brain}
                    label="학습 상태"
                    value={status ? <StateBadge state={status.state} /> : '-'}
                />
                <InfoCard
                    icon={Clock}
                    label="소요 시간"
                    value={formatElapsed(status?.elapsed_seconds)}
                    sub={isRunning && status?.current_coin ? `현재: ${status.current_coin}` : null}
                />
                <InfoCard
                    icon={CheckCircle2}
                    label="성공 / 실패"
                    value={status ? `${status.success || 0} / ${status.fail || 0}` : '-'}
                    sub={status?.total ? `총 ${status.total}개 대상` : null}
                />
                <InfoCard
                    icon={Calendar}
                    label="자동 학습"
                    value="매일 새벽 4:00"
                    sub="사전 학습 (전 종목)"
                />
            </div>

            {/* 진행률 */}
            {isRunning && status?.total > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 mb-4">
                    <ProgressBar completed={status.completed || 0} total={status.total} />
                </div>
            )}

            {/* 완료/실패 정보 */}
            {(isCompleted || isFailed) && status?.started_at && (
                <div className={`rounded-lg border p-4 mb-4 ${isCompleted
                        ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'
                        : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
                    }`}>
                    <div className="flex items-center gap-2 mb-2">
                        {isCompleted
                            ? <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                            : <XCircle size={16} className="text-amber-600 dark:text-amber-400" />}
                        <span className={`text-sm font-medium ${isCompleted ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                            {isCompleted ? '재학습 완료' : '재학습 실패'}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <div>시작: {status.started_at}</div>
                        <div>완료: {status.finished_at || '-'}</div>
                        <div>소요: {formatElapsed(status.elapsed_seconds)}</div>
                        <div>결과: 성공 {status.success || 0} / 실패 {status.fail || 0}</div>
                    </div>
                </div>
            )}

            {/* 통합 모델 상태 */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <TreeDeciduous size={16} />
                    통합 모델 상태
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700 text-sm">
                        <span className="text-slate-500 dark:text-slate-400">트리 수</span>
                        <span className="text-slate-900 dark:text-white font-medium">{numTrees.toLocaleString()} / {maxTrees.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700 text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Accuracy</span>
                        <span className="text-slate-900 dark:text-white font-medium">
                            {modelStatus?.accuracy != null ? `${(modelStatus.accuracy * 100).toFixed(1)}%` : '-'}
                        </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700 text-sm">
                        <span className="text-slate-500 dark:text-slate-400">AUC-ROC</span>
                        <span className="text-slate-900 dark:text-white font-medium">
                            {modelStatus?.auc_roc != null ? `${(modelStatus.auc_roc * 100).toFixed(1)}%` : '-'}
                        </span>
                    </div>
                </div>
                <ProgressBar
                    completed={numTrees}
                    total={maxTrees}
                    label={`트리 ${numTrees.toLocaleString()} / ${maxTrees.toLocaleString()} (과적합 게이지)`}
                />
                {modelStatus?.trained_at && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">마지막 학습: {modelStatus.trained_at}</p>
                )}
            </div>

            {/* 액션 버튼 + 종목코드 입력 */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">수동 재학습</h3>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                    <div className="flex-1 min-w-0">
                        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">종목코드 (선택)</label>
                        <input
                            type="text"
                            value={trainCoinCode}
                            onChange={(e) => setTrainCoinCode(e.target.value)}
                            placeholder="KRW-BTC,KRW-ETH (비워두면 전체)"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <button
                        onClick={handleRetrainClick}
                        disabled={isLoading || isRunning}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-sm font-medium hover:from-sky-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm whitespace-nowrap"
                    >
                        <Play size={16} />
                        {isRunning ? '학습 진행 중...' : '재학습 시작'}
                    </button>
                    <button
                        onClick={() => { fetchStatus(); fetchModelStatus(); }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors whitespace-nowrap"
                    >
                        <RefreshCw size={16} />
                        새로고침
                    </button>
                </div>
            </div>

            {/* 학습 정보 */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Server size={16} />
                    학습 정보
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {[
                        ['모델 아키텍처', 'LightGBM (통합 모델)'],
                        ['학습 방식', '사전학습 + 미세조정 (이중 구조)'],
                        ['사전 학습', '매일 04:00 / 300 트리 / lr=0.05'],
                        ['미세 조정', '매 스캔(180초) / 트리 1개 / lr=0.001'],
                        ['피처', '25개 기술적 지표 (RSI, VWAP, BB 등)'],
                        ['트리 상한', `${maxTrees.toLocaleString()}개 (과적합 방지)`],
                        ['학습 데이터', '분봉 기반 (기본 5분봉)'],
                        ['예측 대상', '향후 2시간 상승지속 확률'],
                    ].map(([label, value]) => (
                        <div key={label} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                            <span className="text-slate-500 dark:text-slate-400">{label}</span>
                            <span className="text-slate-900 dark:text-white font-medium text-right">{value}</span>
                        </div>
                    ))}
                </div>
            </div>

            <AlertModal
                open={alertConfig.open}
                message={alertConfig.message}
                onClose={handleCloseAlert}
                onConfirm={alertConfig.onConfirm}
            />
        </>
    );
};

export default CointradeMLRetrain;
