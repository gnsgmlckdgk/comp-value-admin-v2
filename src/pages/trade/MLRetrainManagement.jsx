import { useState, useCallback, useEffect, useRef } from 'react';
import { send } from '@/util/ClientUtil';
import PageTitle from '@/component/common/display/PageTitle';
import Loading from '@/component/common/display/Loading';
import AlertModal from '@/component/layouts/common/popup/AlertModal';
import { RefreshCw, Play, Clock, CheckCircle2, XCircle, Brain, Server, Calendar, List } from 'lucide-react';

const POLL_INTERVAL = 3000;

/** 시가총액 포맷 (1.2T, 800B, 50M) */
const formatMarketCap = (cap) => {
    if (!cap) return '-';
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(0)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(0)}M`;
    return `$${cap.toLocaleString()}`;
};

/** 시총 구간 뱃지 */
const CAP_BADGE = {
    large: { label: '대형', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
    mid: { label: '중형', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    small: { label: '소형', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
};

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
const ProgressBar = ({ completed, total }) => {
    if (!total) return null;
    const pct = Math.round((completed / total) * 100);
    return (
        <div className="w-full">
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span>{completed} / {total} 종목</span>
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

/** 섹터별 종목 테이블 (시가총액 포함) */
const SectorTargetTable = ({ sectors, isDetailed }) => {
    if (!sectors || Object.keys(sectors).length === 0) return null;

    const sectorEntries = Object.entries(sectors);
    const totalCount = sectorEntries.reduce((s, [, v]) => s + (Array.isArray(v) ? v.length : 0), 0);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gradient-to-r from-slate-700 to-slate-600 text-white">
                        <th className="px-4 py-2.5 text-left font-medium w-48">섹터 ({sectorEntries.length})</th>
                        <th className="px-4 py-2.5 text-left font-medium">종목 ({totalCount}개)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {sectorEntries.map(([sector, stocks]) => (
                        <tr key={sector} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap align-top">
                                {sector}
                                <span className="ml-1.5 text-xs text-slate-400">({Array.isArray(stocks) ? stocks.length : 0})</span>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1.5">
                                    {Array.isArray(stocks) && stocks.map(stock => {
                                        // stock이 문자열(티커만) 또는 객체(상세정보) 둘 다 지원
                                        const symbol = typeof stock === 'string' ? stock : stock.symbol;
                                        const name = typeof stock === 'object' ? stock.companyName : null;
                                        const cap = typeof stock === 'object' ? stock.marketCap : null;
                                        const capSize = typeof stock === 'object' ? stock.capSize : null;

                                        return (
                                            <span
                                                key={symbol}
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-xs"
                                                title={name ? `${name} (${formatMarketCap(cap)})` : symbol}
                                            >
                                                {isDetailed && capSize && CAP_BADGE[capSize] && (
                                                    <span className={`px-1 py-0.5 rounded text-[10px] font-medium ${CAP_BADGE[capSize].cls}`}>
                                                        {CAP_BADGE[capSize].label}
                                                    </span>
                                                )}
                                                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{symbol}</span>
                                                {isDetailed && cap && (
                                                    <span className="text-slate-400 dark:text-slate-500">{formatMarketCap(cap)}</span>
                                                )}
                                            </span>
                                        );
                                    })}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const MLRetrainManagement = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [targets, setTargets] = useState(null);
    const [targetsLoading, setTargetsLoading] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ open: false, message: '', onConfirm: null });
    const pollRef = useRef(null);

    const openAlert = (message, onConfirm) => setAlertConfig({ open: true, message, onConfirm: onConfirm || null });
    const handleCloseAlert = () => setAlertConfig({ open: false, message: '', onConfirm: null });

    /** CommonResponse에서 ML 데이터 파싱 */
    const parseMlResponse = (data) => {
        if (!data?.response) return null;
        return typeof data.response === 'string' ? JSON.parse(data.response) : data.response;
    };

    /** 상태 조회 */
    const fetchStatus = useCallback(async () => {
        try {
            const { data, error } = await send('/dart/ml/retrain/status', {}, 'GET');
            if (!error && data) {
                const mlData = parseMlResponse(data);
                if (mlData) setStatus(mlData);
            }
        } catch {
            // 연결 실패 시 무시
        }
    }, []);

    /** 대상 종목 조회 (FMP Stock Screener 실시간) */
    const fetchTargets = useCallback(async () => {
        setTargetsLoading(true);
        try {
            const { data, error } = await send('/dart/ml/retrain/targets', {}, 'GET');
            if (!error && data) {
                const mlData = parseMlResponse(data);
                if (mlData) setTargets(mlData);
            }
        } catch {
            // 연결 실패 시 무시
        } finally {
            setTargetsLoading(false);
        }
    }, []);

    /** 재학습 시작 */
    const startRetrain = useCallback(async () => {
        setIsLoading(true);
        try {
            const { error } = await send('/dart/ml/retrain', {}, 'POST');
            if (error) {
                openAlert(error);
                return;
            }
            openAlert('재학습이 시작되었습니다. 약 30분 소요됩니다.');
            await fetchStatus();
        } catch {
            openAlert('재학습 시작에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [fetchStatus]);

    /** 재학습 시작 확인 */
    const handleRetrainClick = useCallback(() => {
        openAlert(
            `${targets?.total || '~165'}개 종목 데이터를 통합하여 재학습을 시작합니다.\n(11개 섹터 × 대형/중형/소형 각 5개)\n\n진행하시겠습니까?`,
            startRetrain
        );
    }, [startRetrain, targets]);

    /** 초기 로드 + 폴링 */
    useEffect(() => {
        fetchStatus();
        fetchTargets();

        pollRef.current = setInterval(fetchStatus, POLL_INTERVAL);
        return () => clearInterval(pollRef.current);
    }, [fetchStatus, fetchTargets]);

    const isRunning = status?.state === 'running';
    const isCompleted = status?.state === 'completed';
    const isFailed = status?.state === 'failed';

    const formatElapsed = (seconds) => {
        if (!seconds) return '-';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m > 0 ? `${m}분 ${s}초` : `${s}초`;
    };

    // 표시할 섹터 데이터: targets(상세) 우선, 없으면 status.sectors(간략)
    const displaySectors = targets?.sectors || status?.sectors;
    const isDetailedSectors = !!targets?.sectors;

    return (
        <>
            <PageTitle />
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
                AI 주가 예측 통합 모델을 재학습합니다. 11개 GICS 섹터 × 대형/중형/소형 각 5개 (약 165개) 종목 데이터를
                통합하여 단일 LSTM + LightGBM 앙상블 모델을 학습합니다.
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
                    sub={isRunning ? (
                        status?.phase === 'training'
                            ? '통합 모델 학습 중...'
                            : status?.current_ticker ? `데이터 수집: ${status.current_ticker}` : null
                    ) : null}
                />
                <InfoCard
                    icon={CheckCircle2}
                    label="성공 / 실패"
                    value={status ? `${status.success || 0} / ${status.fail || 0}` : '-'}
                    sub={status?.total ? `총 ${status.total}개 대상` : null}
                />
                <InfoCard
                    icon={Calendar}
                    label="자동 재학습"
                    value="매주 일요일"
                    sub="새벽 5:00 (KST)"
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
                        <div>수집: 성공 {status.success || 0} / 실패 {status.fail || 0}</div>
                        {status.total_samples > 0 && <div>학습 샘플: {status.total_samples.toLocaleString()}개</div>}
                    </div>
                </div>
            )}

            {/* 액션 버튼 */}
            <div className="flex gap-3 mb-4">
                <button
                    onClick={handleRetrainClick}
                    disabled={isLoading || isRunning}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-sm font-medium hover:from-sky-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                    <Play size={16} />
                    {isRunning ? '학습 진행 중...' : '재학습 시작'}
                </button>
                <button
                    onClick={fetchTargets}
                    disabled={targetsLoading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                    <RefreshCw size={16} className={targetsLoading ? 'animate-spin' : ''} />
                    대상 종목 새로고침
                </button>
            </div>

            {/* 학습 정보 */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Server size={16} />
                    학습 정보
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {[
                        ['모델 아키텍처', 'LSTM + LightGBM 앙상블'],
                        ['학습 데이터', '최근 5년 일봉'],
                        ['예측 기간', '향후 7일 최고가/최저가'],
                        ['피처', '20개 스케일 독립 지표 (v3.0)'],
                        ['자동 재학습', '매주 일요일 05:00'],
                        ['자동 평가', '매주 월요일 06:00'],
                        ['대상 종목', `${targets?.total || '~165'}개 (11개 섹터 × 3구간 × ${targets?.stocks_per_cap || 5}개)`],
                        ['예상 소요', 'GPU 기준 약 30분'],
                    ].map(([label, value]) => (
                        <div key={label} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                            <span className="text-slate-500 dark:text-slate-400">{label}</span>
                            <span className="text-slate-900 dark:text-white font-medium">{value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 섹터별 학습 대상 종목 */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <List size={16} />
                        학습 대상 종목
                        {isDetailedSectors && (
                            <span className="text-xs font-normal text-slate-400 dark:text-slate-500">(시가총액순, 실시간 조회)</span>
                        )}
                    </h3>
                    {targetsLoading && (
                        <span className="text-xs text-slate-400 animate-pulse">조회 중...</span>
                    )}
                </div>
                {displaySectors && Object.keys(displaySectors).length > 0 ? (
                    <SectorTargetTable sectors={displaySectors} isDetailed={isDetailedSectors} />
                ) : (
                    <div className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                        {targetsLoading ? '대상 종목 조회 중...' : '대상 종목 정보가 없습니다. 새로고침을 눌러주세요.'}
                    </div>
                )}
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

export default MLRetrainManagement;
