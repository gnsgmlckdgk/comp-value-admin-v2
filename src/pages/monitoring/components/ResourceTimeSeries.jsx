import { useMemo, useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { useTheme } from '@/context/ThemeContext';

const POD_COLORS = ['#3b82f6', '#f97316', '#a855f7', '#ec4899', '#14b8a6', '#eab308'];

/**
 * Recharts LineChart — 파드별 CPU% + Memory% 시계열 (최근 30분)
 * CPU: 실선, Memory: 점선
 * 범례 클릭 토글 + 필터 버튼 (All / CPU / Memory)
 */
export default function ResourceTimeSeries({ resourceHistory = [] }) {
    const { isDark } = useTheme();
    const [hiddenKeys, setHiddenKeys] = useState(new Set());
    const [filter, setFilter] = useState('all'); // 'all' | 'cpu' | 'mem'

    // 파드 이름 목록 추출 (출현 순서 유지)
    const podNames = useMemo(() => {
        const seen = new Set();
        const names = [];
        resourceHistory.forEach(entry => {
            (entry.containers || []).forEach(c => {
                if (c.name && !seen.has(c.name)) {
                    seen.add(c.name);
                    names.push(c.name);
                }
            });
        });
        return names;
    }, [resourceHistory]);

    const chartData = useMemo(() => {
        return resourceHistory.map(entry => {
            const point = { time: entry.ts };
            for (const c of entry.containers || []) {
                point[`${c.name}_cpu`] = Number((c.cpuPercent || 0).toFixed(1));
                const memPct = c.memoryLimitMB > 0
                    ? (c.memoryMB / c.memoryLimitMB) * 100
                    : 0;
                point[`${c.name}_mem`] = Number(memPct.toFixed(1));
            }
            if (entry.gpu) {
                point.gpu = Number((entry.gpu.utilPercent || 0).toFixed(1));
                const vramPct = entry.gpu.memTotalMB > 0
                    ? (entry.gpu.memUsedMB / entry.gpu.memTotalMB) * 100
                    : 0;
                point.gpu_vram = Number(vramPct.toFixed(1));
            }
            return point;
        });
    }, [resourceHistory]);

    const hasGpu = useMemo(() =>
        resourceHistory.some(e => e.gpu?.utilPercent != null),
        [resourceHistory]
    );

    const handleLegendClick = useCallback((entry) => {
        const key = entry.dataKey;
        setHiddenKeys(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    }, []);

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

    const gridColor = isDark ? '#1e293b' : '#e2e8f0';
    const axisColor = isDark ? '#334155' : '#cbd5e1';
    const tickColor = isDark ? '#475569' : '#94a3b8';
    const tooltipBg = isDark ? '#0f172a' : '#ffffff';
    const tooltipBorder = isDark ? '#334155' : '#e2e8f0';
    const tooltipText = isDark ? '#e2e8f0' : '#1e293b';

    // 고정 30분 윈도우: 현재 시각 기준 오른쪽 정렬
    const now = chartData.length > 0 ? chartData[chartData.length - 1].time : Date.now();
    const thirtyMinAgo = now - 30 * 60 * 1000;

    const showCpu = filter === 'all' || filter === 'cpu';
    const showMem = filter === 'all' || filter === 'mem';

    return (
        <div>
            <div style={{ width: '100%', height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis
                            dataKey="time"
                            type="number"
                            domain={[thirtyMinAgo, now]}
                            tick={{ fontSize: 10, fill: tickColor }}
                            tickFormatter={formatTime}
                            interval="preserveStartEnd"
                            stroke={axisColor}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: tickColor }}
                            domain={[0, 'auto']}
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
                            formatter={(value, name) => [`${value}%`, name]}
                        />
                        <Legend
                            onClick={handleLegendClick}
                            wrapperStyle={{ fontSize: '10px', paddingTop: '4px', cursor: 'pointer' }}
                            iconType="plainline"
                            iconSize={12}
                            formatter={(value, entry) => {
                                const isHidden = hiddenKeys.has(entry.dataKey);
                                return (
                                    <span style={{
                                        color: isHidden ? '#9ca3af' : entry.color,
                                        textDecoration: isHidden ? 'line-through' : 'none',
                                    }}>
                                        {value}
                                    </span>
                                );
                            }}
                        />
                        {/* CPU lines — 실선 */}
                        {showCpu && podNames.map((name, i) => (
                            <Line
                                key={`${name}_cpu`}
                                type="monotone"
                                dataKey={`${name}_cpu`}
                                name={`${name} CPU`}
                                stroke={POD_COLORS[i % POD_COLORS.length]}
                                strokeWidth={2}
                                dot={false}
                                connectNulls
                                hide={hiddenKeys.has(`${name}_cpu`)}
                            />
                        ))}
                        {/* Memory lines — 점선 */}
                        {showMem && podNames.map((name, i) => (
                            <Line
                                key={`${name}_mem`}
                                type="monotone"
                                dataKey={`${name}_mem`}
                                name={`${name} MEM`}
                                stroke={POD_COLORS[i % POD_COLORS.length]}
                                strokeWidth={1.5}
                                strokeDasharray="4 3"
                                dot={false}
                                connectNulls
                                hide={hiddenKeys.has(`${name}_mem`)}
                            />
                        ))}
                        {/* GPU util line (CPU 필터) */}
                        {hasGpu && showCpu && (
                            <Line
                                type="monotone"
                                dataKey="gpu"
                                name="GPU"
                                stroke="#34d399"
                                strokeWidth={2}
                                strokeDasharray="8 4"
                                dot={false}
                                connectNulls
                                hide={hiddenKeys.has('gpu')}
                            />
                        )}
                        {/* GPU VRAM line (Memory 필터) */}
                        {hasGpu && showMem && (
                            <Line
                                type="monotone"
                                dataKey="gpu_vram"
                                name="GPU VRAM"
                                stroke="#34d399"
                                strokeWidth={1.5}
                                strokeDasharray="4 3"
                                dot={false}
                                connectNulls
                                hide={hiddenKeys.has('gpu_vram')}
                            />
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </div>
            {/* 필터 버튼 */}
            <div className="flex justify-center gap-1.5 mt-1.5">
                <FilterButton label="All" active={filter === 'all'} onClick={() => setFilter('all')} isDark={isDark} />
                <FilterButton label="CPU" active={filter === 'cpu'} onClick={() => setFilter('cpu')} isDark={isDark} />
                <FilterButton label="Memory" active={filter === 'mem'} onClick={() => setFilter('mem')} isDark={isDark} />
            </div>
        </div>
    );
}

function FilterButton({ label, active, onClick, isDark }) {
    return (
        <button
            onClick={onClick}
            className={`px-2.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                active
                    ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
        >
            {label}
        </button>
    );
}
