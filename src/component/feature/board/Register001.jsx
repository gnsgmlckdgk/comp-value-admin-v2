import { useState } from 'react';

import Button from '@/component/common/button/Button';
import Input from '@/component/common/input/Input';
import TextArea from '@/component/common/textarea/TextArea';

function Register001({ moveListPage = () => {}, onRegister = () => {}, currentAuthor = '', openAlert = (msg) => alert(msg) }) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const handleSubmit = () => {
        if (!title.trim()) {
            openAlert('제목을 입력해 주세요.');
            return;
        }
        if (!content.trim()) {
            openAlert('내용을 입력해 주세요.');
            return;
        }
        onRegister(title, content);
    };

    return (
        <div className="mx-auto max-w-4xl px-4 py-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="border-b border-slate-200 px-4 sm:px-6 py-4">
                    <h2 className="text-lg sm:text-xl font-semibold text-slate-800">게시글 등록</h2>
                    <p className="text-sm text-slate-500 mt-1">새로운 게시글을 작성해주세요</p>
                </div>

                <form className="p-4 sm:p-6 space-y-6" onSubmit={(e) => e.preventDefault()}>
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
                        <TextArea
                            id="content"
                            label="내용"
                            labelNewLine={true}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            wdfull={true}
                            rows={15}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                        <Button children="뒤로가기" variant="outline" onClick={moveListPage} />
                        <Button children="저장" variant="primary" onClick={handleSubmit} />
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Register001;