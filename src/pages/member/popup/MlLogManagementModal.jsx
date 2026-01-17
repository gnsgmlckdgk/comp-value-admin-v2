import { useState, useEffect } from 'react';
import { send } from '@/util/ClientUtil';

export default function MlLogManagementModal({ onClose }) {
    const [activeTab, setActiveTab] = useState('fileList');
    const [fileList, setFileList] = useState([]);
    const [selectedFile, setSelectedFile] = useState('');
    const [logContent, setLogContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // 파일 목록 조회
    const fetchFileList = async () => {
        setLoading(true);
        setError('');
        try {
            const { data, error: apiError } = await send('/dart/ml/logs', {}, 'GET');

            if (apiError) {
                setError(apiError);
            } else if (data && data.response && data.response.files) {
                setFileList(data.response.files);
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

        setLoading(true);
        setError('');
        try {
            const { data, error: apiError } = await send(`/dart/ml/logs/${filename}`, {}, 'GET');

            if (apiError) {
                setError(apiError);
                setLogContent('');
            } else if (data && data.response) {
                setLogContent(data.response.content || '로그 내용이 없습니다.');
            } else {
                setError('로그 내용을 가져올 수 없습니다.');
                setLogContent('');
            }
        } catch (err) {
            setError('로그 조회 중 오류가 발생했습니다.');
            setLogContent('');
        } finally {
            setLoading(false);
        }
    };

    // 탭 변경 시 데이터 로드
    useEffect(() => {
        if (activeTab === 'fileList' || activeTab === 'logView') {
            fetchFileList();
        }
    }, [activeTab]);

    // 파일 선택 시 로그 내용 조회
    useEffect(() => {
        if (selectedFile && activeTab === 'logView') {
            fetchLogContent(selectedFile);
        }
    }, [selectedFile]);

    // 실시간 로그 팝업 열기
    const openRealtimeLogStream = () => {
        const width = 1000;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        window.open(
            '/member/ml-logstream',
            'ML_Log_Stream',
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
        return date.toLocaleString('ko-KR');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 px-4">
            <div className="w-full max-w-4xl max-h-[80vh] rounded-2xl bg-white dark:bg-slate-800 shadow-xl ring-1 ring-slate-900/5 dark:ring-slate-700 overflow-hidden flex flex-col">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-500 to-purple-600">
                    <h2 className="text-lg font-semibold text-white">주식 예측 프로그램 로그 관리</h2>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* 탭 */}
                <div className="flex gap-2 px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <button
                        onClick={() => setActiveTab('fileList')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'fileList'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
                            }`}
                    >
                        파일 목록
                    </button>
                    <button
                        onClick={() => setActiveTab('logView')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'logView'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
                            }`}
                    >
                        로그 조회
                    </button>
                    <button
                        onClick={() => setActiveTab('realtime')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${activeTab === 'realtime'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
                            }`}
                    >
                        실시간 추적
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </div>

                {/* 에러 메시지 */}
                {error && (
                    <div className="mx-6 mt-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                    </div>
                )}

                {/* 내용 영역 */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">로딩 중...</p>
                            </div>
                        </div>
                    )}

                    {!loading && activeTab === 'fileList' && (
                        <div>
                            {fileList.length === 0 ? (
                                <div className="text-center py-12">
                                    <svg className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-slate-600 dark:text-slate-400">로그 파일이 없습니다.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100 dark:bg-slate-700">
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
                                                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100 font-mono">
                                                        {file.filename}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                                        {formatFileSize(file.size)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                                        {formatDate(file.lastModified)}
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
                        <div className="space-y-4">
                            <select
                                value={selectedFile}
                                onChange={(e) => setSelectedFile(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">파일을 선택하세요</option>
                                {fileList.map((file, index) => (
                                    <option key={index} value={file.filename}>
                                        {file.filename}
                                    </option>
                                ))}
                            </select>

                            {logContent && (
                                <div className="bg-slate-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
                                    <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap break-words">
                                        {logContent}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}

                    {!loading && activeTab === 'realtime' && (
                        <div className="text-center py-12">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-6">
                                <svg className="w-10 h-10 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                                실시간 로그 스트리밍
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                                실시간 로그를 새 창에서 확인합니다. 아래 버튼을 클릭하면 팝업 창이 열립니다.
                            </p>
                            <button
                                onClick={openRealtimeLogStream}
                                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg transition-all transform hover:scale-105"
                            >
                                실시간 로그 추적 시작
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
