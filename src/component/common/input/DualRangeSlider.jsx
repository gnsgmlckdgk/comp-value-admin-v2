import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * 듀얼 레인지 슬라이더 컴포넌트
 *
 * @param {Object} props
 * @param {string} props.label - 슬라이더 라벨
 * @param {number} props.min - 슬라이더 최소값
 * @param {number} props.max - 슬라이더 최대값
 * @param {number} props.step - 슬라이더 단계값
 * @param {number|string} props.valueMin - 현재 최소값
 * @param {number|string} props.valueMax - 현재 최대값
 * @param {function} props.onChangeMin - 최소값 변경 콜백
 * @param {function} props.onChangeMax - 최대값 변경 콜백
 * @param {boolean} props.enabled - 활성/비활성 상태
 * @param {function} props.onToggle - 토글 콜백
 * @param {string} [props.description] - 슬라이더 설명
 * @param {function} [props.formatDisplay] - 값 표시 커스텀 포맷 함수 (val) => string
 */
const DualRangeSlider = ({
    label,
    min,
    max,
    step,
    valueMin,
    valueMax,
    onChangeMin,
    onChangeMax,
    enabled,
    onToggle,
    description,
    formatDisplay,
}) => {
    const currentMin = valueMin === '' || valueMin === null || valueMin === undefined
        ? min
        : Number(valueMin);
    const currentMax = valueMax === '' || valueMax === null || valueMax === undefined
        ? max
        : Number(valueMax);

    useEffect(() => {
        if (enabled) {
            if (valueMin === '' || valueMin === null || valueMin === undefined) {
                onChangeMin?.(min);
            }
            if (valueMax === '' || valueMax === null || valueMax === undefined) {
                onChangeMax?.(max);
            }
        }
    }, [enabled]);

    const trackRef = useRef(null);

    const [editingField, setEditingField] = useState(null); // null | 'min' | 'max'
    const [editValue, setEditValue] = useState('');

    const minPercent = useMemo(() => ((currentMin - min) / (max - min)) * 100, [currentMin, min, max]);
    const maxPercent = useMemo(() => ((currentMax - min) / (max - min)) * 100, [currentMax, min, max]);

    // step 단위로 스냅
    const snapToStep = useCallback((val) => {
        const snapped = Math.round((val - min) / step) * step + min;
        return Math.min(max, Math.max(min, snapped));
    }, [min, max, step]);

    const handleMinChange = useCallback((e) => {
        const val = Number(e.target.value);
        if (val <= currentMax) {
            onChangeMin(val);
        }
    }, [currentMax, onChangeMin]);

    const handleMaxChange = useCallback((e) => {
        const val = Number(e.target.value);
        if (val >= currentMin) {
            onChangeMax(val);
        }
    }, [currentMin, onChangeMax]);

    // 트랙 클릭 시 가까운 thumb 이동 (겹침 문제 해결)
    const handleTrackClick = useCallback((e) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const clickedValue = snapToStep(min + percent * (max - min));

        const midpoint = (currentMin + currentMax) / 2;
        if (clickedValue <= midpoint) {
            onChangeMin(Math.min(clickedValue, currentMax));
        } else {
            onChangeMax(Math.max(clickedValue, currentMin));
        }
    }, [min, max, currentMin, currentMax, snapToStep, onChangeMin, onChangeMax]);

    const formatValue = (val) => {
        if (formatDisplay) return formatDisplay(val);
        if (step < 1) {
            const decimals = String(step).split('.')[1]?.length || 1;
            return Number(val).toFixed(decimals);
        }
        return String(val);
    };

    const startEdit = (field) => {
        setEditingField(field);
        setEditValue(String(field === 'min' ? currentMin : currentMax));
    };

    const cancelEdit = () => {
        setEditingField(null);
        setEditValue('');
    };

    const commitEdit = () => {
        const parsed = Number(editValue);
        if (Number.isNaN(parsed)) {
            cancelEdit();
            return;
        }
        let val = snapToStep(parsed);
        val = Math.min(max, Math.max(min, val));
        if (editingField === 'min') {
            val = Math.min(val, currentMax);
            onChangeMin(val);
        } else {
            val = Math.max(val, currentMin);
            onChangeMax(val);
        }
        setEditingField(null);
        setEditValue('');
    };

    const handleEditKeyDown = (e) => {
        if (e.key === 'Enter') {
            commitEdit();
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    };

    const renderEditableValue = (field) => {
        const value = field === 'min' ? currentMin : currentMax;
        if (editingField === field) {
            return (
                <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={handleEditKeyDown}
                    autoFocus
                    className="w-36 text-center text-sm font-medium text-blue-600 dark:text-blue-400 bg-slate-100 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded px-1 py-0 outline-none focus:border-blue-500 dark:focus:border-blue-400"
                />
            );
        }
        return (
            <span
                onClick={() => startEdit(field)}
                className="cursor-pointer hover:underline decoration-dotted underline-offset-2"
            >
                {formatValue(value)}
            </span>
        );
    };

    return (
        <div className={`rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 p-3 md:p-4 transition-opacity ${!enabled ? 'opacity-40' : ''}`}>
            {/* 상단: 라벨 + 토글 */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{label}</span>
                    {description && (
                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{description}</span>
                    )}
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    onClick={onToggle}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-700 ${
                        enabled ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-500'
                    }`}
                >
                    <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                    />
                </button>
            </div>

            {/* 중간: 듀얼 레인지 슬라이더 */}
            <div className={`relative ${!enabled ? 'pointer-events-none' : ''}`}>
                {/* 클릭 가능한 트랙 영역 (thumb 겹침 시에도 조작 가능) */}
                <div
                    ref={trackRef}
                    onClick={handleTrackClick}
                    className="relative h-2 rounded-full bg-slate-200 dark:bg-slate-600 cursor-pointer"
                >
                    {/* 선택 범위 하이라이트 */}
                    <div
                        className="absolute h-2 rounded-full bg-blue-500 pointer-events-none"
                        style={{
                            left: `${minPercent}%`,
                            width: `${maxPercent - minPercent}%`,
                        }}
                    />
                </div>

                {/* 레인지 인풋 2개 (오버레이) */}
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={currentMin}
                    onChange={handleMinChange}
                    className="dual-range-thumb absolute top-0 left-0 w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-30 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-blue-500 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:relative [&::-moz-range-thumb]:z-30"
                    style={{ zIndex: currentMin > max - step ? 40 : 30 }}
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={currentMax}
                    onChange={handleMaxChange}
                    className="dual-range-thumb absolute top-0 left-0 w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-20 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-blue-500 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:relative [&::-moz-range-thumb]:z-20"
                    style={{ zIndex: 20 }}
                />
            </div>

            {/* 하단: 현재 값 표시 */}
            <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">{formatValue(min)}</span>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {enabled ? (
                        <>{renderEditableValue('min')} ~ {renderEditableValue('max')}</>
                    ) : '비활성'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{formatValue(max)}</span>
            </div>
        </div>
    );
};

export default DualRangeSlider;
