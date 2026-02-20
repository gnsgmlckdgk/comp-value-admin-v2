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
    const { snapshot, trades, isConnected, isPaused, togglePause, resourceHistory } = useMonitoringSSE();

    const services = snapshot?.services || [];
    const resources = snapshot?.resources || null;

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
                {/* Row 1: Service Topology | Resource Gauges | Trade Feed */}
                <div className="col-span-12 lg:col-span-4">
                    <DashCard title="Service Topology">
                        <ServiceTopology services={services} trades={trades} />
                    </DashCard>
                </div>
                <div className="col-span-12 md:col-span-6 lg:col-span-3">
                    <DashCard title="Resources">
                        <ResourceGauges resources={resources} />
                    </DashCard>
                </div>
                <div className="col-span-12 md:col-span-6 lg:col-span-5">
                    <DashCard title="Trade Activity">
                        <TradeActivityFeed trades={trades} />
                    </DashCard>
                </div>

                {/* Row 2: Resource Time Series | Process Status */}
                <div className="col-span-12 lg:col-span-8">
                    <DashCard title="Resource Metrics (30min)">
                        <ResourceTimeSeries resourceHistory={resourceHistory} />
                    </DashCard>
                </div>
                <div className="col-span-12 lg:col-span-4">
                    <DashCard title="Process Status">
                        <ProcessStatusPanel buyProcess={snapshot?.buyProcess} sellProcess={snapshot?.sellProcess} />
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <StatCard label="Holdings" value={snapshot?.holdingsCount ?? '-'} />
                            <StatCard label="Today Trades" value={snapshot?.todayTradeCount ?? '-'} />
                        </div>
                    </DashCard>
                </div>

                {/* Row 3: Service Status Cards */}
                <div className="col-span-12">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {services.map((svc, i) => (
                            <ServiceStatusCard key={svc.name || i} service={svc} />
                        ))}
                    </div>
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

function StatCard({ label, value }) {
    return (
        <div className="rounded-lg bg-slate-100 border border-slate-200 dark:bg-slate-800/60 dark:border-slate-700/50 p-3 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white transition-all duration-500">{value}</div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
        </div>
    );
}
