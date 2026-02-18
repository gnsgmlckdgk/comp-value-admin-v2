import { useEffect, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function ColumnVisibilityPanel({
    headers,
    hiddenCols,
    onToggle,
    onShowAll,
    onHideAll,
    onClose,
}) {
    const panelRef = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div
            ref={panelRef}
            className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800"
        >
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    컬럼 표시/숨기기
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={onHideAll}
                        className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                        전체 숨기기
                    </button>
                    <button
                        onClick={onShowAll}
                        className="text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                    >
                        전체 표시
                    </button>
                </div>
            </div>
            <div className="max-h-64 overflow-y-auto p-1">
                {headers.map((header, i) => {
                    const visible = !hiddenCols.has(i);
                    return (
                        <label
                            key={i}
                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            <input
                                type="checkbox"
                                checked={visible}
                                onChange={() => onToggle(i)}
                                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-500"
                            />
                            {visible ? (
                                <Eye className="h-3 w-3 text-slate-400" />
                            ) : (
                                <EyeOff className="h-3 w-3 text-slate-300 dark:text-slate-500" />
                            )}
                            <span className="truncate">
                                {header !== '' ? String(header) : `Column ${i + 1}`}
                            </span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}
