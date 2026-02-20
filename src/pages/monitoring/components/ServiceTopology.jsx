import { useMemo, useRef, useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';

/**
 * SVG 기반 서비스 토폴로지 맵
 * 3개 서비스 노드 + 연결선 + 파티클 이동 + 거래 시 pulse 애니메이션
 */

const NODES = [
    { id: 'comp-value-service', label: 'Backend', x: 200, y: 50 },
    { id: 'cointrader', label: 'Cointrader', x: 80, y: 170 },
    { id: 'database', label: 'PostgreSQL', x: 320, y: 170 },
];

const EDGES = [
    { from: 'comp-value-service', to: 'cointrader' },
    { from: 'comp-value-service', to: 'database' },
    { from: 'cointrader', to: 'database' },
];

export default function ServiceTopology({ services = [], trades = [] }) {
    const { isDark } = useTheme();
    const [pulseNode, setPulseNode] = useState(null);
    const prevTradeCountRef = useRef(0);

    // 테마별 색상
    const lineColor = isDark ? '#334155' : '#cbd5e1';
    const statusTextColor = isDark ? '#94a3b8' : '#64748b';
    const particleColor = isDark ? '#22d3ee' : '#0891b2';

    // 서비스 상태 맵
    const statusMap = useMemo(() => {
        const map = {};
        for (const svc of services) {
            map[svc.name] = svc.status;
        }
        if (!map['database']) {
            map['database'] = map['comp-value-service'] === 'UP' ? 'UP' : 'DOWN';
        }
        return map;
    }, [services]);

    // 새 거래 발생 시 pulse 트리거
    useEffect(() => {
        if (trades.length > prevTradeCountRef.current && trades.length > 0) {
            setPulseNode('cointrader');
            const timer = setTimeout(() => setPulseNode(null), 1500);
            return () => clearTimeout(timer);
        }
        prevTradeCountRef.current = trades.length;
    }, [trades.length]);

    const getNodeColor = (nodeId) => {
        const status = statusMap[nodeId] || 'DOWN';
        if (status === 'UP') return { fill: '#059669', stroke: '#34d399', glow: 'rgba(52,211,153,0.4)' };
        if (status === 'DEGRADED') return { fill: '#d97706', stroke: '#fbbf24', glow: 'rgba(251,191,36,0.4)' };
        return { fill: '#dc2626', stroke: '#f87171', glow: 'rgba(248,113,113,0.4)' };
    };

    const getNode = (id) => NODES.find(n => n.id === id);

    return (
        <div className="w-full" style={{ minHeight: '220px' }}>
            <svg viewBox="0 0 400 230" className="w-full h-auto">
                <defs>
                    <radialGradient id="particleGrad">
                        <stop offset="0%" stopColor={particleColor} stopOpacity="1" />
                        <stop offset="100%" stopColor={particleColor} stopOpacity="0" />
                    </radialGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>

                {/* Edges with particles */}
                {EDGES.map(edge => {
                    const from = getNode(edge.from);
                    const to = getNode(edge.to);
                    if (!from || !to) return null;
                    const pathId = `path-${edge.from}-${edge.to}`;
                    return (
                        <g key={pathId}>
                            <line
                                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                                stroke={lineColor} strokeWidth="1.5" strokeDasharray="4 4"
                            />
                            <path
                                id={pathId}
                                d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
                                fill="none" stroke="none"
                            />
                            <circle r="3" fill="url(#particleGrad)" filter="url(#glow)">
                                <animateMotion dur="3s" repeatCount="indefinite">
                                    <mpath href={`#${pathId}`} />
                                </animateMotion>
                            </circle>
                        </g>
                    );
                })}

                {/* Nodes */}
                {NODES.map(node => {
                    const colors = getNodeColor(node.id);
                    const isPulsing = pulseNode === node.id;
                    return (
                        <g key={node.id}>
                            {isPulsing && (
                                <circle cx={node.x} cy={node.y} r="30" fill="none" stroke={colors.stroke} strokeWidth="2">
                                    <animate attributeName="r" from="30" to="55" dur="1.5s" fill="freeze" />
                                    <animate attributeName="opacity" from="0.8" to="0" dur="1.5s" fill="freeze" />
                                </circle>
                            )}

                            <circle
                                cx={node.x} cy={node.y} r="28"
                                fill="none" stroke={colors.stroke} strokeWidth="1" opacity="0.3"
                                style={{ filter: `drop-shadow(0 0 8px ${colors.glow})` }}
                            />

                            <circle
                                cx={node.x} cy={node.y} r="24"
                                fill={colors.fill} stroke={colors.stroke} strokeWidth="2"
                                style={{ filter: `drop-shadow(0 0 6px ${colors.glow})` }}
                            />

                            <text
                                x={node.x} y={node.y + 2}
                                textAnchor="middle" fontSize="9" fontWeight="600"
                                fill="white"
                            >
                                {node.label}
                            </text>

                            <text
                                x={node.x} y={node.y + 45}
                                textAnchor="middle" fontSize="8" fill={statusTextColor}
                            >
                                {statusMap[node.id] || 'UNKNOWN'}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
