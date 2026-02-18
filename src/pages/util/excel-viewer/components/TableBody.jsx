import { isNumeric } from '../utils/tableUtils';

const ROW_NUM_WIDTH = 48;
const SHADOW = '4px 0 6px -2px rgba(0,0,0,0.08)';

export default function TableBody({
    processedRows,
    processedOrigIndices,
    visibleCols,
    getWidth,
    pinnedCount,
    cellColors,
    isSelected,
    onToggleSelect,
}) {
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
        <tbody>
            {processedRows.map((row, rowIdx) => {
                const origDataRow = processedOrigIndices?.[rowIdx];
                const origSheetRow = origDataRow != null ? origDataRow + 1 : null;
                const selected = origDataRow != null && isSelected(origDataRow);

                return (
                    <tr
                        key={rowIdx}
                        className={`transition-colors ${
                            selected
                                ? 'bg-sky-50 dark:bg-sky-900/30'
                                : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        {/* 체크박스 + 행번호 */}
                        <td
                            className={`sticky left-0 z-10 border-b border-r border-slate-200 px-1.5 py-1.5 text-center text-xs dark:border-slate-700 ${
                                selected
                                    ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
                                    : 'bg-white text-slate-400 dark:bg-slate-900 dark:text-slate-500'
                            }`}
                            style={{
                                width: ROW_NUM_WIDTH, minWidth: ROW_NUM_WIDTH, maxWidth: ROW_NUM_WIDTH,
                                boxShadow: isLastPinned(-1) ? SHADOW : 'none',
                            }}
                        >
                            <label className="flex items-center justify-center gap-1 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={(e) => onToggleSelect(rowIdx, e.nativeEvent.shiftKey)}
                                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-500 h-3 w-3"
                                />
                                <span className="tabular-nums">{rowIdx + 1}</span>
                            </label>
                        </td>
                        {visibleCols.map((colIdx, i) => {
                            const value =
                                colIdx < row.length ? row[colIdx] : '';
                            const numeric = isNumeric(value);
                            const pinned = i < pinnedCount;

                            const bg = origSheetRow != null
                                ? cellColors?.[`${origSheetRow},${colIdx}`]
                                : null;
                            const bgStyle = bg ? { backgroundColor: bg } : {};
                            const pinnedBgClass = pinned && !bg
                                ? selected
                                    ? 'bg-sky-50 dark:bg-sky-900/30'
                                    : 'bg-white dark:bg-slate-900'
                                : '';

                            const stickyClass = pinned
                                ? `sticky z-10 ${pinnedBgClass}`
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
                                    className={`border-b border-r border-slate-200 px-3 py-1.5 dark:border-slate-700 whitespace-nowrap ${
                                        numeric
                                            ? 'text-right tabular-nums text-slate-900 dark:text-slate-200'
                                            : 'text-left text-slate-900 dark:text-slate-200'
                                    } ${stickyClass}`}
                                    style={{
                                        width: getWidth(colIdx),
                                        minWidth: getWidth(colIdx),
                                        maxWidth: getWidth(colIdx),
                                        ...bgStyle,
                                        ...stickyStyle,
                                    }}
                                >
                                    {String(value)}
                                </td>
                            );
                        })}
                    </tr>
                );
            })}
        </tbody>
    );
}
