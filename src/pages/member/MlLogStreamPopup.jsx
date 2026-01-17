import { useState, useEffect, useRef } from 'react';
import { send } from '@/util/ClientUtil';

const MAX_LOGS = 10000; // 최대 로그 개수
const POLLING_INTERVAL = 2000; // 2초

/**
 * ML 프로그램 로그 실시간 추적 팝업 페이지
 * - 독립 브라우저 창으로 열림
 * - 폴링 방식을 통한 실시간 로그 스트리밍
 * - 검색 기능 (Ctrl+F)
 */
export default function MlLogStreamPopup() {
    const [logs, setLogs] = useState([]);
    const [isPolling, setIsPolling] = useState(false);
    const [autoScroll, setAutoScroll] = useState(true);
    const [lastLine, setLastLine] = useState(0);
    const [error, setError] = useState('');

    // 검색 관련 상태
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);

    const pollingIntervalRef = useRef(null);
    const logContainerRef = useRef(null);
    const searchInputRef = useRef(null);

    // 자동 스크롤
    useEffect(() => {
        if (autoScroll && logContainerRef.current && !showSearch) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs, autoScroll, showSearch]);

    // Ctrl+F 키보드 단축키
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                setShowSearch(true);
                setTimeout(() => {
                    searchInputRef.current?.focus();
                }, 100);
            }
            // ESC로 검색 닫기
            if (e.key === 'Escape' && showSearch) {
                setShowSearch(false);
                setSearchQuery('');
                setSearchResults([]);
                setCurrentSearchIndex(-1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showSearch]);

    // 검색 실행
    useEffect(() => {
        if (!searchQuery) {
            setSearchResults([]);
            setCurrentSearchIndex(-1);
            return;
        }

        const results = [];
        const query = caseSensitive ? searchQuery : searchQuery.toLowerCase();

        logs.forEach((log, index) => {
            const logText = `[${log.timestamp}] ${log.message}`;
            const searchText = caseSensitive ? logText : logText.toLowerCase();

            if (searchText.includes(query)) {
                results.push(index);
            }
        });

        setSearchResults(results);
        setCurrentSearchIndex(results.length > 0 ? 0 : -1);

        // 첫 번째 결과로 스크롤
        if (results.length > 0) {
            scrollToSearchResult(0);
        }
    }, [searchQuery, caseSensitive, logs]);

    // 검색 결과로 스크롤
    const scrollToSearchResult = (resultIndex) => {
        if (resultIndex < 0 || resultIndex >= searchResults.length) return;

        const logIndex = searchResults[resultIndex];
        const logElement = document.getElementById(`log-${logIndex}`);

        if (logElement && logContainerRef.current) {
            const containerRect = logContainerRef.current.getBoundingClientRect();
            const elementRect = logElement.getBoundingClientRect();
            const scrollTop = logContainerRef.current.scrollTop;
            const offset = elementRect.top - containerRect.top + scrollTop - containerRect.height / 2;

            logContainerRef.current.scrollTo({
                top: offset,
                behavior: 'smooth'
            });
        }
    };

    // 이전 검색 결과
    const handlePreviousSearch = () => {
        if (searchResults.length === 0) return;
        const newIndex = currentSearchIndex > 0 ? currentSearchIndex - 1 : searchResults.length - 1;
        setCurrentSearchIndex(newIndex);
        scrollToSearchResult(newIndex);
    };

    // 다음 검색 결과
    const handleNextSearch = () => {
        if (searchResults.length === 0) return;
        const newIndex = currentSearchIndex < searchResults.length - 1 ? currentSearchIndex + 1 : 0;
        setCurrentSearchIndex(newIndex);
        scrollToSearchResult(newIndex);
    };

    // 폴링 로직
    useEffect(() => {
        if (!isPolling) {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
            return;
        }

        const fetchLogs = async () => {
            try {
                const { data, error: apiError } = await send('/dart/ml/logs/stream/latest', { lastLine }, 'GET');

                if (apiError) {
                    setError(apiError);
                } else if (data && data.response) {
                    const content = data.response.content;
                    const endLine = data.response.endLine;

                    if (content && content.trim()) {
                        // 새로운 로그 라인 추가
                        const newLines = content.split('\n').filter(line => line.trim());
                        if (newLines.length > 0) {
                            const timestamp = new Date().toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false
                            });

                            setLogs(prevLogs => {
                                const newLogs = [
                                    ...prevLogs,
                                    ...newLines.map(line => ({ timestamp, message: line }))
                                ];
                                // 최대 개수 제한
                                if (newLogs.length > MAX_LOGS) {
                                    return newLogs.slice(-MAX_LOGS);
                                }
                                return newLogs;
                            });

                            setLastLine(endLine);
                        }
                    }
                    setError('');
                }
            } catch (err) {
                setError('로그 조회 중 오류가 발생했습니다.');
            }
        };

        // 초기 로드
        fetchLogs();

        // 폴링 시작
        pollingIntervalRef.current = setInterval(fetchLogs, POLLING_INTERVAL);

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [isPolling, lastLine]);

    const handleStart = () => {
        setIsPolling(true);
        setError('');
        addSystemLog('폴링 시작됨');
    };

    const handleStop = () => {
        setIsPolling(false);
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        addSystemLog('폴링 종료됨');
    };

    const handleClearLogs = () => {
        setLogs([]);
        setLastLine(0);
        setSearchResults([]);
        setCurrentSearchIndex(-1);
    };

    const addSystemLog = (message) => {
        const timestamp = new Date().toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        setLogs(prevLogs => {
            const newLogs = [...prevLogs, { timestamp, message: `[시스템] ${message}` }];
            if (newLogs.length > MAX_LOGS) {
                return newLogs.slice(-MAX_LOGS);
            }
            return newLogs;
        });
    };

    // 텍스트 하이라이팅
    const highlightText = (text, shouldHighlight) => {
        if (!shouldHighlight || !searchQuery) {
            return text;
        }

        const query = caseSensitive ? searchQuery : searchQuery.toLowerCase();
        const searchText = caseSensitive ? text : text.toLowerCase();
        const parts = [];
        let lastIndex = 0;

        let index = searchText.indexOf(query);
        while (index !== -1) {
            // 매칭 전 텍스트
            if (index > lastIndex) {
                parts.push({
                    text: text.substring(lastIndex, index),
                    highlight: false
                });
            }
            // 매칭된 텍스트
            parts.push({
                text: text.substring(index, index + query.length),
                highlight: true
            });
            lastIndex = index + query.length;
            index = searchText.indexOf(query, lastIndex);
        }

        // 나머지 텍스트
        if (lastIndex < text.length) {
            parts.push({
                text: text.substring(lastIndex),
                highlight: false
            });
        }

        return (
            <>
                {parts.map((part, i) => (
                    part.highlight ? (
                        <mark key={i} className="bg-yellow-400 dark:bg-yellow-600 text-slate-900 dark:text-white px-0.5 rounded">
                            {part.text}
                        </mark>
                    ) : (
                        <span key={i}>{part.text}</span>
                    )
                ))}
            </>
        );
    };

    return (
        <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-900">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isPolling ? 'bg-white/80 animate-pulse' : 'bg-white/40'}`}></div>
                    <h1 className="text-base sm:text-lg font-semibold text-white">
                        주식 예측 프로그램 실시간 로그
                    </h1>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isPolling
                        ? 'bg-green-500/20 text-green-100 border border-green-300/30'
                        : 'bg-red-500/20 text-red-100 border border-red-300/30'
                        }`}>
                        {isPolling ? '연결됨' : '연결 끊김'}
                    </span>
                </div>
                <button
                    onClick={() => window.close()}
                    className="text-white/80 hover:text-white transition-colors"
                    title="창 닫기"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* 컨트롤 영역 */}
            <div className="px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                <div className="flex flex-wrap gap-2 items-center justify-between mb-2">
                    <div className="flex gap-2">
                        {!isPolling ? (
                            <button
                                onClick={handleStart}
                                className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors shadow-sm"
                            >
                                연결 시작
                            </button>
                        ) : (
                            <button
                                onClick={handleStop}
                                className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-colors shadow-sm"
                            >
                                연결 종료
                            </button>
                        )}
                        <button
                            onClick={handleClearLogs}
                            className="px-3 py-1.5 rounded-lg bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium transition-colors shadow-sm"
                        >
                            로그 지우기
                        </button>
                        <button
                            onClick={() => {
                                setShowSearch(!showSearch);
                                if (!showSearch) {
                                    setTimeout(() => searchInputRef.current?.focus(), 100);
                                }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-sm"
                            title="Ctrl+F"
                        >
                            <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            검색
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoScroll}
                                onChange={(e) => setAutoScroll(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span>자동 스크롤</span>
                        </label>
                        <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                            {logs.length}/{MAX_LOGS}
                        </span>
                    </div>
                </div>

                {/* 검색 바 */}
                {showSearch && (
                    <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.shiftKey ? handlePreviousSearch() : handleNextSearch();
                                }
                            }}
                            placeholder="검색어 입력... (Enter: 다음, Shift+Enter: 이전)"
                            className="flex-1 px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <label className="flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300 cursor-pointer whitespace-nowrap">
                            <input
                                type="checkbox"
                                checked={caseSensitive}
                                onChange={(e) => setCaseSensitive(e.target.checked)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                            />
                            <span>대소문자</span>
                        </label>
                        <span className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded whitespace-nowrap">
                            {searchResults.length > 0
                                ? `${currentSearchIndex + 1}/${searchResults.length}`
                                : '0/0'
                            }
                        </span>
                        <div className="flex gap-1">
                            <button
                                onClick={handlePreviousSearch}
                                disabled={searchResults.length === 0}
                                className="p-1.5 rounded bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="이전 (Shift+Enter)"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={handleNextSearch}
                                disabled={searchResults.length === 0}
                                className="p-1.5 rounded bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="다음 (Enter)"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                        <button
                            onClick={() => {
                                setShowSearch(false);
                                setSearchQuery('');
                                setSearchResults([]);
                                setCurrentSearchIndex(-1);
                            }}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
                            title="검색 닫기 (ESC)"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* 로그 표시 영역 */}
            <div
                ref={logContainerRef}
                className="flex-1 overflow-y-auto p-4 bg-slate-900 dark:bg-black"
                style={{ fontFamily: '"D2Coding", "D2Coding ligature", Consolas, Monaco, "Courier New", monospace' }}
            >
                {error && (
                    <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-700 rounded-lg">
                        <p className="text-sm text-red-300">[오류] {error}</p>
                    </div>
                )}

                {logs.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <svg className="w-16 h-16 mx-auto mb-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-slate-500 text-lg mb-2">로그가 없습니다</p>
                            <p className="text-sm text-slate-600">
                                {isPolling ? '로그를 기다리는 중...' : '연결을 시작하세요'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {logs.map((log, idx) => {
                            const isSearchResult = searchResults.includes(idx);
                            const isCurrentResult = searchResults[currentSearchIndex] === idx;

                            return (
                                <div
                                    key={idx}
                                    id={`log-${idx}`}
                                    className={`text-sm leading-relaxed px-2 py-1 rounded transition-all ${isCurrentResult
                                        ? 'bg-indigo-900/50 dark:bg-indigo-900/70 ring-2 ring-indigo-500'
                                        : isSearchResult
                                            ? 'bg-slate-800/70 dark:bg-slate-900/70'
                                            : 'hover:bg-slate-800 dark:hover:bg-slate-900'
                                        }`}
                                >
                                    <span className="text-slate-500 dark:text-slate-600 mr-2">
                                        {highlightText(`[${log.timestamp}]`, isSearchResult)}
                                    </span>
                                    <span className={
                                        log.message.includes('[오류]') || log.message.includes('[ERROR]')
                                            ? 'text-red-400'
                                            : log.message.includes('[경고]') || log.message.includes('[WARN]')
                                                ? 'text-yellow-400'
                                                : log.message.includes('[시스템]')
                                                    ? 'text-cyan-400'
                                                    : 'text-green-400'
                                    }>
                                        {highlightText(log.message, isSearchResult)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 푸터 */}
            <div className="px-4 sm:px-6 py-2 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>Endpoint: GET /dart/ml/logs/stream/latest | Polling: {POLLING_INTERVAL / 1000}s | Ctrl+F: 검색</span>
                    <span>Max Logs: {MAX_LOGS.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
}
