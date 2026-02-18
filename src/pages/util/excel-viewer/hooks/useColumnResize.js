import { useState, useCallback, useRef, useEffect } from 'react';

const DEFAULT_WIDTH = 120;
const MIN_WIDTH = 50;

export default function useColumnResize(initialWidths) {
    const [columnWidths, setColumnWidths] = useState(initialWidths ?? {});
    const dragState = useRef(null);

    // initialWidths(데이터/시트 변경) 시 리셋
    useEffect(() => {
        setColumnWidths(initialWidths ?? {});
    }, [initialWidths]);

    const getWidth = useCallback(
        (colIdx) => columnWidths[colIdx] ?? DEFAULT_WIDTH,
        [columnWidths],
    );

    const handleMouseDown = useCallback(
        (colIdx, e) => {
            e.preventDefault();
            e.stopPropagation();
            const startWidth = columnWidths[colIdx] ?? DEFAULT_WIDTH;
            dragState.current = { colIdx, startX: e.clientX, startWidth };

            const onMouseMove = (moveEvent) => {
                if (!dragState.current) return;
                const { startX, startWidth: sw, colIdx: ci } = dragState.current;
                const diff = moveEvent.clientX - startX;
                const newWidth = Math.max(MIN_WIDTH, sw + diff);

                // DOM 직접 조작 (성능)
                const table = document.querySelector('[data-excel-table]');
                if (table) {
                    const cols = table.querySelectorAll(`[data-col="${ci}"]`);
                    cols.forEach((el) => {
                        el.style.width = newWidth + 'px';
                        el.style.minWidth = newWidth + 'px';
                        el.style.maxWidth = newWidth + 'px';
                    });
                }
            };

            const onMouseUp = (upEvent) => {
                if (dragState.current) {
                    const { startX, startWidth: sw, colIdx: ci } = dragState.current;
                    const diff = upEvent.clientX - startX;
                    const finalWidth = Math.max(MIN_WIDTH, sw + diff);
                    setColumnWidths((prev) => ({ ...prev, [ci]: finalWidth }));
                }
                dragState.current = null;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        },
        [columnWidths],
    );

    const resetWidths = useCallback(() => {
        setColumnWidths(initialWidths ?? {});
    }, [initialWidths]);

    return { columnWidths, getWidth, handleMouseDown, resetWidths };
}
