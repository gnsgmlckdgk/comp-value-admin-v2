import { useState, useRef, useEffect } from 'react';
import { send } from '@/util/ClientUtil';
import AlertModal from '@/component/layouts/common/popup/AlertModal';
import useModalAnimation from '@/hooks/useModalAnimation';

/**
 * Redis 관리 모달 컴포넌트
 */
export default function RedisManagementModal({ isOpen, onClose }) {
    const [searchKey, setSearchKey] = useState('');
    const [searchType, setSearchType] = useState('PS'); // PS: 패턴검색, S: 풀검색
    const [redisData, setRedisData] = useState([]);
    const [selectedKeys, setSelectedKeys] = useState([]);
    const [loading, setLoading] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ open: false, message: '', onConfirm: null });

    // 수정/등록 모달 상태
    const [editModal, setEditModal] = useState({ open: false, key: '', value: '', ttl: 0, readOnly: false, isNew: false });
    const [editLoading, setEditLoading] = useState(false);

    const searchInputRef = useRef(null);
    const ttlTimerRef = useRef(null);

    const openAlert = (message, onConfirm = null) => {
        setAlertConfig({ open: true, message, onConfirm });
    };

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    // TTL 타이머 (보기 모달에서 TTL이 실시간으로 감소)
    useEffect(() => {
        // 보기 모달이 열려있고, TTL이 양수일 때만 타이머 시작
        if (editModal.open && editModal.readOnly && editModal.ttl > 0) {
            ttlTimerRef.current = setInterval(() => {
                setEditModal(prev => {
                    const newTtl = prev.ttl - 1;
                    // TTL이 0이 되면 타이머 중지
                    if (newTtl <= 0) {
                        clearInterval(ttlTimerRef.current);
                        return { ...prev, ttl: 0 };
                    }
                    return { ...prev, ttl: newTtl };
                });
            }, 1000);

            return () => {
                if (ttlTimerRef.current) {
                    clearInterval(ttlTimerRef.current);
                }
            };
        }
    }, [editModal.open, editModal.readOnly, editModal.ttl > 0]);

    // 검색 실행
    const handleSearch = async () => {
        if (!searchKey.trim()) {
            openAlert('검색할 키 또는 패턴을 입력해주세요.');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await send('/dart/mgnt/redis', {
                type: searchType,
                key: searchKey.trim(),
                value: '',
                ttl: 0
            }, 'POST');

            if (error) {
                openAlert(error);
                setRedisData([]);
            } else if (data?.success && data?.response) {
                if (data.response.success === false) {
                    openAlert(data.response.message || '조회에 실패했습니다.');
                    setRedisData([]);
                } else {
                    // message 문자열을 파싱 (예: "[key1, key2, key3]")
                    const message = data.response.message || '';
                    const parsedKeys = parseRedisKeys(message);
                    setRedisData(parsedKeys.map(key => ({ key, selected: false })));
                    setSelectedKeys([]);
                }
            } else {
                openAlert('조회 중 오류가 발생했습니다.');
                setRedisData([]);
            }
        } catch (e) {
            console.error('Redis 조회 실패:', e);
            openAlert('조회 중 오류가 발생했습니다.');
            setRedisData([]);
        } finally {
            setLoading(false);
        }
    };

    // Redis 키 문자열 파싱 ("[key1, key2, key3]" -> ["key1", "key2", "key3"])
    const parseRedisKeys = (str) => {
        if (!str) return [];
        // 대괄호 제거하고 콤마로 split
        const cleaned = str.replace(/^\[|\]$/g, '').trim();
        if (!cleaned) return [];
        return cleaned.split(',').map(k => k.trim()).filter(k => k);
    };

    // 전체 선택/해제
    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedKeys(redisData.map(item => item.key));
        } else {
            setSelectedKeys([]);
        }
    };

    // 개별 선택/해제
    const handleSelectKey = (key, checked) => {
        if (checked) {
            setSelectedKeys(prev => [...prev, key]);
        } else {
            setSelectedKeys(prev => prev.filter(k => k !== key));
        }
    };

    // 단일 삭제
    const handleDeleteSingle = (key) => {
        openAlert(`'${key}' 키를 삭제하시겠습니까?`, () => handleDeleteConfirm([key]));
    };

    // 다중 삭제
    const handleDeleteMultiple = () => {
        if (selectedKeys.length === 0) {
            openAlert('삭제할 키를 선택해주세요.');
            return;
        }
        openAlert(`선택한 ${selectedKeys.length}개의 키를 삭제하시겠습니까?`, () => handleDeleteConfirm(selectedKeys));
    };

    // 삭제 확인
    const handleDeleteConfirm = async (keys) => {
        setLoading(true);
        try {
            // 각 키마다 개별 삭제 요청
            const deletePromises = keys.map(key =>
                send('/dart/mgnt/redis', {
                    type: 'D',
                    key: key,
                    value: '',
                    ttl: 0
                }, 'POST')
            );

            const results = await Promise.all(deletePromises);
            const failed = results.filter(r => r.error);

            if (failed.length > 0) {
                openAlert(`${failed.length}개의 키 삭제에 실패했습니다.`);
            } else {
                openAlert(`${keys.length}개의 키가 삭제되었습니다.`);
            }

            // 삭제 후 재조회
            handleSearch();
        } catch (e) {
            console.error('Redis 삭제 실패:', e);
            openAlert('삭제 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 전체 삭제 (패턴 삭제)
    const handleDeleteAll = () => {
        if (!searchKey.trim()) {
            openAlert('삭제할 패턴을 입력해주세요.');
            return;
        }
        openAlert(
            `'${searchKey}' 패턴과 일치하는 모든 키를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
            handleDeleteAllConfirm
        );
    };

    const handleDeleteAllConfirm = async () => {
        setLoading(true);
        try {
            const { data, error } = await send('/dart/mgnt/redis', {
                type: 'PD',
                key: searchKey.trim(),
                value: '',
                ttl: 0
            }, 'POST');

            if (error) {
                openAlert(error);
            } else if (data?.success) {
                openAlert('패턴 삭제가 완료되었습니다.');
                // 삭제 후 재조회
                handleSearch();
            } else {
                openAlert(data?.message || '패턴 삭제에 실패했습니다.');
            }
        } catch (e) {
            console.error('Redis 패턴 삭제 실패:', e);
            openAlert('패턴 삭제 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 키 값 조회
    const fetchKeyValue = async (key) => {
        setEditLoading(true);
        try {
            const { data, error } = await send('/dart/mgnt/redis', {
                type: 'S',
                key: key,
                value: '',
                ttl: 0
            }, 'POST');

            if (error) {
                openAlert(error);
                return null;
            } else if (data?.success && data?.response) {
                if (data.response.success === false) {
                    openAlert(data.response.message || '조회에 실패했습니다.');
                    return null;
                }
                // 응답 메시지에서 값 추출 (문자열 형태로 반환됨)
                return { value: data.response.message || '', ttl: null };
            }
            return null;
        } catch (e) {
            console.error('Redis 값 조회 실패:', e);
            openAlert('값 조회 중 오류가 발생했습니다.');
            return null;
        } finally {
            setEditLoading(false);
        }
    };

    // TTL 조회
    const fetchKeyTTL = async (key) => {
        try {
            const { data, error } = await send('/dart/mgnt/redis', {
                type: 'TTL',
                key: key,
                value: '',
                ttl: 0
            }, 'POST');

            if (error) {
                return null;
            } else if (data?.success && data?.response) {
                if (data.response.success === false) {
                    return null;
                }
                // TTL 값 추출
                const ttlValue = data.response.message;
                return ttlValue ? parseInt(ttlValue) : null;
            }
            return null;
        } catch (e) {
            console.error('Redis TTL 조회 실패:', e);
            return null;
        }
    };

    // 보기 모달 열기 (읽기 전용)
    const handleOpenView = async (key) => {
        const result = await fetchKeyValue(key);
        if (result !== null) {
            // TTL 조회
            const ttl = await fetchKeyTTL(key);
            setEditModal({
                open: true,
                key,
                value: result.value,
                ttl: ttl !== null ? ttl : -1,
                readOnly: true,
                isNew: false
            });
        }
    };

    // 수정 모달 열기
    const handleOpenEdit = async (key) => {
        const result = await fetchKeyValue(key);
        if (result !== null) {
            // TTL 조회
            const ttl = await fetchKeyTTL(key);
            setEditModal({
                open: true,
                key,
                value: result.value,
                ttl: ttl !== null ? ttl : 0,
                readOnly: false,
                isNew: false
            });
        }
    };

    // 등록 모달 열기
    const handleOpenNew = () => {
        setEditModal({ open: true, key: '', value: '', ttl: 0, readOnly: false, isNew: true });
    };

    // 수정 저장
    const handleEditSave = async () => {
        if (!editModal.key.trim()) {
            openAlert('키를 입력해주세요.');
            return;
        }

        setEditLoading(true);
        try {
            const { data, error } = await send('/dart/mgnt/redis', {
                type: 'I',
                key: editModal.key.trim(),
                value: editModal.value,
                ttl: editModal.ttl || 0
            }, 'POST');

            if (error) {
                openAlert(error);
            } else if (data?.success) {
                openAlert(editModal.isNew ? '등록되었습니다.' : '저장되었습니다.');
                setEditModal({ open: false, key: '', value: '', ttl: 0, readOnly: false, isNew: false });
                // 등록이나 수정 후 검색 키가 있으면 재조회
                if (searchKey.trim()) {
                    handleSearch();
                }
            } else {
                openAlert(data?.message || '저장에 실패했습니다.');
            }
        } catch (e) {
            console.error('Redis 저장 실패:', e);
            openAlert('저장 중 오류가 발생했습니다.');
        } finally {
            setEditLoading(false);
        }
    };

    const { shouldRender, isAnimatingOut } = useModalAnimation(isOpen);

    if (!shouldRender) return null;

    return (
        <>
            {/* 배경 오버레이 */}
            <div
                className={`fixed inset-0 bg-black/50 dark:bg-black/70 z-50 animate__animated ${isAnimatingOut ? 'animate__fadeOut' : 'animate__fadeIn'}`}
                style={{ animationDuration: '0.25s' }}
                onClick={onClose}
            />

            {/* 모달 */}
            <div
                className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 shadow-xl rounded-lg max-h-[90vh] w-[min(1000px,90vw)] overflow-hidden z-50 animate__animated ${isAnimatingOut ? 'animate__fadeOutDown' : 'animate__fadeInUp'}`}
                style={{ animationDuration: '0.25s' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">메모리 관리 (Redis)</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* 검색 영역 */}
                <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3">
                        <select
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        >
                            <option value="PS">패턴 검색</option>
                            <option value="S">정확히 일치</option>
                        </select>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchKey}
                            onChange={(e) => setSearchKey(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder={searchType === 'PS' ? '예: compvalue:*' : '정확한 키 입력'}
                            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        />
                        <button
                            onClick={handleSearch}
                            disabled={loading}
                            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? '조회 중...' : '조회'}
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handleOpenNew}
                            disabled={loading}
                            className="px-4 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            + 등록
                        </button>
                        <button
                            onClick={handleDeleteMultiple}
                            disabled={loading || selectedKeys.length === 0}
                            className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            선택 삭제 ({selectedKeys.length})
                        </button>
                        <button
                            onClick={handleDeleteAll}
                            disabled={loading || !searchKey.trim()}
                            className="px-4 py-1.5 rounded-lg bg-red-700 text-white text-sm font-medium hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            전체 삭제 (패턴)
                        </button>
                    </div>
                </div>

                {/* 결과 영역 */}
                <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-240px)]">
                    {redisData.length === 0 ? (
                        <div className="text-center py-12">
                            <svg className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-slate-500 dark:text-slate-400">검색 결과가 없습니다</p>
                            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">키 또는 패턴을 입력하여 조회하세요</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* 전체 선택 */}
                            <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                <input
                                    type="checkbox"
                                    checked={selectedKeys.length === redisData.length}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    전체 선택 ({redisData.length}개)
                                </span>
                            </div>

                            {/* 키 목록 */}
                            {redisData.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedKeys.includes(item.key)}
                                        onChange={(e) => handleSelectKey(item.key, e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-mono text-slate-900 dark:text-white truncate" title={item.key}>
                                            {item.key}
                                        </p>
                                    </div>
                                    <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => handleOpenView(item.key)}
                                            className="px-2 sm:px-3 py-1.5 text-xs rounded-md bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600 transition-colors whitespace-nowrap"
                                        >
                                            보기
                                        </button>
                                        <button
                                            onClick={() => handleOpenEdit(item.key)}
                                            className="px-2 sm:px-3 py-1.5 text-xs rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors whitespace-nowrap"
                                        >
                                            수정
                                        </button>
                                        <button
                                            onClick={() => handleDeleteSingle(item.key)}
                                            className="px-2 sm:px-3 py-1.5 text-xs rounded-md bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors whitespace-nowrap"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 푸터 */}
                <div className="px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>

            {/* 수정/등록 모달 */}
            {editModal.open && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[60]"
                        onClick={() => setEditModal({ open: false, key: '', value: '', ttl: 0, readOnly: false, isNew: false })}
                    />
                    <div
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 shadow-xl rounded-lg w-[min(600px,90vw)] max-h-[90vh] overflow-y-auto z-[60]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                                {editModal.readOnly ? 'Redis 키 보기' : editModal.isNew ? 'Redis 키 등록' : 'Redis 키 수정'}
                            </h3>
                        </div>
                        <div className="p-4 sm:p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                                    키
                                </label>
                                <input
                                    type="text"
                                    value={editModal.key}
                                    onChange={(e) => setEditModal(prev => ({ ...prev, key: e.target.value }))}
                                    readOnly={editModal.readOnly || !editModal.isNew}
                                    className={`w-full px-4 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                        editModal.readOnly
                                            ? 'border-slate-300 bg-slate-50 text-slate-900 dark:bg-slate-600 dark:border-slate-600 dark:text-white'
                                            : 'border-slate-300 bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white'
                                    } disabled:opacity-60 read-only:opacity-100`}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                                    값
                                </label>
                                <textarea
                                    value={editModal.value}
                                    onChange={(e) => setEditModal(prev => ({ ...prev, value: e.target.value }))}
                                    readOnly={editModal.readOnly}
                                    rows={10}
                                    className={`w-full px-4 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono ${
                                        editModal.readOnly
                                            ? 'border-slate-300 bg-slate-50 text-slate-900 dark:bg-slate-600 dark:border-slate-600 dark:text-white'
                                            : 'border-slate-300 bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white'
                                    } disabled:opacity-60 read-only:opacity-100`}
                                />
                            </div>
                            {editModal.readOnly ? (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                                        TTL (Time To Live)
                                    </label>
                                    <div className={`w-full px-4 py-2 rounded-lg border text-sm font-medium ${
                                        editModal.ttl === -1
                                            ? 'border-green-300 bg-green-50 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400'
                                            : editModal.ttl === 0
                                            ? 'border-red-300 bg-red-50 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400'
                                            : editModal.ttl <= 60
                                            ? 'border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-400'
                                            : 'border-slate-300 bg-slate-50 text-slate-900 dark:bg-slate-600 dark:border-slate-600 dark:text-white'
                                    }`}>
                                        {editModal.ttl === -1
                                            ? '🔒 영구 저장'
                                            : editModal.ttl === -2
                                            ? '❌ 키가 존재하지 않음'
                                            : editModal.ttl === 0
                                            ? '⏰ 만료됨 (0초)'
                                            : (() => {
                                                const totalSeconds = editModal.ttl;
                                                const hours = Math.floor(totalSeconds / 3600);
                                                const minutes = Math.floor((totalSeconds % 3600) / 60);
                                                const seconds = totalSeconds % 60;

                                                if (hours > 0) {
                                                    return `⏱️ ${totalSeconds}초 (${hours}시간 ${minutes}분 ${seconds}초 남음)`;
                                                } else {
                                                    return `⏱️ ${totalSeconds}초 (${minutes}분 ${seconds}초 남음)`;
                                                }
                                            })()
                                        }
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                                        TTL (초) - 0이면 영구 저장
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={editModal.ttl}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            // 빈 문자열이거나 숫자만 허용
                                            if (value === '' || /^\d+$/.test(value)) {
                                                setEditModal(prev => ({ ...prev, ttl: value === '' ? 0 : parseInt(value) }));
                                            }
                                        }}
                                        placeholder="0"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                            <button
                                onClick={() => setEditModal({ open: false, key: '', value: '', ttl: 0, readOnly: false, isNew: false })}
                                disabled={editLoading}
                                className="px-4 sm:px-5 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 text-sm sm:text-base"
                            >
                                {editModal.readOnly ? '닫기' : '취소'}
                            </button>
                            {!editModal.readOnly && (
                                <button
                                    onClick={handleEditSave}
                                    disabled={editLoading}
                                    className="px-4 sm:px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {editLoading ? (editModal.isNew ? '등록 중...' : '저장 중...') : (editModal.isNew ? '등록' : '저장')}
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}

            <AlertModal
                open={alertConfig.open}
                message={alertConfig.message}
                onClose={() => setAlertConfig({ open: false, message: '', onConfirm: null })}
                onConfirm={alertConfig.onConfirm}
            />
        </>
    );
}
