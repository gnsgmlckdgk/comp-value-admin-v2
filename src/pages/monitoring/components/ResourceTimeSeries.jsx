import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useTheme } from '@/context/ThemeContext';

/**
 * Recharts AreaChart — 최근 30분 시계열
 * 10초 간격 데이터 누적 (hook에서 360개 유지)
 */
export default function ResourceTimeSeries({ resourceHistory = [] }) {
    const { isDark } = useTheme();

    const chartData = useMemo(() => {
        return resourceHistory.map(entry => {
            const containers = entry.containers || [];
            const avgCpu = containers.length > 0
                ? containers.reduce((sum, c) => sum + (c.cpuPercent || 0), 0) / containers.length
                : 0;
            const totalMemMB = containers.reduce((sum, c) => sum + (c.memoryMB || 0), 0);
            const totalMemLimitMB = containers.reduce((sum, c) => sum + (c.memoryLimitMB || 0), 0);
            const memPercent = totalMemLimitMB > 0 ? (totalMemMB / totalMemLimitMB) * 100 : 0;
            const gpuPercent = entry.gpu?.utilPercent ?? 0;

            return {
                time: entry.ts,
                cpu: Number(avgCpu.toFixed(1)),
                memory: Number(memPercent.toFixed(1)),
                gpu: Number(gpuPercent.toFixed(1)),
            };
        });
    }, [resourceHistory]);

    if (chartData.length < 2) {
        return (
            <div className="flex items-center justify-center h-48 text-slate-400 dark:text-slate-600 text-sm">
                Collecting data...
            </div>
        );
    }

    const formatTime = (ts) => {
        const d = new Date(ts);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    // 테마별 차트 색상
    const gridColor = isDark ? '#1e293b' : '#e2e8f0';
    const axisColor = isDark ? '#334155' : '#cbd5e1';
    const tickColor = isDark ? '#475569' : '#94a3b8';
    const tooltipBg = isDark ? '#0f172a' : '#ffffff';
    const tooltipBorder = isDark ? '#334155' : '#e2e8f0';
    const tooltipText = isDark ? '#e2e8f0' : '#1e293b';

    return (
        <div style={{ width: '100%', height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <defs>
                        <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="gpuGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fill: tickColor }}
                        tickFormatter={formatTime}
                        interval="preserveStartEnd"
                        stroke={axisColor}
                    />
                    <YAxis
                        tick={{ fontSize: 10, fill: tickColor }}
                        domain={[0, 100]}
                        tickFormatter={v => `${v}%`}
                        stroke={axisColor}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: tooltipBg,
                            border: `1px solid ${tooltipBorder}`,
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: tooltipText,
                        }}
                        labelFormatter={formatTime}
                        formatter={(value, name) => [`${value}%`, name.toUpperCase()]}
                    />
                    <Area
                        type="monotone" dataKey="cpu" name="cpu"
                        stroke="#22d3ee" strokeWidth={2}
                        fill="url(#cpuGrad)" dot={false}
                    />
                    <Area
                        type="monotone" dataKey="memory" name="memory"
                        stroke="#a78bfa" strokeWidth={2}
                        fill="url(#memGrad)" dot={false}
                    />
                    <Area
                        type="monotone" dataKey="gpu" name="gpu"
                        stroke="#34d399" strokeWidth={2}
                        fill="url(#gpuGrad)" dot={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
