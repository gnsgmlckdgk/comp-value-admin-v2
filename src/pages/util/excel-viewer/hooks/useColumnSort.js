import { useState, useCallback, useRef } from 'react';

export default function useColumnSort() {
    const [sortCol, setSortCol] = useState(null);
    const [sortDir, setSortDir] = useState(null);
    const stateRef = useRef({ col: null, dir: null });

    const toggleSort = useCallback((colIdx) => {
        const { col, dir } = stateRef.current;
        let nextCol, nextDir;

        if (col !== colIdx) {
            nextCol = colIdx;
            nextDir = 'asc';
        } else if (dir === 'asc') {
            nextCol = colIdx;
            nextDir = 'desc';
        } else {
            nextCol = null;
            nextDir = null;
        }

        stateRef.current = { col: nextCol, dir: nextDir };
        setSortCol(nextCol);
        setSortDir(nextDir);
    }, []);

    const resetSort = useCallback(() => {
        stateRef.current = { col: null, dir: null };
        setSortCol(null);
        setSortDir(null);
    }, []);

    return { sortCol, sortDir, toggleSort, resetSort };
}
