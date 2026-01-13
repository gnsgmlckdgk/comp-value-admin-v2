import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import Button from '@/component/common/button/Button';
import Input from '@/component/common/input/Input';
import RichTextEditor from '@/component/common/editor/RichTextEditor';


function Update001({ boardData = {}, moveViewPage = {}, onUpdate = {}, canSetNotice = false, openAlert = (msg) => alert(msg) }) {

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [notice, setNotice] = useState(false);
    const [secret, setSecret] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [contentSize, setContentSize] = useState(0);
    const [imageSizes, setImageSizes] = useState([]);

    const handleSizeChange = ({ contentSize, imageSizes }) => {
        setContentSize(contentSize);
        setImageSizes(imageSizes);
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const handleUpdate = () => {
        // 이미지 개별 크기 체크 (5MB)
        const oversizedImages = imageSizes.filter(size => size > 5 * 1024 * 1024);
        if (oversizedImages.length > 0) {
            openAlert('이미지는 각각 5MB 이하만 첨부 가능합니다.');
            return;
        }

        // 전체 컨텐츠 크기 체크 (10MB)
        if (contentSize > 10 * 1024 * 1024) {
            openAlert('전체 컨텐츠 크기는 10MB 이하만 가능합니다.');
            return;
        }

        onUpdate(title, content, notice, secret);
    };

    useEffect(() => {
        if (boardData.content !== undefined) {
            setTitle(boardData.title ?? '');
            setContent(boardData.content ?? '');
            setNotice(boardData.notice ?? false);
            setSecret(boardData.secret ?? false);
            setIsLoaded(true);
        }
    }, [boardData.title, boardData.content, boardData.notice, boardData.secret]);


    return (
        <div className="mx-auto max-w-7xl px-1 py-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                <div className="border-b border-slate-200 px-3 sm:px-4 py-4 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={moveViewPage}
                            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                            aria-label="뒤로가기"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <div>
                            <h2 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-white">게시글 수정</h2>
                            <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">게시글 내용을 수정해주세요</p>
                        </div>
                    </div>
                </div>

                <form className="p-3 sm:p-4 space-y-6">
                    <div>
                        <Input id='title' label='제목' value={title} labelNewLine={true} onChange={(e) => setTitle(e.target.value)} disabled={false} wdfull={true} />
                    </div>
                    <div>
                        <Input
                            id='author'
                            label='작성자'
                            value={
                                boardData.memberNickname && boardData.memberUsername
                                    ? `${boardData.memberNickname} (${boardData.memberUsername})`
                                    : boardData.author || boardData.memberNickname || boardData.memberUsername || ''
                            }
                            labelNewLine={true}
                            disabled={true}
                            wdfull={true}
                        />
                    </div>
                    <div className="flex gap-4">
                        {canSetNotice && (
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={notice}
                                    onChange={(e) => setNotice(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700"
                                />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                                    </svg>
                                    공지글
                                </span>
                            </label>
                        )}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={secret}
                                onChange={(e) => setSecret(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 dark:border-slate-600 dark:bg-slate-700"
                            />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                비밀글
                            </span>
                        </label>
                    </div>
                    <div>
                        <label htmlFor="content" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            내용
                        </label>
                        {isLoaded && (
                            <RichTextEditor
                                value={content}
                                onChange={setContent}
                                height="400px"
                                onSizeChange={handleSizeChange}
                            />
                        )}
                        <div className="mt-2 flex flex-wrap gap-4 text-sm">
                            <div className={`${contentSize > 10 * 1024 * 1024 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
                                전체 크기: {formatSize(contentSize)} / 10 MB
                            </div>
                            {imageSizes.length > 0 && (
                                <div className="text-slate-600 dark:text-slate-400">
                                    이미지 {imageSizes.length}개
                                    {imageSizes.some(size => size > 5 * 1024 * 1024) && (
                                        <span className="ml-2 text-red-600 dark:text-red-400 font-semibold">
                                            (일부 이미지가 5MB를 초과합니다)
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button children="저장" variant="primary" onClick={handleUpdate} />
                    </div>
                </form>
            </div>
        </div>
    )
}

export default Update001;