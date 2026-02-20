import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';

/**
 * SVG 기반 서비스 토폴로지 맵
 * 6개 서비스 노드 + 연결선 + 파티클 + 거래 시 multi-node pulse + edge flash
 *
 * viewBox 340x220 — 노드 r=24, 폰트 9px로 확대
 */

const R = 24; // 노드 반지름

const NODES = [
    { id: 'comp-value-admin',   label: 'Web',         x: 170, y: 32 },
    { id: 'comp-value-service', label: 'Backend',      x: 170, y: 100 },
    { id: 'cointrader',         label: 'Cointrader',   x: 52,  y: 180 },
    { id: 'stock-predictor',    label: 'ML Predict',   x: 131, y: 180 },
    { id: 'postgresql',         label: 'PostgreSQL',   x: 210, y: 180 },
    { id: 'redis',              label: 'Redis',        x: 289, y: 180 },
];

const EDGES = [
    { from: 'comp-value-admin',   to: 'comp-value-service' },
    { from: 'comp-value-service', to: 'cointrader' },
    { from: 'comp-value-service', to: 'stock-predictor' },
    { from: 'comp-value-service', to: 'postgresql' },
    { from: 'comp-value-service', to: 'redis' },
    { from: 'cointrader',         to: 'postgresql' },
];

const TRADE_EDGES = [
    'cointrader->postgresql',
    'comp-value-service->cointrader',
    'comp-value-service->postgresql',
];

const TRADE_PULSE_NODES = ['cointrader', 'postgresql', 'comp-value-service'];

export default function ServiceTopology({ services = [], trades = [] }) {
    const { isDark } = useTheme();
    const [pulseNodes, setPulseNodes] = useState(new Set());
    const [flashEdges, setFlashEdges] = useState(new Set());
    const [tradeFlash, setTradeFlash] = useState(null);
    const prevTradeCountRef = useRef(0);

    const lineColor = isDark ? '#334155' : '#cbd5e1';
    const statusTextColor = isDark ? '#94a3b8' : '#64748b';
    const particleColor = isDark ? '#22d3ee' : '#0891b2';

    const statusMap = useMemo(() => {
        const map = {};
        for (const svc of services) {
            map[svc.name] = svc.status;
        }
        return map;
    }, [services]);

    const triggerTradeAnimation = useCallback((trade) => {
        setPulseNodes(new Set(TRADE_PULSE_NODES));
        setFlashEdges(new Set(TRADE_EDGES));
        if (trade) {
            setTradeFlash(`${trade.tradeType} ${trade.coinCode}`);
        }
        const timer = setTimeout(() => {
            setPulseNodes(new Set());
            setFlashEdges(new Set());
            setTradeFlash(null);
        }, 2000);
        return timer;
    }, []);

    useEffect(() => {
        if (trades.length > prevTradeCountRef.current && trades.length > 0) {
            const timer = triggerTradeAnimation(trades[0]);
            prevTradeCountRef.current = trades.length;
            return () => clearTimeout(timer);
        }
        prevTradeCountRef.current = trades.length;
    }, [trades, triggerTradeAnimation]);

    const getNodeColor = (nodeId) => {
        const status = statusMap[nodeId] || 'UNKNOWN';
        if (status === 'UP') return { fill: '#059669', stroke: '#34d399', glow: 'rgba(52,211,153,0.4)' };
        if (status === 'DEGRADED') return { fill: '#d97706', stroke: '#fbbf24', glow: 'rgba(251,191,36,0.4)' };
        if (status === 'DOWN') return { fill: '#dc2626', stroke: '#f87171', glow: 'rgba(248,113,113,0.4)' };
        return { fill: '#475569', stroke: '#94a3b8', glow: 'rgba(148,163,184,0.3)' };
    };

    const getNode = (id) => NODES.find(n => n.id === id);
    const edgeKey = (from, to) => `${from}->${to}`;

    return (
        <div className="w-full">
            <svg viewBox="0 0 340 220" className="w-full h-auto">
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
                    <filter id="glowStrong">
                        <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>

                {/* Edges */}
                {EDGES.map(edge => {
                    const from = getNode(edge.from);
                    const to = getNode(edge.to);
                    if (!from || !to) return null;
                    const pathId = `path-${edge.from}-${edge.to}`;
                    const key = edgeKey(edge.from, edge.to);
                    const isFlashing = flashEdges.has(key);

                    return (
                        <g key={pathId}>
                            {isFlashing && (
                                <line
                                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                                    stroke="#22d3ee" strokeWidth="4" filter="url(#glowStrong)"
                                >
                                    <animate attributeName="opacity" from="1" to="0" dur="2s" fill="freeze" />
                                </line>
                            )}

                            <line
                                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                                stroke={isFlashing ? '#22d3ee' : lineColor}
                                strokeWidth={isFlashing ? 2.5 : 1.5}
                                strokeDasharray={isFlashing ? undefined : '4 4'}
                                style={isFlashing ? { transition: 'all 0.3s' } : undefined}
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

                            {isFlashing && (
                                <circle r="6" fill="#22d3ee" filter="url(#glowStrong)">
                                    <animateMotion dur="0.8s" repeatCount="1" fill="freeze">
                                        <mpath href={`#${pathId}`} />
                                    </animateMotion>
                                    <animate attributeName="opacity" from="1" to="0" dur="0.8s" fill="freeze" />
                                </circle>
                            )}
                        </g>
                    );
                })}

                {/* Nodes */}
                {NODES.map(node => {
                    const colors = getNodeColor(node.id);
                    const isPulsing = pulseNodes.has(node.id);

                    return (
                        <g key={node.id}>
                            {isPulsing && (
                                <>
                                    <circle cx={node.x} cy={node.y} fill="none" stroke="#22d3ee" strokeWidth="3">
                                        <animate attributeName="r" from={R} to={R + 30} dur="1.5s" fill="freeze" />
                                        <animate attributeName="opacity" from="0.9" to="0" dur="1.5s" fill="freeze" />
                                    </circle>
                                    <circle cx={node.x} cy={node.y} fill="none" stroke="#22d3ee" strokeWidth="2">
                                        <animate attributeName="r" from={R} to={R + 18} dur="1s" fill="freeze" />
                                        <animate attributeName="opacity" from="0.6" to="0" dur="1s" fill="freeze" />
                                    </circle>
                                </>
                            )}

                            <circle
                                cx={node.x} cy={node.y} r={R + 4}
                                fill="none" stroke={colors.stroke} strokeWidth="1" opacity="0.3"
                                style={{ filter: `drop-shadow(0 0 6px ${colors.glow})` }}
                            />

                            <circle
                                cx={node.x} cy={node.y} r={R}
                                fill={isPulsing ? '#0e7490' : colors.fill}
                                stroke={isPulsing ? '#22d3ee' : colors.stroke}
                                strokeWidth={isPulsing ? 3 : 2}
                                style={{
                                    filter: isPulsing
                                        ? 'drop-shadow(0 0 14px rgba(34,211,238,0.8))'
                                        : `drop-shadow(0 0 5px ${colors.glow})`,
                                    transition: 'all 0.3s',
                                }}
                            />

                            <text
                                x={node.x} y={node.y + 3}
                                textAnchor="middle" fontSize="9" fontWeight="600" fill="white"
                            >
                                {node.label}
                            </text>

                            <text
                                x={node.x} y={node.y + R + 14}
                                textAnchor="middle" fontSize="8" fill={statusTextColor}
                            >
                                {statusMap[node.id] || '...'}
                            </text>
                        </g>
                    );
                })}

                {/* 거래 flash 라벨 */}
                {tradeFlash && (
                    <g>
                        <rect x="100" y="125" width="140" height="26" rx="6"
                            fill={isDark ? 'rgba(8,145,178,0.9)' : 'rgba(6,182,212,0.9)'}
                            filter="url(#glowStrong)"
                        >
                            <animate attributeName="opacity" from="1" to="0" dur="2s" fill="freeze" />
                        </rect>
                        <text x="170" y="143" textAnchor="middle" fontSize="11" fontWeight="700" fill="white">
                            {tradeFlash}
                            <animate attributeName="opacity" from="1" to="0" dur="2s" fill="freeze" />
                        </text>
                    </g>
                )}
            </svg>
        </div>
    );
}
