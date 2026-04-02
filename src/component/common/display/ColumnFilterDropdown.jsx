import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';

const MAX_DISPLAY = 500;

/**
 * 엑셀 스타일 컬럼 필터 드롭다운
 * - 헤더 클릭 시 해당 컬럼의 고유값 목록을 체크박스로 표시
 * - 검색, 전체 선택/해제, 다중 선택 지원
 *
 * @param {DOMRect} anchorRect - 드롭다운 위치 기준 (헤더 셀의 getBoundingClientRect)
 * @param {string[]} uniqueValues - 해당 컬럼의 고유값 목록
 * @param {Set|null} currentFilter - 현재 적용된 필터 (null이면 전체 선택 상태)
 * @param {function} onApply - 필터 적용 콜백 (null: 필터 해제, string[]: 선택된 값들)
 * @param {function} onClose - 드롭다운 닫기 콜백
 * @param {function} [labelFn] - 값 → 표시 라벨 변환 함수 (optional)
 */
export default function ColumnFilterDropdown({
    anchorRect,
    uniqueValues,
    currentFilter,
    onApply,
    onClose,
    labelFn,
}) {
    const [search, setSearch] = useState('');
    const [checked, setChecked] = useState(() => {
        if (currentFilter) return new Set(currentFilter);
        return new Set(uniqueValues);
    });
    const dropdownRef = useRef(null);
    const searchRef = useRef(null);

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

    const getLabel = (val) => {
        if (labelFn) return labelFn(val);
        return val === '' ? '(빈 값)' : val;
    };

    const filteredValues = useMemo(() => {
        if (!search.trim()) return uniqueValues.slice(0, MAX_DISPLAY);
        const keyword = search.toLowerCase();
        return uniqueValues
            .filter((v) => {
                if (v.toLowerCase().includes(keyword)) return true;
                if (labelFn && getLabel(v).toLowerCase().includes(keyword)) return true;
                return false;
            })
            .slice(0, MAX_DISPLAY);
    }, [uniqueValues, search, labelFn]);

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
            onApply(null);
        } else {
            onApply(Array.from(checked));
        }
        onClose();
    };

    const handleReset = () => {
        setChecked(new Set(uniqueValues));
        setSearch('');
    };

    // 드롭다운 위치: 화면 밖으로 넘어가면 보정
    const style = useMemo(() => {
        const top = anchorRect.bottom + 2;
        let left = anchorRect.left;
        const dropdownWidth = 256; // w-64
        if (left + dropdownWidth > window.innerWidth - 16) {
            left = window.innerWidth - dropdownWidth - 16;
        }
        if (left < 8) left = 8;
        return { position: 'fixed', top, left, zIndex: 9999 };
    }, [anchorRect]);

    return createPortal(
        <div
            ref={dropdownRef}
            style={style}
            className="w-64 rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800 animate-in fade-in duration-150"
        >
            {/* 검색 */}
            <div className="border-b border-slate-200 p-2 dark:border-slate-700">
                <div className="relative">
                    <svg className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        ref={searchRef}
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="값 검색..."
                        className="w-full rounded border border-slate-300 bg-white py-1.5 pl-7 pr-2 text-xs text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-500"
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
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-500"
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
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-500"
                            />
                            <span className="truncate">{getLabel(val)}</span>
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
                    className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                    적용
                </button>
            </div>
        </div>,
        document.body,
    );
}
