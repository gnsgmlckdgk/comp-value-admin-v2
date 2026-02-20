/**
 * Buy/Sell 프로세스 진행률 바
 */
export default function ProcessStatusPanel({ buyProcess, sellProcess }) {
    return (
        <div className="space-y-4">
            <ProcessBar process={buyProcess} label="Buy Process" accentColor="cyan" />
            <ProcessBar process={sellProcess} label="Sell Process" accentColor="violet" />
        </div>
    );
}

function ProcessBar({ process, label, accentColor }) {
    if (!process) {
        return (
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-600">No data</span>
                </div>
                <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-slate-300 dark:bg-slate-700 w-0" />
                </div>
            </div>
        );
    }

    const isRunning = process.status === 'RUNNING';
    const percent = process.percent || 0;

    const colorMap = {
        cyan: {
            bar: 'bg-gradient-to-r from-cyan-500 to-cyan-400',
            glow: 'shadow-[0_0_10px_rgba(34,211,238,0.4)]',
            text: 'text-cyan-600 dark:text-cyan-400',
        },
        violet: {
            bar: 'bg-gradient-to-r from-violet-500 to-violet-400',
            glow: 'shadow-[0_0_10px_rgba(139,92,246,0.4)]',
            text: 'text-violet-600 dark:text-violet-400',
        },
    };

    const colors = colorMap[accentColor] || colorMap.cyan;

    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
                <span className={`text-xs font-semibold ${isRunning ? colors.text : 'text-slate-400 dark:text-slate-600'}`}>
                    {isRunning ? `${percent}%` : process.status?.toLowerCase() || 'idle'}
                </span>
            </div>
            <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${isRunning ? `${colors.bar} ${colors.glow}` : 'bg-slate-300 dark:bg-slate-700'}`}
                    style={{ width: `${percent}%` }}
                />
            </div>
            {process.message && (
                <div className="mt-1 text-xs text-slate-500 truncate">{process.message}</div>
            )}
        </div>
    );
}
