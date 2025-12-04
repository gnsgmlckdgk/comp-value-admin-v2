import { useParams } from 'react-router-dom';

import Button from '@/component/common/button/Button';

function View001({
    onMoveBack = () => {},
    onMoveUpdate = () => {},
    onDelete = () => {},
    canEdit = false,
    canDelete = false,
    boardData = {
        title: '',
        content: '',
        author: '',
        viewCount: 0,
        memberUsername: '',
        memberNickname: '',
        createdAt: '',
        updatedAt: '',
    },
}) {
    const { id } = useParams(); // ← URL에서 :id 값 가져옴

    return (
        <div className="mx-auto max-w-4xl px-4 py-8">
            {/* 제목 */}
            <h1 className="mb-6 text-2xl font-semibold">
                [{id}] {boardData.title}
            </h1>

            {/* 게시글 */}
            <div className="mb-6 space-y-4 rounded bg-white p-6 shadow-md">
                <div className="mb-2 flex justify-between text-xs text-gray-600">
                    <div className="space-y-1">
                        <div>
                            <span className="font-medium text-gray-700">작성자:</span>{' '}
                            {boardData.author || boardData.memberNickname || boardData.memberUsername || '-'}
                        </div>
                        <div>
                            <span className="font-medium text-gray-700">작성일:</span>{' '}
                            {boardData.createdAt || '-'}
                        </div>
                        <div>
                            <span className="font-medium text-gray-700">수정일:</span>{' '}
                            {boardData.updatedAt || '-'}
                        </div>
                    </div>
                    <div className="flex items-start gap-1">
                        <span className="mt-[2px] text-[11px] text-gray-500">조회수</span>
                        <span className="text-sm font-semibold text-gray-700">{boardData.viewCount ?? 0}</span>
                    </div>
                </div>
                <p className="whitespace-pre-line text-lg text-gray-700">{boardData.content}</p>
            </div>

            {/* 버튼들 */}
            <div className="flex justify-end">
                {canEdit && (
                    <Button children="수정" variant="outline" onClick={onMoveUpdate} className="mr-1" />
                )}
                {canDelete && (
                    <Button children="삭제" variant="danger" onClick={onDelete} className="mr-1" />
                )}
                <Button children="목록" variant="primary" onClick={onMoveBack} />
            </div>
        </div>
    );
}

export default View001;