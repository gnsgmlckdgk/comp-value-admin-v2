import { useState } from 'react';

import Button from '@/component/common/button/Button';
import Input from '@/component/common/input/Input';
import RichTextEditor from '@/component/common/editor/RichTextEditor';

function Register001({ moveListPage = () => {}, onRegister = () => {}, currentAuthor = '', openAlert = (msg) => alert(msg), canSetNotice = false }) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [notice, setNotice] = useState(false);
    const [secret, setSecret] = useState(false);
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

    const handleSubmit = () => {
        if (!title.trim()) {
            openAlert('제목을 입력해 주세요.');
            return;
        }
        // HTML 태그를 제거한 텍스트로 검증 (공백만 있는 경우 방지)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        if (!textContent.trim()) {
            openAlert('내용을 입력해 주세요.');
            return;
        }

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

        onRegister(title, content, notice, secret);
    };

    return (
        <div className="mx-auto max-w-7xl px-1 py-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                <div className="border-b border-slate-200 px-3 sm:px-4 py-4 dark:border-slate-700">
                    <h2 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-white">게시글 등록</h2>
                    <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">새로운 게시글을 작성해주세요</p>
                </div>

                <form className="p-3 sm:p-4 space-y-6" onSubmit={(e) => e.preventDefault()}>
                    <div>
                        <Input
                            id="title"
                            label="제목"
                            labelNewLine={true}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={false}
                            wdfull={true}
                        />
                    </div>
                    <div>
                        <Input
                            id="author"
                            label="작성자"
                            labelNewLine={true}
                            value={currentAuthor}
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
                        <RichTextEditor
                            value={content}
                            onChange={setContent}
                            height="400px"
                            onSizeChange={handleSizeChange}
                        />
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
                        <Button children="뒤로가기" variant="outline" onClick={moveListPage} />
                        <Button children="저장" variant="primary" onClick={handleSubmit} />
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Register001;