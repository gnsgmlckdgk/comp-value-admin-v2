import { useState, useCallback, useRef } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Filter } from 'lucide-react';
import ColumnFilterDropdown from './ColumnFilterDropdown';

const ROW_NUM_WIDTH = 48;
const SHADOW = '4px 0 6px -2px rgba(0,0,0,0.08)';

function SortIcon({ sortCol, sortDir, colIdx }) {
    if (sortCol !== colIdx) {
        return <ArrowUpDown className="h-3 w-3 text-slate-300 dark:text-slate-500" />;
    }
    if (sortDir === 'asc') {
        return <ArrowUp className="h-3 w-3 text-sky-600 dark:text-sky-400" />;
    }
    return <ArrowDown className="h-3 w-3 text-sky-600 dark:text-sky-400" />;
}

export default function TableHeader({
    headers,
    visibleCols,
    sortCol,
    sortDir,
    onToggleSort,
    getWidth,
    onResizeMouseDown,
    isFiltered,
    uniqueValuesMap,
    filters,
    onApplyFilter,
    pinnedCount,
    cellColors,
    allSelected,
    someSelected,
    onSelectAll,
    onDeselectAll,
}) {
    const [filterDropdown, setFilterDropdown] = useState(null);
    const filterBtnRefs = useRef({});

    const openFilter = useCallback((colIdx) => {
        const btn = filterBtnRefs.current[colIdx];
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        setFilterDropdown({ colIdx, rect });
    }, []);

    const closeFilter = useCallback(() => {
        setFilterDropdown(null);
    }, []);

    // 고정 열의 left 오프셋 계산
    const getPinnedLeft = (visibleIdx) => {
        let left = ROW_NUM_WIDTH;
        for (let k = 0; k < visibleIdx; k++) {
            left += getWidth(visibleCols[k]);
        }
        return left;
    };

    // 마지막 고정 요소에만 그림자
    const isLastPinned = (visibleIdx) => {
        if (pinnedCount === 0) return visibleIdx === -1; // # 열이 마지막
        return visibleIdx === pinnedCount - 1;
    };

    return (
        <thead className="sticky top-0 z-30">
            <tr className="bg-slate-100 dark:bg-slate-800">
                {/* 행번호 열 — 항상 sticky top+left */}
                <th
                    className="sticky left-0 z-40 border-b border-r border-slate-200 bg-slate-100 px-3 py-2 text-center font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    style={{
                        width: ROW_NUM_WIDTH, minWidth: ROW_NUM_WIDTH, maxWidth: ROW_NUM_WIDTH,
                        boxShadow: isLastPinned(-1) ? SHADOW : 'none',
                    }}
                >
                    <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected; }}
                        onChange={allSelected || someSelected ? onDeselectAll : onSelectAll}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-500"
                        title="전체 선택/해제"
                    />
                </th>

                {visibleCols.map((colIdx, i) => {
                    const header = headers[colIdx];
                    const label = header !== '' ? String(header) : `Column ${colIdx + 1}`;
                    const filtered = isFiltered(colIdx);
                    const pinned = i < pinnedCount;
                    const headerBg = cellColors?.[`0,${colIdx}`];
                    const stickyClass = pinned
                        ? 'sticky z-40'
                        : '';
                    const bgStyle = headerBg
                        ? { backgroundColor: headerBg }
                        : {};
                    const pinnedBgClass = pinned && !headerBg
                        ? 'bg-slate-100 dark:bg-slate-800'
                        : '';
                    const stickyStyle = pinned
                        ? {
                              left: getPinnedLeft(i),
                              boxShadow: isLastPinned(i) ? SHADOW : 'none',
                          }
                        : {};

                    return (
                        <th
                            key={colIdx}
                            data-col={colIdx}
                            className={`group relative select-none border-b border-r border-slate-200 py-2 pl-3 pr-1 text-left font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300 whitespace-nowrap ${stickyClass} ${pinnedBgClass}`}
                            style={{
                                width: getWidth(colIdx),
                                minWidth: getWidth(colIdx),
                                maxWidth: getWidth(colIdx),
                                ...bgStyle,
                                ...stickyStyle,
                            }}
                        >
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => onToggleSort(colIdx)}
                                    className="flex flex-1 items-center gap-1 overflow-hidden"
                                    title={`정렬: ${label}`}
                                >
                                    <span className="truncate text-xs">
                                        {label}
                                    </span>
                                    <SortIcon
                                        sortCol={sortCol}
                                        sortDir={sortDir}
                                        colIdx={colIdx}
                                    />
                                </button>

                                <button
                                    ref={(el) => {
                                        filterBtnRefs.current[colIdx] = el;
                                    }}
                                    onClick={() => openFilter(colIdx)}
                                    className={`flex-shrink-0 rounded p-0.5 transition-colors ${
                                        filtered
                                            ? 'text-sky-600 dark:text-sky-400'
                                            : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                                    }`}
                                    title="필터"
                                >
                                    <Filter className="h-3 w-3" />
                                </button>
                            </div>

                            <div
                                onMouseDown={(e) => onResizeMouseDown(colIdx, e)}
                                className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-sky-400/50"
                            />
                        </th>
                    );
                })}
            </tr>

            {filterDropdown && (
                <ColumnFilterDropdown
                    anchorRect={filterDropdown.rect}
                    uniqueValues={uniqueValuesMap[filterDropdown.colIdx] || []}
                    currentFilter={filters[filterDropdown.colIdx] || null}
                    onApply={(selected) =>
                        onApplyFilter(filterDropdown.colIdx, selected)
                    }
                    onClose={closeFilter}
                />
            )}
        </thead>
    );
}
