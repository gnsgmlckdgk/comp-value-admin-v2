import { useState } from 'react';

import Button from '@/component/common/button/Button';
import Input from '@/component/common/input/Input';
import TextArea from '@/component/common/textarea/TextArea';

function Register001({ moveListPage = () => {}, onRegister = () => {}, currentAuthor = '' }) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const handleSubmit = () => {
        if (!title.trim()) {
            alert('제목을 입력해 주세요.');
            return;
        }
        if (!content.trim()) {
            alert('내용을 입력해 주세요.');
            return;
        }
        onRegister(title, content);
    };

    return (
        <div className="mx-auto max-w-3xl px-4 py-8">
            <h1 className="mb-6 text-2xl font-semibold">게시글 등록</h1>
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
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
                    />
                </div>
                <div className="flex justify-end">
                    <Button children="저장" variant="primary" onClick={handleSubmit} />
                    <Button children="뒤로가기" variant="outline" onClick={moveListPage} className="ml-1" />
                </div>
            </form>
        </div>
    );
}

export default Register001;