import { useState, useCallback, useMemo } from 'react';
import { Copy, Trash2, Minimize2, Maximize2, ChevronRight, ChevronDown, Braces } from 'lucide-react';
import PageTitle from '@/component/common/display/PageTitle';

/* ────────────────────────────────────────────
   JSON 트리 노드 (재귀 컴포넌트)
   ──────────────────────────────────────────── */
function JsonNode({ keyName, value, path, collapsedPaths, toggleCollapse, depth = 0 }) {
    const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
    const isArray = Array.isArray(value);
    const isCollapsible = isObject || isArray;
    const isCollapsed = collapsedPaths.has(path);

    // 값 타입에 따른 색상 클래스
    const getValueClass = (val) => {
        if (val === null) return 'text-slate-400 dark:text-slate-500';
        switch (typeof val) {
            case 'string':  return 'text-sky-600 dark:text-sky-400';
            case 'number':  return 'text-orange-600 dark:text-orange-400';
            case 'boolean': return 'text-indigo-600 dark:text-indigo-400';
            default:        return 'text-slate-800 dark:text-slate-200';
        }
    };

    // 값 표시 문자열
    const renderValue = (val) => {
        if (val === null) return 'null';
        if (typeof val === 'string') return `"${val}"`;
        return String(val);
    };

    // 키 라벨 (배열 인덱스 vs 객체 키)
    const keyLabel = keyName !== undefined
        ? typeof keyName === 'number' ? `[${keyName}]` : `"${keyName}"`
        : null;

    // 접힌 상태일 때 미리보기
    const collapsedPreview = () => {
        if (isArray) {
            const len = value.length;
            return `Array(${len})`;
        }
        if (isObject) {
            const keys = Object.keys(value);
            return `{${keys.length} keys}`;
        }
        return '';
    };

    const paddingLeft = depth * 20;

    if (!isCollapsible) {
        // 리프 노드
        return (
            <div className="flex items-start py-0.5 select-text" style={{ paddingLeft }}>
                {keyLabel !== null && (
                    <span className="text-slate-800 dark:text-slate-200 shrink-0">
                        {keyLabel}<span className="text-slate-400 dark:text-slate-500">: </span>
                    </span>
                )}
                <span className={getValueClass(value)}>{renderValue(value)}</span>
            </div>
        );
    }

    // 접기/펼치기 가능한 노드 (객체 또는 배열)
    const bracket = isArray ? ['[', ']'] : ['{', '}'];
    const entries = isArray
        ? value.map((v, i) => [i, v])
        : Object.entries(value);

    return (
        <div>
            <div
                className="flex items-start py-0.5 cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-700/40 rounded"
                style={{ paddingLeft }}
                onClick={() => toggleCollapse(path)}
            >
                <span className="shrink-0 mr-1 mt-0.5 text-slate-400 dark:text-slate-500">
                    {isCollapsed
                        ? <ChevronRight className="h-3.5 w-3.5" />
                        : <ChevronDown className="h-3.5 w-3.5" />
                    }
                </span>
                {keyLabel !== null && (
                    <span className="text-slate-800 dark:text-slate-200 shrink-0">
                        {keyLabel}<span className="text-slate-400 dark:text-slate-500">: </span>
                    </span>
                )}
                {isCollapsed ? (
                    <span className="text-slate-400 dark:text-slate-500 text-xs ml-1">
                        {bracket[0]} {collapsedPreview()} {bracket[1]}
                    </span>
                ) : (
                    <span className="text-slate-400 dark:text-slate-500">{bracket[0]}</span>
                )}
            </div>

            {!isCollapsed && (
                <>
                    {entries.map(([k, v]) => (
                        <JsonNode
                            key={`${path}.${k}`}
                            keyName={k}
                            value={v}
                            path={`${path}.${k}`}
                            collapsedPaths={collapsedPaths}
                            toggleCollapse={toggleCollapse}
                            depth={depth + 1}
                        />
                    ))}
                    <div className="py-0.5 text-slate-400 dark:text-slate-500" style={{ paddingLeft }}>
                        {bracket[1]}
                    </div>
                </>
            )}
        </div>
    );
}

/* ────────────────────────────────────────────
   모든 경로 수집 (전체 접기용)
   ──────────────────────────────────────────── */
function collectAllPaths(value, path = '$') {
    const paths = [];
    if (value !== null && typeof value === 'object') {
        paths.push(path);
        const entries = Array.isArray(value)
            ? value.map((v, i) => [i, v])
            : Object.entries(value);
        for (const [k, v] of entries) {
            paths.push(...collectAllPaths(v, `${path}.${k}`));
        }
    }
    return paths;
}

/* ────────────────────────────────────────────
   JSON 파싱 에러에서 위치 추출
   ──────────────────────────────────────────── */
function parseJsonError(errorMessage) {
    // Chrome: "at position 42"
    const posMatch = errorMessage.match(/position\s+(\d+)/i);
    if (posMatch) {
        return { message: errorMessage, position: parseInt(posMatch[1], 10) };
    }
    // Firefox: "at line 3 column 5"
    const lineColMatch = errorMessage.match(/line\s+(\d+)\s+column\s+(\d+)/i);
    if (lineColMatch) {
        return { message: errorMessage, line: parseInt(lineColMatch[1], 10), column: parseInt(lineColMatch[2], 10) };
    }
    return { message: errorMessage };
}

/* ────────────────────────────────────────────
   툴바 버튼 공통 컴포넌트
   ──────────────────────────────────────────── */
function ToolbarButton({ onClick, disabled, icon, label, variant = 'default' }) {
    const base = 'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
    const variants = {
        default: 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
        primary: 'border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-900/30 dark:text-sky-300 dark:hover:bg-sky-900/50',
        danger:  'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50',
    };

    const IconComponent = icon;
    return (
        <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]}`}>
            <IconComponent className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}

/* ────────────────────────────────────────────
   메인 컴포넌트
   ──────────────────────────────────────────── */
export default function JsonViewer() {
    const [input, setInput] = useState('');
    const [parsed, setParsed] = useState(null);
    const [parseError, setParseError] = useState(null);
    const [collapsedPaths, setCollapsedPaths] = useState(new Set());
    const [copySuccess, setCopySuccess] = useState(false);

    // JSON 파싱 (input 변경 시)
    const handleInputChange = useCallback((text) => {
        setInput(text);
        if (!text.trim()) {
            setParsed(null);
            setParseError(null);
            return;
        }
        try {
            const result = JSON.parse(text);
            setParsed(result);
            setParseError(null);
        } catch (e) {
            setParsed(null);
            setParseError(parseJsonError(e.message));
        }
    }, []);

    // 접기/펼치기 토글
    const toggleCollapse = useCallback((path) => {
        setCollapsedPaths((prev) => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    }, []);

    // 전체 접기
    const collapseAll = useCallback(() => {
        if (parsed === null) return;
        const allPaths = collectAllPaths(parsed);
        setCollapsedPaths(new Set(allPaths));
    }, [parsed]);

    // 전체 펼치기
    const expandAll = useCallback(() => {
        setCollapsedPaths(new Set());
    }, []);

    // 포맷팅 (들여쓰기 정렬)
    const handleFormat = useCallback(() => {
        if (parsed === null) return;
        setInput(JSON.stringify(parsed, null, 2));
    }, [parsed]);

    // 압축 (한 줄)
    const handleMinify = useCallback(() => {
        if (parsed === null) return;
        setInput(JSON.stringify(parsed));
    }, [parsed]);

    // 클립보드 복사
    const handleCopy = useCallback(() => {
        if (parsed === null) return;
        navigator.clipboard.writeText(JSON.stringify(parsed, null, 2)).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    }, [parsed]);

    // 클리어
    const handleClear = useCallback(() => {
        setInput('');
        setParsed(null);
        setParseError(null);
        setCollapsedPaths(new Set());
    }, []);

    // textarea에서 Tab 키 지원
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const textarea = e.target;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newValue = input.substring(0, start) + '  ' + input.substring(end);
            setInput(newValue);
            handleInputChange(newValue);
            // 커서 위치 복원 (다음 렌더 사이클에서)
            requestAnimationFrame(() => {
                textarea.selectionStart = start + 2;
                textarea.selectionEnd = start + 2;
            });
        }
    }, [input, handleInputChange]);

    // 에러 위치 정보 텍스트
    const errorLocationText = useMemo(() => {
        if (!parseError) return '';
        if (parseError.position !== undefined) return ` (위치: ${parseError.position})`;
        if (parseError.line !== undefined) return ` (${parseError.line}행 ${parseError.column}열)`;
        return '';
    }, [parseError]);

    const hasParsed = parsed !== null;

    return (
        <div>
            <PageTitle />

            <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                {/* 툴바 */}
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Braces className="h-5 w-5" />
                        <span className="text-sm font-semibold">JSON 뷰어</span>
                    </div>

                    <div className="mx-2 h-5 w-px bg-slate-200 dark:bg-slate-700" />

                    <ToolbarButton onClick={handleFormat} disabled={!hasParsed} icon={Maximize2} label="포맷" variant="primary" />
                    <ToolbarButton onClick={handleMinify} disabled={!hasParsed} icon={Minimize2} label="압축" />
                    <ToolbarButton onClick={handleCopy} disabled={!hasParsed} icon={Copy} label={copySuccess ? '복사됨!' : '복사'} />
                    <ToolbarButton onClick={handleClear} disabled={!input} icon={Trash2} label="클리어" variant="danger" />

                    <div className="mx-2 h-5 w-px bg-slate-200 dark:bg-slate-700" />

                    <ToolbarButton onClick={expandAll} disabled={!hasParsed} icon={Maximize2} label="전체 펼치기" />
                    <ToolbarButton onClick={collapseAll} disabled={!hasParsed} icon={Minimize2} label="전체 접기" />
                </div>

                {/* 에러 메시지 */}
                {parseError && (
                    <div className="mx-4 mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        <span className="font-medium">JSON 파싱 오류{errorLocationText}:</span>{' '}
                        {parseError.message}
                    </div>
                )}

                {/* 좌우(모바일: 상하) 분할 */}
                <div className="flex flex-col md:flex-row">
                    {/* 왼쪽: 입력 */}
                    <div className="flex-1 min-w-0 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700">
                        <div className="px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/50">
                            입력 (JSON)
                        </div>
                        <textarea
                            value={input}
                            onChange={(e) => handleInputChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder='{"key": "value"} 형태의 JSON을 입력하세요...'
                            spellCheck={false}
                            className="w-full h-[400px] md:h-[600px] p-4 font-mono text-sm leading-relaxed bg-white text-slate-900 dark:bg-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 resize-none focus:outline-none"
                        />
                    </div>

                    {/* 오른쪽: 트리 뷰 */}
                    <div className="flex-1 min-w-0">
                        <div className="px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/50">
                            트리 뷰
                        </div>
                        <div className="h-[400px] md:h-[600px] overflow-auto p-4 font-mono text-sm leading-relaxed">
                            {hasParsed ? (
                                <JsonNode
                                    value={parsed}
                                    path="$"
                                    collapsedPaths={collapsedPaths}
                                    toggleCollapse={toggleCollapse}
                                    depth={0}
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-slate-400 dark:text-slate-500">
                                    {input.trim()
                                        ? '유효한 JSON을 입력하면 트리 뷰가 표시됩니다.'
                                        : 'JSON을 입력하세요.'
                                    }
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
