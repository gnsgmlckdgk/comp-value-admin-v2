const ROW_NUM_WIDTH = 48;
const SHADOW = '4px 0 6px -2px rgba(0,0,0,0.08)';

function formatValue(val) {
    if (val === '-' || val == null) return '-';
    if (typeof val === 'number') {
        return Number.isInteger(val)
            ? val.toLocaleString('ko-KR')
            : val.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
    }
    return String(val);
}

export default function TableFooter({
    modeLabel,
    summaryValues,
    visibleCols,
    getWidth,
    pinnedCount,
}) {
    if (!summaryValues) return null;

    const getPinnedLeft = (visibleIdx) => {
        let left = ROW_NUM_WIDTH;
        for (let k = 0; k < visibleIdx; k++) {
            left += getWidth(visibleCols[k]);
        }
        return left;
    };

    const isLastPinned = (visibleIdx) => {
        if (pinnedCount === 0) return visibleIdx === -1;
        return visibleIdx === pinnedCount - 1;
    };

    return (
        <tfoot className="sticky bottom-0 z-20">
            <tr className="bg-amber-50 font-medium dark:bg-amber-950">
                <td
                    className="sticky left-0 z-30 border-t border-r border-slate-200 px-3 py-1.5 text-center text-xs text-amber-700 bg-amber-50 dark:border-slate-700 dark:text-amber-400 dark:bg-amber-950"
                    style={{
                        width: ROW_NUM_WIDTH, minWidth: ROW_NUM_WIDTH, maxWidth: ROW_NUM_WIDTH,
                        boxShadow: isLastPinned(-1) ? SHADOW : 'none',
                    }}
                >
                    {modeLabel}
                </td>
                {visibleCols.map((colIdx, i) => {
                    const val = summaryValues[colIdx];
                    const numeric = typeof val === 'number';
                    const pinned = i < pinnedCount;
                    const stickyClass = pinned
                        ? 'sticky z-30 bg-amber-50 dark:bg-amber-950'
                        : '';
                    const stickyStyle = pinned
                        ? {
                              left: getPinnedLeft(i),
                              boxShadow: isLastPinned(i) ? SHADOW : 'none',
                          }
                        : {};

                    return (
                        <td
                            key={colIdx}
                            data-col={colIdx}
                            className={`border-t border-r border-slate-200 px-3 py-1.5 text-xs dark:border-slate-700 whitespace-nowrap ${
                                numeric
                                    ? 'text-right tabular-nums text-amber-800 dark:text-amber-300'
                                    : 'text-center text-amber-600 dark:text-amber-400'
                            } ${stickyClass}`}
                            style={{
                                width: getWidth(colIdx),
                                minWidth: getWidth(colIdx),
                                maxWidth: getWidth(colIdx),
                                ...stickyStyle,
                            }}
                        >
                            {formatValue(val)}
                        </td>
                    );
                })}
            </tr>
        </tfoot>
    );
}
