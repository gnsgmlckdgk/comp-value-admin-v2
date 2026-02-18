import { useState, useMemo, useCallback } from 'react';
import { isNumeric } from '../utils/tableUtils';

const MODES = ['none', 'sum', 'avg', 'count', 'min', 'max'];
const LABELS = {
    none: '-',
    sum: '합계',
    avg: '평균',
    count: '개수',
    min: '최소',
    max: '최대',
};

export default function useSummary(processedRows, headers) {
    const [mode, setMode] = useState('none');

    const cycleMode = useCallback(() => {
        setMode((prev) => {
            const idx = MODES.indexOf(prev);
            return MODES[(idx + 1) % MODES.length];
        });
    }, []);

    const resetMode = useCallback(() => {
        setMode('none');
    }, []);

    const summaryValues = useMemo(() => {
        if (mode === 'none' || !headers.length) return null;

        return headers.map((_, colIdx) => {
            const values = processedRows
                .map((row) => (colIdx < row.length ? row[colIdx] : ''))
                .filter((v) => isNumeric(v))
                .map(Number);

            if (mode === 'count') return processedRows.length;

            if (values.length === 0) return '-';

            switch (mode) {
                case 'sum':
                    return values.reduce((a, b) => a + b, 0);
                case 'avg':
                    return values.reduce((a, b) => a + b, 0) / values.length;
                case 'min':
                    return Math.min(...values);
                case 'max':
                    return Math.max(...values);
                default:
                    return '-';
            }
        });
    }, [mode, processedRows, headers]);

    return { mode, modeLabel: LABELS[mode], cycleMode, resetMode, summaryValues, LABELS };
}
