import { useRef, useEffect } from 'react';

/**
 * 실시간 거래 피드
 * BUY = cyan 보더, SELL = rose 보더
 * 새 항목 fadeInRight 슬라이드 인 (Animate.css)
 */
export default function TradeActivityFeed({ trades = [] }) {
    const containerRef = useRef(null);

    // 새 거래 도착 시 스크롤 맨 위로
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    }, [trades.length]);

    if (trades.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-slate-400 dark:text-slate-600 text-sm">
                Waiting for trades...
            </div>
        );
    }

    return (
        <div ref={containerRef} className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
            {trades.map((trade, i) => (
                <TradeItem key={trade.id || i} trade={trade} isNew={i === 0} />
            ))}
        </div>
    );
}

function TradeItem({ trade, isNew }) {
    const isBuy = trade.tradeType === 'BUY';
    const hasProfit = trade.profitLoss != null && Number(trade.profitLoss) > 0;
    const hasLoss = trade.profitLoss != null && Number(trade.profitLoss) < 0;

    const borderColor = isBuy ? 'border-l-cyan-400' : 'border-l-rose-400';
    const iconBg = isBuy ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400';
    const animation = isNew ? 'animate__animated animate__fadeInRight' : '';

    const formatKRW = (value) => {
        if (value == null) return '-';
        const num = Number(value);
        if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
        if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
        return num.toLocaleString();
    };

    const formatTime = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    };

    return (
        <div
            className={`${animation} flex items-center gap-3 rounded-lg border-l-4 ${borderColor} bg-slate-100/80 dark:bg-slate-800/50 px-3 py-2.5 transition-all hover:bg-slate-200 dark:hover:bg-slate-800`}
            style={{ animationDuration: '0.4s' }}
        >
            {/* Icon */}
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${iconBg}`}>
                {isBuy ? 'B' : 'S'}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{trade.coinCode}</span>
                    <span className={`text-xs font-semibold ${isBuy ? 'text-cyan-600 dark:text-cyan-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {trade.tradeType}
                    </span>
                    {trade.reason && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-600 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {trade.reason}
                        </span>
                    )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                    {trade.quantity} @ {formatKRW(trade.price)}
                </div>
            </div>

            {/* Amount + PnL */}
            <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatKRW(trade.totalAmount)}</div>
                {trade.profitLoss != null && (
                    <div className={`text-xs font-semibold ${
                        hasProfit ? 'text-emerald-600 dark:text-emerald-400' : hasLoss ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'
                    } ${hasProfit ? 'drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]' : ''}`}>
                        {hasProfit ? '+' : ''}{formatKRW(trade.profitLoss)}
                        {trade.profitLossRate != null && ` (${Number(trade.profitLossRate).toFixed(1)}%)`}
                    </div>
                )}
            </div>

            {/* Time */}
            <div className="text-[10px] text-slate-400 dark:text-slate-600 shrink-0">
                {formatTime(trade.timestamp)}
            </div>
        </div>
    );
}
