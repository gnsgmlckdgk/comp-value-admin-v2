import { useState } from 'react';

import Button from '@/component/common/button/Button';
import Input from '@/component/common/input/Input';
import RichTextEditor from '@/component/common/editor/RichTextEditor';

function Register001({ moveListPage = () => {}, onRegister = () => {}, currentAuthor = '', openAlert = (msg) => alert(msg) }) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

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
        onRegister(title, content);
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
                    <div>
                        <label htmlFor="content" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            내용
                        </label>
                        <RichTextEditor
                            value={content}
                            onChange={setContent}
                            height="400px"
                        />
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