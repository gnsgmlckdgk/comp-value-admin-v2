import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import Button from '@/component/common/button/Button';


function Update001({ boardData = {}, moveViewPage = {} }) {

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
                    <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                    <input type="text" className="w-full border border-gray-300 rounded px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">작성자</label>
                    <input type="text" className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 cursor-not-allowed" disabled value={boardData.author ?? ''} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
                    <textarea rows={6} className="w-full border border-gray-300 rounded px-3 py-2" value={content} onChange={(e) => setContent(e.target.value)} />
                </div>
                <div className="flex justify-end">
                    <Button children="저장" variant="primary" onClick={{}} />
                    <Button children="뒤로가기" variant="outline" onClick={moveViewPage} className='ml-1' />
                </div>
            </form>
        </div>
    )
}

export default Update001;