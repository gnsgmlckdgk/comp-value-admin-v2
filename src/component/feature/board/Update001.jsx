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
        <div className="mx-auto max-w-4xl px-4 py-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="border-b border-slate-200 px-6 py-4">
                    <h2 className="text-xl font-semibold text-slate-800">게시글 수정</h2>
                    <p className="text-sm text-slate-500 mt-1">게시글 내용을 수정해주세요</p>
                </div>

                <form className="p-6 space-y-6">
                    <div>
                        <Input id='title' label='제목' value={title} labelNewLine={true} onChange={(e) => setTitle(e.target.value)} disabled={false} wdfull={true} />
                    </div>
                    <div>
                        <Input id='author' label='작성자' value={boardData.author} labelNewLine={true} disabled={true} wdfull={true} />
                    </div>
                    <div>
                        <TextArea id='content' label='내용' value={content} labelNewLine={true} onChange={(e) => setContent(e.target.value)} wdfull={true} rows={15} />
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                        <Button children="뒤로가기" variant="outline" onClick={moveViewPage} />
                        <Button children="저장" variant="primary" onClick={() => onUpdate(title, content)} />
                    </div>
                </form>
            </div>
        </div>
    )
}

export default Update001;