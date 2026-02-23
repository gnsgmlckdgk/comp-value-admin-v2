import { useMemo, useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { useTheme } from '@/context/ThemeContext';

const POD_COLORS = ['#3b82f6', '#f97316', '#a855f7', '#ec4899', '#14b8a6', '#eab308'];

/**
 * Recharts LineChart — 파드별 CPU% 시계열 (최근 30분)
 * 10초 간격 데이터 누적 (hook에서 360개 유지)
 * 범례 클릭으로 라인 표시/숨김 토글
 */
export default function ResourceTimeSeries({ resourceHistory = [] }) {
    const { isDark } = useTheme();
    const [hiddenKeys, setHiddenKeys] = useState(new Set());

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
                point[c.name] = Number((c.cpuPercent || 0).toFixed(1));
            }
            if (entry.gpu) {
                point.gpu = Number((entry.gpu.utilPercent || 0).toFixed(1));
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

    // 모든 dataKey (pods + gpu) — 색상 매핑 고정
    const allKeys = [...podNames, ...(hasGpu ? ['gpu'] : [])];

    return (
        <div style={{ width: '100%', height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
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
                    {podNames.map((name, i) => (
                        <Line
                            key={name}
                            type="monotone"
                            dataKey={name}
                            name={name}
                            stroke={POD_COLORS[i % POD_COLORS.length]}
                            strokeWidth={2}
                            dot={false}
                            connectNulls
                            hide={hiddenKeys.has(name)}
                        />
                    ))}
                    {hasGpu && (
                        <Line
                            type="monotone"
                            dataKey="gpu"
                            name="GPU"
                            stroke="#34d399"
                            strokeWidth={2}
                            strokeDasharray="5 3"
                            dot={false}
                            connectNulls
                            hide={hiddenKeys.has('gpu')}
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
