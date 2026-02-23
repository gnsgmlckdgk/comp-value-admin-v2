import { useMemo } from 'react';
import useMonitoringSSE from './hooks/useMonitoringSSE';
import ServiceStatusCard from './components/ServiceStatusCard';
import ProcessStatusPanel from './components/ProcessStatusPanel';
import TradeActivityFeed from './components/TradeActivityFeed';
import ServiceTopology from './components/ServiceTopology';
import ResourceGauges from './components/ResourceGauges';
import ResourceTimeSeries from './components/ResourceTimeSeries';

/**
 * 실시간 모니터링 대시보드 메인 페이지
 * 라이트/다크 모드 연계 — 사이트 ThemeContext 기반
 */
export default function MonitoringDashboard() {
    const { snapshot, trades, isConnected, isPaused, togglePause, resourceHistory, traffic } = useMonitoringSSE();

    const services = snapshot?.services || [];
    const resources = snapshot?.resources || null;

    // 리소스 압박 수준: 0=정상, 1=경고(>70%), 2=위험(>90%)
    const pressureLevel = useMemo(() => {
        if (!resources?.containers?.length) return 0;
        const maxCpu = Math.max(...resources.containers.map(c => c.cpuPercent || 0));
        const memPercents = resources.containers.map(c =>
            c.memoryLimitMB > 0 ? (c.memoryMB / c.memoryLimitMB) * 100 : 0
        );
        const maxMem = Math.max(...memPercents);
        const peak = Math.max(maxCpu, maxMem);
        if (peak > 90) return 2;
        if (peak > 70) return 1;
        return 0;
    }, [resources]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Real-Time Monitoring</div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={togglePause}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isPaused
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                : 'bg-slate-200 text-slate-500 border border-slate-300 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700'
                        }`}
                    >
                        {isPaused ? 'Paused' : 'Pause'}
                    </button>
                    <LiveIndicator isConnected={isConnected} />
                </div>
            </div>

            {/* Connection lost banner */}
            {!isConnected && (
                <div className="mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 px-4 py-2 text-sm text-rose-400 animate__animated animate__fadeIn" style={{ animationDuration: '0.3s' }}>
                    Connection lost — reconnecting...
                </div>
            )}

            {/* Main grid */}
            <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Service Topology */}
                <div className="col-span-12 lg:col-span-5">
                    <DashCard title="Service Topology">
                        <ServiceTopology services={services} trades={trades} traffic={traffic} pressureLevel={pressureLevel} />
                    </DashCard>
                </div>

                {/* Row 1 right: 서비스 & 자원 모니터링 */}
                <div className="col-span-12 lg:col-span-7">
                    <GroupCard title="서비스 & 자원">
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {services.map((svc, i) => (
                                    <ServiceStatusCard key={svc.name || i} service={svc} />
                                ))}
                            </div>
                            <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-12 md:col-span-4">
                                    <DashCard title="Resources">
                                        <ResourceGauges resources={resources} />
                                    </DashCard>
                                </div>
                                <div className="col-span-12 md:col-span-8">
                                    <DashCard title="Resource Metrics (30min)">
                                        <ResourceTimeSeries resourceHistory={resourceHistory} />
                                    </DashCard>
                                </div>
                            </div>
                        </div>
                    </GroupCard>
                </div>

                {/* Row 3: 코인거래 모니터링 */}
                <div className="col-span-12">
                    <GroupCard title="코인거래 모니터링">
                        <div className="grid grid-cols-12 gap-3">
                            <div className="col-span-12 md:col-span-7">
                                <DashCard title="Trade Activity">
                                    <TradeActivityFeed trades={trades} />
                                </DashCard>
                            </div>
                            <div className="col-span-12 md:col-span-5">
                                <DashCard title="Process Status">
                                    <ProcessStatusPanel buyProcess={snapshot?.buyProcess} sellProcess={snapshot?.sellProcess} />
                                    <div className="mt-4 grid grid-cols-2 gap-3">
                                        <StatCard label="Holdings" value={snapshot?.holdingsCount ?? '-'} />
                                        <StatCard label="Today Trades" value={snapshot?.todayTradeCount ?? '-'} />
                                    </div>
                                </DashCard>
                            </div>
                        </div>
                    </GroupCard>
                </div>
            </div>
        </div>
    );
}

function LiveIndicator({ isConnected }) {
    return (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
            isConnected
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30'
        }`}>
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            {isConnected ? 'LIVE' : 'OFFLINE'}
        </div>
    );
}

function DashCard({ title, children }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 p-4 shadow-lg h-full">
            {title && (
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">{title}</div>
            )}
            {children}
        </div>
    );
}

function GroupCard({ title, children }) {
    return (
        <div className="rounded-xl border border-slate-300 bg-slate-100/50 dark:border-slate-700 dark:bg-slate-800/30 p-3 h-full">
            {title && (
                <div className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-3">{title}</div>
            )}
            {children}
        </div>
    );
}

function StatCard({ label, value }) {
    return (
        <div className="rounded-lg bg-slate-100 border border-slate-200 dark:bg-slate-800/60 dark:border-slate-700/50 p-3 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white transition-all duration-500">{value}</div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
        </div>
    );
}
