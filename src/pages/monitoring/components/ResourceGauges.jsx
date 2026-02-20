import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useTheme } from '@/context/ThemeContext';

/**
 * Recharts PieChart 도넛 게이지
 * CPU / Memory / GPU — 색상 전환 (green → yellow → red)
 */
export default function ResourceGauges({ resources }) {
    const containers = resources?.containers || [];
    const hasData = containers.length > 0 || resources?.gpu;

    if (!hasData) {
        return (
            <div className="flex items-center justify-center h-48 text-slate-400 dark:text-slate-600 text-sm">
                {resources ? 'Prometheus not connected' : 'No resource data'}
            </div>
        );
    }
    const avgCpu = containers.length > 0
        ? containers.reduce((sum, c) => sum + (c.cpuPercent || 0), 0) / containers.length
        : 0;
    const totalMemMB = containers.reduce((sum, c) => sum + (c.memoryMB || 0), 0);
    const totalMemLimitMB = containers.reduce((sum, c) => sum + (c.memoryLimitMB || 0), 0);
    const memPercent = totalMemLimitMB > 0 ? (totalMemMB / totalMemLimitMB) * 100 : 0;

    const gpu = resources.gpu;
    const gpuPercent = gpu?.utilPercent ?? 0;

    return (
        <div className="space-y-4">
            <GaugeRing label="CPU" value={avgCpu} unit="%" />
            <GaugeRing label="Memory" value={memPercent} unit="%" subtitle={`${totalMemMB}/${totalMemLimitMB} MB`} />
            {gpu && <GaugeRing label="GPU" value={gpuPercent} unit="%" subtitle={`${gpu.memUsedMB}/${gpu.memTotalMB} MB`} />}
        </div>
    );
}

function GaugeRing({ label, value, unit = '%', subtitle }) {
    const { isDark } = useTheme();
    const percent = Math.min(Math.max(value, 0), 100);
    const color = getColor(percent);
    const trackColor = isDark ? '#1e293b' : '#e2e8f0';

    const data = [
        { value: percent },
        { value: 100 - percent },
    ];

    return (
        <div className="flex items-center gap-3">
            <div className="w-16 h-16 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%" cy="50%"
                            innerRadius={22} outerRadius={30}
                            startAngle={90} endAngle={-270}
                            dataKey="value"
                            strokeWidth={0}
                        >
                            <Cell fill={color} />
                            <Cell fill={trackColor} />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
                <div className="text-lg font-bold transition-all duration-500" style={{ color }}>
                    {percent.toFixed(1)}{unit}
                </div>
                {subtitle && <div className="text-[10px] text-slate-500 dark:text-slate-600">{subtitle}</div>}
            </div>
        </div>
    );
}

function getColor(percent) {
    if (percent >= 90) return '#ef4444'; // red
    if (percent >= 70) return '#f59e0b'; // amber
    return '#22c55e'; // green
}
