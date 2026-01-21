import { useState, useEffect } from 'react';
import { send } from '@/util/ClientUtil';

/**
 * CommonLogManagementModal
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - title: string
 * - apiEndpoints: { list: string, content: (filename) => string }
 * - streamUrl: string
 * - windowName: string
 * - theme: 'blue' | 'indigo' | 'orange' | 'green' (default: 'blue')
 */
export default function CommonLogManagementModal({
    isOpen,
    onClose,
    title,
    apiEndpoints,
    streamUrl,
    windowName,
    theme = 'blue'
}) {
    const [activeTab, setActiveTab] = useState('fileList');
    const [fileList, setFileList] = useState([]);
    const [selectedFile, setSelectedFile] = useState('');
    const [logContent, setLogContent] = useState('');
    const [loading, setLoading] = useState(false); // 전체(파일목록) 로딩
    const [contentLoading, setContentLoading] = useState(false); // 로그 내용 로딩
    const [error, setError] = useState('');
    
    // 검색 및 필터링 상태
    const [searchTerm, setSearchTerm] = useState('');

    // 모바일 뷰 상태 (true: 목록 보기, false: 내용 보기) - 모바일에서만 유효
    const [showMobileList, setShowMobileList] = useState(true);

    // Theme configuration
    const themeConfig = {
        blue: {
            headerGradient: 'from-blue-500 to-indigo-600',
            activeTabBg: 'bg-blue-600',
            activeTabBgHover: 'hover:bg-blue-700',
            focusRing: 'focus:ring-blue-500',
            loaderBorder: 'border-blue-500',
            iconBg: 'bg-blue-100 dark:bg-blue-900/30',
            iconText: 'text-blue-600 dark:text-blue-400',
            streamBtnGradient: 'from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
            selectedItemBg: 'bg-blue-50 dark:bg-blue-900/20',
            selectedItemBorder: 'border-blue-200 dark:border-blue-800',
            selectedItemText: 'text-blue-700 dark:text-blue-300',
            backButtonText: 'text-blue-600 dark:text-blue-400'
        },
        indigo: {
            headerGradient: 'from-indigo-500 to-purple-600',
            activeTabBg: 'bg-indigo-600',
            activeTabBgHover: 'hover:bg-indigo-700',
            focusRing: 'focus:ring-indigo-500',
            loaderBorder: 'border-indigo-500',
            iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
            iconText: 'text-indigo-600 dark:text-indigo-400',
            streamBtnGradient: 'from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700',
            selectedItemBg: 'bg-indigo-50 dark:bg-indigo-900/20',
            selectedItemBorder: 'border-indigo-200 dark:border-indigo-800',
            selectedItemText: 'text-indigo-700 dark:text-indigo-300',
            backButtonText: 'text-indigo-600 dark:text-indigo-400'
        },
        orange: {
            headerGradient: 'from-orange-500 to-red-600',
            activeTabBg: 'bg-orange-600',
            activeTabBgHover: 'hover:bg-orange-700',
            focusRing: 'focus:ring-orange-500',
            loaderBorder: 'border-orange-500',
            iconBg: 'bg-orange-100 dark:bg-orange-900/30',
            iconText: 'text-orange-600 dark:text-orange-400',
            streamBtnGradient: 'from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700',
            selectedItemBg: 'bg-orange-50 dark:bg-orange-900/20',
            selectedItemBorder: 'border-orange-200 dark:border-orange-800',
            selectedItemText: 'text-orange-700 dark:text-orange-300',
            backButtonText: 'text-orange-600 dark:text-orange-400'
        },
        green: {
            headerGradient: 'from-emerald-500 to-teal-600',
            activeTabBg: 'bg-emerald-600',
            activeTabBgHover: 'hover:bg-emerald-700',
            focusRing: 'focus:ring-emerald-500',
            loaderBorder: 'border-emerald-500',
            iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
            iconText: 'text-emerald-600 dark:text-emerald-400',
            streamBtnGradient: 'from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700',
            selectedItemBg: 'bg-emerald-50 dark:bg-emerald-900/20',
            selectedItemBorder: 'border-emerald-200 dark:border-emerald-800',
            selectedItemText: 'text-emerald-700 dark:text-emerald-300',
            backButtonText: 'text-emerald-600 dark:text-emerald-400'
        }
    };

    const currentTheme = themeConfig[theme] || themeConfig.blue;

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setActiveTab('fileList');
            setFileList([]);
            setSelectedFile('');
            setLogContent('');
            setSearchTerm('');
            setError('');
            setShowMobileList(true);
        }
    }, [isOpen]);

    // 파일 목록 조회
    const fetchFileList = async () => {
        setLoading(true);
        setError('');
        try {
            const { data, error: apiError } = await send(apiEndpoints.list, {}, 'GET');

            if (apiError) {
                setError(apiError);
            } else if (data && data.response && data.response.files) {
                // 날짜 기준 내림차순 정렬 (최신순)
                const sortedFiles = data.response.files.sort((a, b) => {
                    const dateA = new Date(a.modified_at || a.lastModified);
                    const dateB = new Date(b.modified_at || b.lastModified);
                    return dateB - dateA;
                });
                setFileList(sortedFiles);
            } else {
                setError('파일 목록을 가져올 수 없습니다.');
            }
        } catch (err) {
            setError('파일 목록 조회 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 로그 파일 내용 조회
    const fetchLogContent = async (filename) => {
        if (!filename) return;

        setContentLoading(true); 
        
        try {
            const url = typeof apiEndpoints.content === 'function' 
                ? apiEndpoints.content(filename) 
                : `${apiEndpoints.content}/${filename}`;

            const { data, error: apiError } = await send(url, {}, 'GET');

            if (apiError) {
                setLogContent(`[오류] 로그를 불러오는데 실패했습니다.\n${apiError}`);
            } else if (data && data.response) {
                setLogContent(data.response.content || '로그 내용이 없습니다.');
            } else {
                setLogContent('로그 내용을 가져올 수 없습니다.');
            }
        } catch (err) {
            setLogContent('[오류] 로그 조회 중 통신 오류가 발생했습니다.');
        } finally {
            setContentLoading(false);
        }
    };

    // 탭 변경 시 데이터 로드
    useEffect(() => {
        if (!isOpen) return;
        
        if (activeTab === 'fileList' || activeTab === 'logView') {
            fetchFileList();
            setShowMobileList(true); // 탭 변경시 목록 보기로 리셋
        }
    }, [activeTab, isOpen]);

    // 파일 선택 시 로그 내용 조회
    const handleFileSelect = (filename) => {
        setSelectedFile(filename);
        fetchLogContent(filename);
        setShowMobileList(false); // 모바일에서는 내용 보기로 전환
    };

    // 모바일에서 목록으로 돌아가기
    const handleBackToList = () => {
        setShowMobileList(true);
    };

    // 실시간 로그 팝업 열기
    const openRealtimeLogStream = () => {
        const width = 1000;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        window.open(
            streamUrl,
            windowName,
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // 검색 필터링된 파일 목록
    const filteredFiles = fileList.filter(file => 
        file.filename.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 px-0 sm:px-4">
            <div className="w-full max-w-5xl h-[100vh] sm:h-[85vh] sm:rounded-2xl bg-white dark:bg-slate-800 shadow-xl ring-1 ring-slate-900/5 dark:ring-slate-700 overflow-hidden flex flex-col">
                {/* 헤더 */}
                <div className={`flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r ${currentTheme.headerGradient} shrink-0`}>
                    <h2 className="text-base sm:text-lg font-semibold text-white truncate pr-4">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors p-1"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* 탭 (모바일에서는 가로 스크롤 가능하게) */}
                <div className="shrink-0 flex gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('fileList')}
                        className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'fileList'
                            ? `${currentTheme.activeTabBg} text-white shadow-sm`
                            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
                            }`}
                    >
                        파일 목록
                    </button>
                    <button
                        onClick={() => setActiveTab('logView')}
                        className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'logView'
                            ? `${currentTheme.activeTabBg} text-white shadow-sm`
                            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
                            }`}
                    >
                        로그 조회
                    </button>
                    <button
                        onClick={() => setActiveTab('realtime')}
                        className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${activeTab === 'realtime'
                            ? `${currentTheme.activeTabBg} text-white shadow-sm`
                            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
                            }`}
                    >
                        실시간 추적
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </div>

                {/* 에러 메시지 (글로벌) */}
                {error && (
                    <div className="shrink-0 mx-4 sm:mx-6 mt-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                    </div>
                )}

                {/* 내용 영역 */}
                <div className="flex-1 overflow-hidden p-4 sm:p-6 relative">
                    {/* 전체 로딩 */}
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-800/80 z-20">
                            <div className="flex flex-col items-center gap-3">
                                <div className={`w-10 h-10 border-4 ${currentTheme.loaderBorder} border-t-transparent rounded-full animate-spin`}></div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">파일 목록을 불러오는 중...</p>
                            </div>
                        </div>
                    )}

                    {!loading && activeTab === 'fileList' && (
                        <div className="h-full overflow-y-auto">
                            {fileList.length === 0 ? (
                                <div className="text-center py-12">
                                    <svg className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-slate-600 dark:text-slate-400">로그 파일이 없습니다.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse min-w-[500px] sm:min-w-full">
                                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700 z-10">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-600">
                                                    파일명
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-600">
                                                    크기
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-600">
                                                    수정일
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {fileList.map((file, index) => (
                                                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100 font-mono break-all">
                                                        {file.filename}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                        {formatFileSize(file.size)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                        {formatDate(file.modified_at || file.lastModified)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {!loading && activeTab === 'logView' && (
                        <div className="flex flex-col h-full gap-4">
                            {/* 모바일: 파일 목록이 보일 때만 검색바 표시 / PC: 항상 표시 */}
                            <div className={`${!showMobileList ? 'hidden sm:block' : ''} relative shrink-0`}>
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder="파일명 검색..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`pl-10 w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${currentTheme.focusRing}`}
                                />
                            </div>

                            <div className="flex flex-1 gap-4 overflow-hidden relative">
                                {/* 좌측: 파일 목록 (모바일에서는 showMobileList가 true일 때만 표시) */}
                                <div className={`
                                    flex flex-col border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800
                                    ${showMobileList ? 'w-full absolute inset-0 z-10 sm:relative sm:w-1/3 sm:z-0' : 'hidden sm:flex sm:w-1/3'}
                                `}>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 font-medium text-sm text-slate-700 dark:text-slate-300">
                                        파일 목록 ({filteredFiles.length})
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                        {filteredFiles.length === 0 ? (
                                            <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                                                검색 결과가 없습니다.
                                            </div>
                                        ) : (
                                            filteredFiles.map((file, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => handleFileSelect(file.filename)}
                                                    className={`w-full text-left px-3 py-3 rounded-lg text-sm transition-all ${selectedFile === file.filename
                                                        ? `${currentTheme.selectedItemBg} ${currentTheme.selectedItemText} border ${currentTheme.selectedItemBorder} shadow-sm`
                                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent'
                                                    }`}
                                                >
                                                    <div className="font-mono truncate font-medium">{file.filename}</div>
                                                    <div className="flex justify-between mt-1 text-xs opacity-70">
                                                        <span>{formatDate(file.modified_at || file.lastModified)}</span>
                                                        <span>{formatFileSize(file.size)}</span>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* 우측: 로그 내용 (모바일에서는 showMobileList가 false일 때만 표시) */}
                                <div className={`
                                    flex flex-col border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-900 dark:bg-black
                                    ${!showMobileList ? 'w-full absolute inset-0 z-10 sm:relative sm:flex-1 sm:z-0' : 'hidden sm:flex sm:flex-1'}
                                `}>
                                    <div className="p-3 bg-slate-800 border-b border-slate-700 flex items-center gap-2">
                                        {/* 모바일용 뒤로가기 버튼 */}
                                        <button 
                                            onClick={handleBackToList}
                                            className={`sm:hidden p-1 rounded-full bg-slate-700 ${currentTheme.backButtonText}`}
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>

                                        <div className="flex-1 flex justify-between items-center min-w-0">
                                            <span className="font-medium text-sm text-slate-300 truncate pr-2">
                                                {selectedFile ? selectedFile : '파일을 선택해주세요'}
                                            </span>
                                            {selectedFile && (
                                                <span className="text-xs text-slate-500 whitespace-nowrap">
                                                    {logContent.length > 0 ? `${(logContent.length / 1024).toFixed(2)} KB` : '0 KB'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 overflow-auto p-4 relative">
                                        {contentLoading ? (
                                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10">
                                                <div className={`w-8 h-8 border-4 ${currentTheme.loaderBorder} border-t-transparent rounded-full animate-spin`}></div>
                                            </div>
                                        ) : logContent ? (
                                            <pre className="text-xs sm:text-sm text-green-400 font-mono whitespace-pre-wrap break-words leading-relaxed">
                                                {logContent}
                                            </pre>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-slate-600 text-sm">
                                                {selectedFile ? '내용이 없습니다.' : '좌측 목록에서 로그 파일을 선택해주세요.'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!loading && activeTab === 'realtime' && (
                        <div className="text-center py-12 h-full flex flex-col items-center justify-center">
                            <div className={`inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 ${currentTheme.iconBg} rounded-full mb-6 sm:mb-8`}>
                                <svg className={`w-10 h-10 sm:w-12 sm:h-12 ${currentTheme.iconText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4">
                                실시간 로그 스트리밍
                            </h3>
                            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed px-4">
                                로그 파일 조회는 정적 데이터를 보여주지만,<br className="hidden sm:block"/>
                                실시간 스트리밍은 현재 발생하고 있는 로그를<br className="hidden sm:block"/>
                                <strong>별도 윈도우</strong>에서 실시간으로 추적할 수 있습니다.
                            </p>
                            <button
                                onClick={openRealtimeLogStream}
                                className={`px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r ${currentTheme.streamBtnGradient} text-white text-base sm:text-lg font-bold rounded-xl shadow-xl transition-all transform hover:scale-105 hover:shadow-2xl flex items-center gap-2`}
                            >
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                실시간 로그 추적 시작
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
