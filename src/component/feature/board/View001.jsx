import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';


import Button from '@/component/common/button/Button';


function View001({ onMoveBack = {}, onMoveUpdate = {}, onDelete = {}, boardData = {
    title: '',
    content: '',
    author: '',
    createdAt: '',
    updatedAt: ''
} }) {

    const { id } = useParams(); // ← URL에서 :id 값 가져옴

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">

            {/* 제목 */}
            <h1 className="text-2xl font-semibold mb-6">[{id}] {boardData.title}</h1>

            {/* 게시글 */}
            <div className="bg-white shadow-md rounded p-6 mb-6 space-y-4">
                <div className="flex justify-end text-sm text-gray-600 mb-2">
                    <div className="space-y-1 text-right">
                        <div>
                            <span className="font-medium text-gray-700">작성자:</span> {boardData.author}
                        </div>
                        <div>
                            <span className="font-medium text-gray-700">작성일:</span> {new Date(boardData.createdAt).toLocaleString()}
                        </div>
                        <div>
                            <span className="font-medium text-gray-700">수정일:</span> {new Date(boardData.updatedAt).toLocaleString()}
                        </div>
                    </div>
                </div>
                <p className="text-lg text-gray-700 whitespace-pre-line">{boardData.content}</p>
            </div>

            {/* 버튼들 */}
            <div className="flex justify-end">
                <Button children="수정" variant="outline" onClick={onMoveUpdate} className='mr-1' />
                <Button children="삭제" variant="danger" onClick={onDelete} className='mr-1' />
                <Button children="목록" variant="primary" onClick={onMoveBack} />
            </div>
        </div>
    )
}

export default View001