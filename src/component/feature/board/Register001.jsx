import { useState, useEffect } from 'react';

import Button from '@/component/common/button/Button';
import Input from '@/component/common/input/Input';
import TextArea from '@/component/common/textarea/TextArea';


function Register001({ moveListPage = {}, onRegister = {} }) {

    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [content, setContent] = useState('');

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-semibold mb-6">게시글 등록</h1>
            <form className="space-y-6">
                <div>
                    <Input id='title' label='제목' labelNewLine={true} value={title} onChange={(e) => setTitle(e.target.value)} disabled={false} wdfull={true} />
                </div>
                <div>
                    <Input id='author' label='작성자' labelNewLine={true} value={author} onChange={(e) => setAuthor(e.target.value)} disabled={false} wdfull={true} />
                </div>
                <div>
                    <TextArea id='content' label='내용' labelNewLine={true} value={content} onChange={(e) => setContent(e.target.value)} wdfull={true} />
                </div>
                <div className="flex justify-end">
                    <Button children="저장" variant="primary" onClick={() => onRegister(title, author, content)} />
                    <Button children="뒤로가기" variant="outline" onClick={moveListPage} className='ml-1' />
                </div>
            </form>
        </div>
    )
}

export default Register001;