import { useState, useCallback, useEffect, useRef } from 'react';
import { send } from '@/util/ClientUtil';
import PageTitle from '@/component/common/display/PageTitle';
import Loading from '@/component/common/display/Loading';
import AlertModal from '@/component/layouts/common/popup/AlertModal';
import { RefreshCw, Play, Clock, CheckCircle2, XCircle, Brain, Server, Calendar } from 'lucide-react';

const POLL_INTERVAL = 3000; // 3초마다 상태 폴링

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
const InfoCard = ({ icon, label, value, sub, className = '' }) => {
    const Icon = icon;
    return (<div className={`flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 ${className}`}>
        <div className="flex-shrink-0 p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
            <Icon size={18} className="text-slate-500 dark:text-slate-400" />
        </div>
        <div className="min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5 truncate">{value || '-'}</p>
            {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
        </div>
    </div>);
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

/** 섹터 테이블 */
const SectorTable = ({ sectors }) => {
    if (!sectors || Object.keys(sectors).length === 0) return null;

    const sectorEntries = Object.entries(sectors);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gradient-to-r from-slate-700 to-slate-600 text-white">
                        <th className="px-4 py-2.5 text-left font-medium">섹터</th>
                        <th className="px-4 py-2.5 text-left font-medium">종목 ({sectorEntries.reduce((s, [, v]) => s + v.length, 0)}개)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {sectorEntries.map(([sector, tickers]) => (
                        <tr key={sector} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                            <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">{sector}</td>
                            <td className="px-4 py-2.5">
                                <div className="flex flex-wrap gap-1.5">
                                    {tickers.map(t => (
                                        <span key={t} className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300">
                                            {t}
                                        </span>
                                    ))}
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
    const [alertConfig, setAlertConfig] = useState({ open: false, message: '', onConfirm: null });
    const pollRef = useRef(null);

    const openAlert = (message, onConfirm) => setAlertConfig({ open: true, message, onConfirm: onConfirm || null });
    const handleCloseAlert = () => setAlertConfig({ open: false, message: '', onConfirm: null });

    /** 상태 조회 */
    const fetchStatus = useCallback(async () => {
        try {
            const { data, error } = await send('/ml/retrain/status', {}, 'GET');
            if (!error && data) {
                setStatus(data);
            }
        } catch {
            // 연결 실패 시 무시 (ML 서비스 미실행 가능)
        }
    }, []);

    /** 재학습 시작 */
    const startRetrain = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await send('/ml/retrain', {}, 'POST');
            if (error) {
                openAlert(error);
                return;
            }
            openAlert('재학습이 시작되었습니다. 약 30분 소요됩니다.');
            // 즉시 상태 갱신
            await fetchStatus();
        } catch (e) {
            openAlert('재학습 시작에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [fetchStatus]);

    /** 재학습 시작 확인 */
    const handleRetrainClick = useCallback(() => {
        openAlert(
            '11개 섹터 × 5개 종목 (약 55개)에 대해 재학습을 시작합니다.\nGPU 기준 약 30분 소요됩니다.\n\n진행하시겠습니까?',
            startRetrain
        );
    }, [startRetrain]);

    /** 폴링 — running 상태일 때만 */
    useEffect(() => {
        fetchStatus();

        pollRef.current = setInterval(fetchStatus, POLL_INTERVAL);
        return () => clearInterval(pollRef.current);
    }, [fetchStatus]);

    const isRunning = status?.state === 'running';
    const isCompleted = status?.state === 'completed';
    const isFailed = status?.state === 'failed';

    // 경과 시간 포맷
    const formatElapsed = (seconds) => {
        if (!seconds) return '-';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m > 0 ? `${m}분 ${s}초` : `${s}초`;
    };

    return (
        <>
            <PageTitle />
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
                AI 주가 예측 모델을 재학습합니다. 11개 GICS 섹터별 시가총액 상위 5개 종목 (약 55개)을 대상으로
                LSTM + LightGBM 앙상블 모델을 학습합니다.
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
                    sub={isRunning && status?.current_ticker ? `현재: ${status.current_ticker}` : null}
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

            {/* 진행률 (학습 중일 때) */}
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
                    onClick={fetchStatus}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                >
                    <RefreshCw size={16} className={isRunning ? 'animate-spin' : ''} />
                    새로고침
                </button>
            </div>

            {/* 학습 스케줄 안내 */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Server size={16} />
                    학습 정보
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-slate-500 dark:text-slate-400">모델 아키텍처</span>
                        <span className="text-slate-900 dark:text-white font-medium">LSTM + LightGBM 앙상블</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-slate-500 dark:text-slate-400">학습 데이터</span>
                        <span className="text-slate-900 dark:text-white font-medium">최근 5년 일봉</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-slate-500 dark:text-slate-400">예측 기간</span>
                        <span className="text-slate-900 dark:text-white font-medium">향후 7일 최고가/최저가</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-slate-500 dark:text-slate-400">피처</span>
                        <span className="text-slate-900 dark:text-white font-medium">20개 스케일 독립 지표 (v3.0)</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-slate-500 dark:text-slate-400">자동 재학습</span>
                        <span className="text-slate-900 dark:text-white font-medium">매주 일요일 05:00</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-slate-500 dark:text-slate-400">자동 평가</span>
                        <span className="text-slate-900 dark:text-white font-medium">매주 월요일 06:00</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-slate-500 dark:text-slate-400">대상 종목</span>
                        <span className="text-slate-900 dark:text-white font-medium">11개 섹터 × 5개 = ~55개</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-slate-500 dark:text-slate-400">예상 소요</span>
                        <span className="text-slate-900 dark:text-white font-medium">GPU 기준 약 30분</span>
                    </div>
                </div>
            </div>

            {/* 섹터별 학습 대상 종목 */}
            {status?.sectors && Object.keys(status.sectors).length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <Brain size={16} />
                            학습 대상 종목 (섹터별 시총 상위 5개)
                        </h3>
                    </div>
                    <SectorTable sectors={status.sectors} />
                </div>
            )}

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
