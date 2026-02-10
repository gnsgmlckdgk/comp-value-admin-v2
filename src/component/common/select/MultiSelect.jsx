import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import useModalAnimation from '@/hooks/useModalAnimation';

/**
 * 다중 선택 가능한 드롭다운 컴포넌트
 * 체크박스 리스트와 선택된 항목을 칩으로 표시
 *
 * @component
 * @param {string[]} value - 선택된 값들의 배열
 * @param {function} onChange - 값 변경 핸들러 (newValue: string[]) => void
 * @param {Array<{ value: string, label: string }>} options - 선택 가능한 옵션 목록
 * @param {string} placeholder - 플레이스홀더 텍스트
 * @param {boolean} loading - 로딩 상태
 * @param {boolean} searchable - 검색 기능 활성화 여부
 * @param {boolean} showChips - 선택된 항목을 칩으로 표시할지 여부
 * @param {boolean} disabled - 비활성화 여부
 * @param {string} className - 추가 CSS 클래스
 *
 * @example
 * <MultiSelect
 *   value={['US', 'KR']}
 *   onChange={(newValue) => setCountries(newValue)}
 *   options={[{ value: 'US', label: 'United States' }, { value: 'KR', label: 'South Korea' }]}
 *   placeholder="국가 선택"
 *   searchable={true}
 *   showChips={true}
 * />
 */
function MultiSelect({
    value = [],
    onChange,
    options = [],
    placeholder = '선택하세요',
    loading = false,
    searchable = false,
    showChips = true,
    disabled = false,
    className = ''
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);
    const { shouldRender: showDropdown, isAnimatingOut: isDropdownClosing } = useModalAnimation(isOpen && !loading, 150);

    // 외부 클릭 감지하여 드롭다운 닫기
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // 검색어로 필터링된 옵션
    const filteredOptions = useMemo(() => {
        if (!searchable || !searchTerm) return options;

        const lowerSearch = searchTerm.toLowerCase();
        return options.filter(option =>
            option.label.toLowerCase().includes(lowerSearch) ||
            option.value.toLowerCase().includes(lowerSearch)
        );
    }, [options, searchTerm, searchable]);

    // 체크박스 토글
    const handleToggle = useCallback((optionValue) => {
        const newValue = value.includes(optionValue)
            ? value.filter(v => v !== optionValue)
            : [...value, optionValue];
        onChange(newValue);
    }, [value, onChange]);

    // 칩 제거
    const handleRemoveChip = useCallback((e, optionValue) => {
        e.stopPropagation();
        onChange(value.filter(v => v !== optionValue));
    }, [value, onChange]);

    // 전체 선택
    const handleSelectAll = useCallback(() => {
        const allValues = filteredOptions.map(opt => opt.value);
        onChange(allValues);
    }, [filteredOptions, onChange]);

    // 전체 해제
    const handleClearAll = useCallback(() => {
        onChange([]);
    }, [onChange]);

    // 키보드 네비게이션
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
        } else if (e.key === 'Enter' && !isOpen) {
            setIsOpen(true);
        }
    }, [isOpen]);

    // 선택된 항목의 라벨 찾기
    const getSelectedLabels = () => {
        return value.map(v => {
            const option = options.find(opt => opt.value === v);
            return option ? option.label : v;
        });
    };

    // 표시할 텍스트
    const displayText = value.length > 0
        ? `${value.length}개 선택됨`
        : placeholder;

    return (
        <div ref={dropdownRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
            {/* 선택된 칩 표시 */}
            {showChips && value.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {getSelectedLabels().map((label, idx) => (
                        <span
                            key={value[idx]}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                        >
                            {label}
                            <button
                                type="button"
                                onClick={(e) => handleRemoveChip(e, value[idx])}
                                className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded p-0.5 transition-colors"
                                aria-label={`Remove ${label}`}
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* 트리거 버튼 */}
            <button
                type="button"
                onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
                disabled={disabled || loading}
                className={`w-full px-3 py-2 text-left rounded-lg border border-slate-300 bg-white text-sm transition-all
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}
                    dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:hover:border-slate-500 dark:focus:ring-blue-400
                    ${isOpen ? 'ring-2 ring-blue-500 border-blue-500 dark:ring-blue-400' : ''}`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <div className="flex items-center justify-between">
                    <span className={value.length > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}>
                        {loading ? '로딩 중...' : displayText}
                    </span>
                    <svg
                        className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {/* 드롭다운 패널 */}
            {showDropdown && (
                <div className={`absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg dark:bg-slate-700 dark:border-slate-600 max-h-80 overflow-hidden animate__animated ${isDropdownClosing ? 'animate__fadeOutUp' : 'animate__fadeInDown'}`} style={{ animationDuration: '0.15s' }}>
                    {/* 검색 입력 */}
                    {searchable && (
                        <div className="p-2 border-b border-slate-200 dark:border-slate-600">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="검색..."
                                className="w-full px-2 py-1.5 text-sm rounded border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-600 dark:border-slate-500 dark:text-white dark:placeholder-slate-400"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    )}

                    {/* 전체 선택/해제 버튼 */}
                    {filteredOptions.length > 0 && (
                        <div className="flex gap-1 p-2 border-b border-slate-200 dark:border-slate-600">
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className="flex-1 px-2 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 transition-colors"
                            >
                                전체 선택
                            </button>
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="flex-1 px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 transition-colors"
                            >
                                전체 해제
                            </button>
                        </div>
                    )}

                    {/* 옵션 리스트 */}
                    <div className="overflow-y-auto max-h-64" role="listbox">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <label
                                    key={option.value}
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-600 cursor-pointer transition-colors"
                                    role="option"
                                    aria-selected={value.includes(option.value)}
                                >
                                    <input
                                        type="checkbox"
                                        checked={value.includes(option.value)}
                                        onChange={() => handleToggle(option.value)}
                                        className="w-4 h-4 text-blue-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                                    />
                                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">
                                        {option.label}
                                    </span>
                                </label>
                            ))
                        ) : (
                            <div className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                                {searchTerm ? '검색 결과가 없습니다' : '옵션이 없습니다'}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default MultiSelect;
