import { useState, useCallback, useMemo } from 'react';

export default function useColumnFilters(allRows, headers) {
    // { [colIdx]: Set<string> } — 선택된 값만 보여줌
    const [filters, setFilters] = useState({});

    // 각 컬럼별 고유값 (원본 데이터 기준, 한 번만 계산)
    const uniqueValuesMap = useMemo(() => {
        const map = {};
        headers.forEach((_, colIdx) => {
            const vals = new Set();
            allRows.forEach((row) => {
                const v = colIdx < row.length ? String(row[colIdx] ?? '') : '';
                vals.add(v);
            });
            map[colIdx] = Array.from(vals).sort((a, b) => a.localeCompare(b, 'ko'));
        });
        return map;
    }, [allRows, headers]);

    const applyFilter = useCallback((colIdx, selectedValues) => {
        setFilters((prev) => {
            const next = { ...prev };
            if (selectedValues === null) {
                delete next[colIdx];
            } else {
                next[colIdx] = new Set(selectedValues);
            }
            return next;
        });
    }, []);

    const clearFilter = useCallback((colIdx) => {
        setFilters((prev) => {
            const next = { ...prev };
            delete next[colIdx];
            return next;
        });
    }, []);

    const clearAllFilters = useCallback(() => {
        setFilters({});
    }, []);

    const isFiltered = useCallback(
        (colIdx) => filters[colIdx] != null,
        [filters],
    );

    const hasAnyFilter = Object.keys(filters).length > 0;

    return {
        filters,
        uniqueValuesMap,
        applyFilter,
        clearFilter,
        clearAllFilters,
        isFiltered,
        hasAnyFilter,
    };
}
