import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import Button from '@/component/common/button/Button';
import Input from '@/component/common/input/Input';
import RichTextEditor from '@/component/common/editor/RichTextEditor';


function Update001({ boardData = {}, moveViewPage = {}, onUpdate = {} }) {

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isLoaded, setIsLoaded] = useState(false);


    useEffect(() => {
        if (boardData.content !== undefined) {
            setTitle(boardData.title ?? '');
            setContent(boardData.content ?? '');
            setIsLoaded(true);
        }
    }, [boardData.title, boardData.content]);


    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                <div className="border-b border-slate-200 px-4 sm:px-6 py-4 dark:border-slate-700">
                    <h2 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-white">게시글 수정</h2>
                    <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">게시글 내용을 수정해주세요</p>
                </div>

                <form className="p-4 sm:p-6 space-y-6">
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
                    <div>
                        <label htmlFor="content" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            내용
                        </label>
                        {isLoaded && (
                            <RichTextEditor
                                value={content}
                                onChange={setContent}
                                height="400px"
                            />
                        )}
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button children="뒤로가기" variant="outline" onClick={moveViewPage} />
                        <Button children="저장" variant="primary" onClick={() => onUpdate(title, content)} />
                    </div>
                </form>
            </div>
        </div>
    )
}

export default Update001;