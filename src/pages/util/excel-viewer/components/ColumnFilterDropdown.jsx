import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';

const MAX_DISPLAY = 500;

export default function ColumnFilterDropdown({
    anchorRect,
    uniqueValues,
    currentFilter, // Set or null
    onApply,
    onClose,
}) {
    const [search, setSearch] = useState('');
    const [checked, setChecked] = useState(() => {
        if (currentFilter) return new Set(currentFilter);
        return new Set(uniqueValues);
    });
    const dropdownRef = useRef(null);
    const searchRef = useRef(null);

    // 포커스
    useEffect(() => {
        searchRef.current?.focus();
    }, []);

    // 외부 클릭 닫기
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    // ESC 닫기
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const filteredValues = useMemo(() => {
        if (!search.trim()) return uniqueValues.slice(0, MAX_DISPLAY);
        const keyword = search.toLowerCase();
        return uniqueValues
            .filter((v) => v.toLowerCase().includes(keyword))
            .slice(0, MAX_DISPLAY);
    }, [uniqueValues, search]);

    const allVisibleChecked =
        filteredValues.length > 0 && filteredValues.every((v) => checked.has(v));

    const toggleAll = () => {
        setChecked((prev) => {
            const next = new Set(prev);
            if (allVisibleChecked) {
                filteredValues.forEach((v) => next.delete(v));
            } else {
                filteredValues.forEach((v) => next.add(v));
            }
            return next;
        });
    };

    const toggleOne = (val) => {
        setChecked((prev) => {
            const next = new Set(prev);
            if (next.has(val)) next.delete(val);
            else next.add(val);
            return next;
        });
    };

    const handleApply = () => {
        if (checked.size === uniqueValues.length) {
            onApply(null); // 전체 선택 = 필터 해제
        } else {
            onApply(Array.from(checked));
        }
        onClose();
    };

    const handleReset = () => {
        setChecked(new Set(uniqueValues));
        setSearch('');
    };

    // 드롭다운 위치 계산
    const style = {
        position: 'fixed',
        top: anchorRect.bottom + 2,
        left: anchorRect.left,
        zIndex: 9999,
    };

    return createPortal(
        <div
            ref={dropdownRef}
            style={style}
            className="w-64 rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800"
        >
            {/* 검색 */}
            <div className="border-b border-slate-200 p-2 dark:border-slate-700">
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                        ref={searchRef}
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="값 검색..."
                        className="w-full rounded border border-slate-300 bg-white py-1.5 pl-7 pr-2 text-xs text-slate-700 placeholder-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-500"
                    />
                </div>
            </div>

            {/* 전체 선택 */}
            <div className="border-b border-slate-200 px-2 py-1.5 dark:border-slate-700">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <input
                        type="checkbox"
                        checked={allVisibleChecked}
                        onChange={toggleAll}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-500"
                    />
                    <span className="font-medium">
                        {search.trim() ? '검색 결과 전체' : '전체 선택'}
                    </span>
                    <span className="ml-auto text-slate-400">
                        {filteredValues.length}
                    </span>
                </label>
            </div>

            {/* 체크박스 목록 */}
            <div className="max-h-52 overflow-y-auto p-1">
                {filteredValues.length === 0 ? (
                    <p className="py-3 text-center text-xs text-slate-400">
                        검색 결과가 없습니다.
                    </p>
                ) : (
                    filteredValues.map((val) => (
                        <label
                            key={val}
                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            <input
                                type="checkbox"
                                checked={checked.has(val)}
                                onChange={() => toggleOne(val)}
                                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-500"
                            />
                            <span className="truncate">
                                {val === '' ? '(빈 셀)' : val}
                            </span>
                        </label>
                    ))
                )}
            </div>

            {/* 하단 버튼 */}
            <div className="flex items-center justify-between border-t border-slate-200 p-2 dark:border-slate-700">
                <button
                    onClick={handleReset}
                    className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                    초기화
                </button>
                <button
                    onClick={handleApply}
                    className="rounded bg-sky-600 px-3 py-1 text-xs font-medium text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600"
                >
                    적용
                </button>
            </div>
        </div>,
        document.body,
    );
}
