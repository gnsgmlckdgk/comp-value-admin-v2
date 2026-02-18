import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { compareValues, calcInitialWidths } from '../utils/tableUtils';
import useColumnSort from './useColumnSort';
import useColumnResize from './useColumnResize';
import useColumnFilters from './useColumnFilters';
import useColumnVisibility from './useColumnVisibility';
import useSummary from './useSummary';

/**
 * 행의 대표 색상: 해당 행의 첫 번째 non-null 셀 배경색
 * sheetRow = 엑셀 시트 기준 행 (헤더=0, 데이터=1~)
 */
function getRowColor(cellColors, sheetRow, colCount) {
    if (!cellColors) return null;
    for (let c = 0; c < colCount; c++) {
        const bg = cellColors[`${sheetRow},${c}`];
        if (bg) return bg;
    }
    return null;
}

export default function useTableState(data, cellColors) {
    const headers = useMemo(
        () => (data.length > 0 ? data[0] : []),
        [data],
    );
    const allRows = useMemo(
        () => (data.length > 1 ? data.slice(1) : []),
        [data],
    );

    // 글로벌 검색
    const [search, setSearch] = useState('');

    // 고정 열 개수
    const [pinnedCount, setPinnedCount] = useState(0);

    // 색상 정렬: null | 'asc' | 'desc'
    const [colorSortDir, setColorSortDir] = useState(null);

    // 색상 필터: null(전체) | Set<string|'__none__'>
    const [colorFilter, setColorFilter] = useState(null);

    // 행 선택 (origIdx 기준)
    const [selectedRows, setSelectedRows] = useState(new Set());
    // 삭제된 행 (origIdx 기준)
    const [deletedRows, setDeletedRows] = useState(new Set());
    // shift+click 범위 선택용 마지막 클릭 위치 (processedEntries 내 index)
    const lastClickedRef = useRef(null);

    // 초기 컬럼 너비
    const initialWidths = useMemo(
        () => calcInitialWidths(headers, allRows),
        [headers, allRows],
    );

    // 서브 훅
    const sort = useColumnSort();
    const resize = useColumnResize(initialWidths);
    const filters = useColumnFilters(allRows, headers);
    const visibility = useColumnVisibility(headers.length);

    // 행별 대표 색상 맵: origIdx → color|null
    const rowColorMap = useMemo(() => {
        if (!cellColors) return null;
        const map = new Map();
        const colCount = headers.length;
        allRows.forEach((_, i) => {
            map.set(i, getRowColor(cellColors, i + 1, colCount));
        });
        return map;
    }, [cellColors, allRows, headers.length]);

    // 사용 가능한 색상 목록 (필터 패널용)
    const availableColors = useMemo(() => {
        if (!rowColorMap) return [];
        const colorSet = new Set();
        let hasNone = false;
        for (const [, color] of rowColorMap) {
            if (color) colorSet.add(color);
            else hasNone = true;
        }
        const sorted = Array.from(colorSet).sort();
        if (hasNone) sorted.push('__none__');
        return sorted;
    }, [rowColorMap]);

    // 인덱스 태그된 행 목록
    const indexedRows = useMemo(
        () => allRows.map((row, i) => ({ row, origIdx: i })),
        [allRows],
    );

    // 파이프라인: 삭제 → 글로벌 검색 → 컬럼 필터 → 색상 필터 → 컬럼 정렬 → 색상 정렬
    const processedEntries = useMemo(() => {
        let entries = indexedRows;

        // 0. 삭제된 행 제거
        if (deletedRows.size > 0) {
            entries = entries.filter(({ origIdx }) => !deletedRows.has(origIdx));
        }

        // 1. 글로벌 검색
        if (search.trim()) {
            const keyword = search.toLowerCase();
            entries = entries.filter(({ row }) =>
                row.some((cell) => String(cell).toLowerCase().includes(keyword)),
            );
        }

        // 2. 컬럼 필터
        if (filters.hasAnyFilter) {
            entries = entries.filter(({ row }) =>
                Object.entries(filters.filters).every(([colIdx, allowedSet]) => {
                    const val = Number(colIdx) < row.length ? String(row[Number(colIdx)] ?? '') : '';
                    return allowedSet.has(val);
                }),
            );
        }

        // 3. 색상 필터
        if (colorFilter && rowColorMap) {
            entries = entries.filter(({ origIdx }) => {
                const c = rowColorMap.get(origIdx) || '__none__';
                return colorFilter.has(c);
            });
        }

        // 4. 컬럼 정렬
        if (sort.sortCol != null && sort.sortDir) {
            entries = [...entries].sort((a, b) => {
                const aVal = sort.sortCol < a.row.length ? a.row[sort.sortCol] : '';
                const bVal = sort.sortCol < b.row.length ? b.row[sort.sortCol] : '';
                return compareValues(aVal, bVal, sort.sortDir);
            });
        }

        // 5. 색상 정렬 (안정 정렬 — 기존 순서 유지하면서 색상으로 그룹핑)
        if (colorSortDir && rowColorMap) {
            entries = [...entries].sort((a, b) => {
                const aColor = rowColorMap.get(a.origIdx) || '';
                const bColor = rowColorMap.get(b.origIdx) || '';
                if (aColor === bColor) return 0;
                // 색 있는 행 우선(asc) 또는 후순(desc)
                if (!aColor) return colorSortDir === 'asc' ? 1 : -1;
                if (!bColor) return colorSortDir === 'asc' ? -1 : 1;
                const cmp = aColor.localeCompare(bColor);
                return colorSortDir === 'desc' ? -cmp : cmp;
            });
        }

        return entries;
    }, [
        indexedRows, search,
        deletedRows,
        filters.filters, filters.hasAnyFilter,
        colorFilter, rowColorMap,
        sort.sortCol, sort.sortDir,
        colorSortDir,
    ]);

    const processedRows = useMemo(
        () => processedEntries.map((e) => e.row),
        [processedEntries],
    );

    const processedOrigIndices = useMemo(
        () => processedEntries.map((e) => e.origIdx),
        [processedEntries],
    );

    // 요약
    const summary = useSummary(processedRows, headers);

    // 시트 변경 시 리셋
    useEffect(() => {
        setSearch('');
        setPinnedCount(0);
        setColorSortDir(null);
        setColorFilter(null);
        setSelectedRows(new Set());
        setDeletedRows(new Set());
        lastClickedRef.current = null;
        sort.resetSort();
        resize.resetWidths();
        filters.clearAllFilters();
        visibility.showAll();
        summary.resetMode();
    }, [data]);

    // 보이는 컬럼 인덱스
    const visibleCols = useMemo(
        () =>
            headers
                .map((_, i) => i)
                .filter((i) => visibility.isVisible(i)),
        [headers, visibility.isVisible, visibility.hiddenCols],
    );

    const addPin = useCallback(() => {
        setPinnedCount((v) => Math.min(v + 1, visibleCols.length));
    }, [visibleCols.length]);

    const removePin = useCallback(() => {
        setPinnedCount((v) => Math.max(v - 1, 0));
    }, []);

    const resetPin = useCallback(() => {
        setPinnedCount(0);
    }, []);

    // 색상 정렬 토글: null → asc → desc → null
    const toggleColorSort = useCallback(() => {
        setColorSortDir((prev) => {
            if (prev === null) return 'asc';
            if (prev === 'asc') return 'desc';
            return null;
        });
    }, []);

    // 색상 필터: 특정 색상 토글
    const toggleColorFilter = useCallback((color) => {
        setColorFilter((prev) => {
            if (!prev) {
                // 처음: 해당 색상만 선택
                return new Set([color]);
            }
            const next = new Set(prev);
            if (next.has(color)) {
                next.delete(color);
                if (next.size === 0) return null; // 전부 해제 → 필터 끔
            } else {
                next.add(color);
            }
            return next;
        });
    }, []);

    const clearColorFilter = useCallback(() => {
        setColorFilter(null);
    }, []);

    const hasColorFeatures = availableColors.length > 0;

    // --- 행 선택 ---
    const toggleSelectRow = useCallback((processedIdx, shiftKey) => {
        const origIdx = processedEntries[processedIdx]?.origIdx;
        if (origIdx == null) return;

        if (shiftKey && lastClickedRef.current != null) {
            // shift+click: 범위 선택
            const from = Math.min(lastClickedRef.current, processedIdx);
            const to = Math.max(lastClickedRef.current, processedIdx);
            setSelectedRows((prev) => {
                const next = new Set(prev);
                for (let i = from; i <= to; i++) {
                    const oi = processedEntries[i]?.origIdx;
                    if (oi != null) next.add(oi);
                }
                return next;
            });
        } else {
            setSelectedRows((prev) => {
                const next = new Set(prev);
                if (next.has(origIdx)) next.delete(origIdx);
                else next.add(origIdx);
                return next;
            });
        }
        lastClickedRef.current = processedIdx;
    }, [processedEntries]);

    const selectAllVisible = useCallback(() => {
        const all = new Set(processedEntries.map((e) => e.origIdx));
        setSelectedRows(all);
    }, [processedEntries]);

    const deselectAll = useCallback(() => {
        setSelectedRows(new Set());
        lastClickedRef.current = null;
    }, []);

    const isSelected = useCallback(
        (origIdx) => selectedRows.has(origIdx),
        [selectedRows],
    );

    const deleteSelected = useCallback(() => {
        if (selectedRows.size === 0) return;
        setDeletedRows((prev) => {
            const next = new Set(prev);
            for (const idx of selectedRows) next.add(idx);
            return next;
        });
        setSelectedRows(new Set());
        lastClickedRef.current = null;
    }, [selectedRows]);

    return {
        headers,
        allRows,
        processedRows,
        processedOrigIndices,
        search,
        setSearch,
        pinnedCount,
        addPin,
        removePin,
        resetPin,
        visibleCols,
        sort,
        resize,
        filters,
        visibility,
        summary,
        // 색상
        colorSortDir,
        toggleColorSort,
        colorFilter,
        toggleColorFilter,
        clearColorFilter,
        availableColors,
        hasColorFeatures,
        // 행 선택/삭제
        selectedRows,
        toggleSelectRow,
        selectAllVisible,
        deselectAll,
        isSelected,
        deleteSelected,
    };
}
