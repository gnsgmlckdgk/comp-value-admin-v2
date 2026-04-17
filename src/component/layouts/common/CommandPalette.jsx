import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTab } from '@/context/TabContext';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import useModalAnimation from '@/hooks/useModalAnimation';

const FOCUS_DELAY_MS = 50;
const ANIM_DURATION_MS = 200;

export default function CommandPalette({ open, onClose }) {
    const { shouldRender, isAnimatingOut } = useModalAnimation(open, ANIM_DURATION_MS);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef(null);
    const activeRef = useRef(null);
    const navigate = useNavigate();
    const { openTab } = useTab();
    const { results } = useGlobalSearch(query);

    useEffect(() => {
        if (open) {
            setQuery('');
            setActiveIndex(0);
            const t = setTimeout(() => inputRef.current?.focus(), FOCUS_DELAY_MS);
            return () => clearTimeout(t);
        }
    }, [open]);

    useEffect(() => {
        setActiveIndex(0);
    }, [query]);

    useEffect(() => {
        activeRef.current?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    const grouped = useMemo(() => {
        const map = new Map();
        results.forEach((r, idx) => {
            if (!map.has(r.section)) map.set(r.section, []);
            map.get(r.section).push({ ...r, flatIndex: idx });
        });
        return Array.from(map.entries());
    }, [results]);

    const handleSelect = (item) => {
        onClose();
        openTab(item.path);
        navigate(item.path);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
            return;
        }
        if (!results.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(i => (i + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(i => (i - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const item = results[activeIndex];
            if (item) handleSelect(item);
        }
    };

    if (!shouldRender) return null;

    return (
        <div
            className={`fixed inset-0 z-[90] flex items-start justify-center bg-slate-900/40 dark:bg-black/60 px-4 pt-[10vh] animate__animated ${isAnimatingOut ? 'animate__fadeOut' : 'animate__fadeIn'}`}
            style={{ animationDuration: '0.2s' }}
            onClick={onClose}
        >
            <div
                className={`relative w-full max-w-lg rounded-2xl bg-white text-slate-900 shadow-xl ring-1 ring-slate-900/5 dark:bg-slate-800 dark:text-white dark:ring-slate-700 animate__animated ${isAnimatingOut ? 'animate__zoomOut' : 'animate__zoomIn'}`}
                style={{ animationDuration: '0.2s' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-400 dark:text-slate-500">
                        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 3.41 9.82l3.13 3.13a.75.75 0 1 0 1.06-1.06l-3.13-3.13A5.5 5.5 0 0 0 9 3.5zM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0z" clipRule="evenodd" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="메뉴 검색..."
                        className="flex-1 bg-transparent text-sm outline-none placeholder-slate-400 dark:placeholder-slate-400"
                    />
                    <kbd className="hidden sm:inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400">
                        ESC
                    </kbd>
                </div>
                <div className="max-h-[50vh] overflow-y-auto p-2">
                    {results.length === 0 ? (
                        <div className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                            일치하는 메뉴가 없습니다
                        </div>
                    ) : (
                        grouped.map(([section, items]) => (
                            <div key={section} className="mb-2 last:mb-0">
                                <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    {section}
                                </div>
                                {items.map((item) => {
                                    const isActive = item.flatIndex === activeIndex;
                                    return (
                                        <button
                                            key={item.key}
                                            ref={isActive ? activeRef : null}
                                            onClick={() => handleSelect(item)}
                                            onMouseEnter={() => setActiveIndex(item.flatIndex)}
                                            className={`flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors ${
                                                isActive
                                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                            }`}
                                        >
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
