import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import Button from '@/component/common/button/Button';
import Input from '@/component/common/input/Input';
import TextArea from '@/component/common/textarea/TextArea';


function Update001({ boardData = {}, moveViewPage = {}, onUpdate = {} }) {

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');


    useEffect(() => {
        setTitle(boardData.title ?? '');
        setContent(boardData.content ?? '');
    }, [boardData.title, boardData.content]);


    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-semibold mb-6">게시글 수정</h1>
            <form className="space-y-6">
                <div>
                    <Input id='title' label='제목' value={title} labelNewLine={true} onChange={(e) => setTitle(e.target.value)} disabled={false} wdfull={true} />
                </div>
                <div>
                    <Input id='author' label='작성자' value={boardData.author} labelNewLine={true} disabled={true} wdfull={true} />
                </div>
                <div>
                    <TextArea id='content' label='내용' value={content} labelNewLine={true} onChange={(e) => setContent(e.target.value)} wdfull={true} />
                </div>
                <div className="flex justify-end">
                    <Button children="저장" variant="primary" onClick={() => onUpdate(title, content)} />
                    <Button children="뒤로가기" variant="outline" onClick={moveViewPage} className='ml-1' />
                </div>
            </form>
        </div>
    )
}

export default Update001;