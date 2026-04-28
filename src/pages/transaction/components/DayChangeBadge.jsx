// 전일 종가 대비 등락 표시 (적록색약 친화: 상승=파랑, 하락=주황)
const FLAT_THRESHOLD_PCT = 0.005; // |pct| < 0.005% 는 보합 표시

export function DayChangeBadge({ pct }) {
    if (pct == null || Number.isNaN(pct)) return null;

    const isFlat = Math.abs(pct) < FLAT_THRESHOLD_PCT;
    const isUp = !isFlat && pct > 0;

    const cls = isFlat
        ? 'text-slate-500 dark:text-slate-400'
        : isUp
            ? 'text-sky-600 dark:text-sky-400'
            : 'text-orange-600 dark:text-orange-400';
    const arrow = isFlat ? '–' : isUp ? '▲' : '▼';
    const sign = isFlat ? '' : isUp ? '+' : '';

    return (
        <div className={`text-[11px] font-semibold tabular-nums ${cls}`} title="전일 종가 대비">
            {arrow} {sign}{pct.toFixed(2)}%
        </div>
    );
}
