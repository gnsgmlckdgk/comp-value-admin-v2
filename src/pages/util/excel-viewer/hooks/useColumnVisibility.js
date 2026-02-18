import { useState, useCallback, useEffect } from 'react';

export default function useColumnVisibility(columnCount) {
    const [hiddenCols, setHiddenCols] = useState(new Set());

    // 컬럼 수 변경 시 리셋
    useEffect(() => {
        setHiddenCols(new Set());
    }, [columnCount]);

    const toggleColumn = useCallback((colIdx) => {
        setHiddenCols((prev) => {
            const next = new Set(prev);
            if (next.has(colIdx)) next.delete(colIdx);
            else next.add(colIdx);
            return next;
        });
    }, []);

    const showAll = useCallback(() => {
        setHiddenCols(new Set());
    }, []);

    const hideAll = useCallback(() => {
        setHiddenCols(new Set(Array.from({ length: columnCount }, (_, i) => i)));
    }, [columnCount]);

    const isVisible = useCallback(
        (colIdx) => !hiddenCols.has(colIdx),
        [hiddenCols],
    );

    return { hiddenCols, toggleColumn, showAll, hideAll, isVisible };
}
