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
        <div className="mx-auto max-w-5xl px-4 py-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                {/* 헤더 */}
                <div className="border-b border-slate-200 px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                                    #{id}
                                </span>
                            </div>
                            <h1 className="text-2xl font-semibold text-slate-800">
                                {boardData.title}
                            </h1>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-lg">
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span className="text-sm font-medium text-slate-700">{boardData.viewCount ?? 0}</span>
                        </div>
                    </div>

                    {/* 작성자 정보 */}
                    <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                            <span className="font-medium">{boardData.author || boardData.memberNickname || boardData.memberUsername || '-'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            <span>{boardData.createdAt || '-'}</span>
                        </div>
                        {boardData.updatedAt && boardData.updatedAt !== boardData.createdAt && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs">수정됨 {boardData.updatedAt}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 본문 */}
                <div className="px-6 py-8">
                    <div className="prose prose-slate max-w-none">
                        <p className="whitespace-pre-line text-slate-700 leading-relaxed">
                            {boardData.content}
                        </p>
                    </div>
                </div>

                {/* 버튼들 */}
                <div className="border-t border-slate-200 px-6 py-4 flex justify-between items-center">
                    <Button children="목록" variant="outline" onClick={onMoveBack} />
                    <div className="flex gap-2">
                        {canEdit && (
                            <Button children="수정" variant="outline" onClick={onMoveUpdate} />
                        )}
                        {canDelete && (
                            <Button children="삭제" variant="danger" onClick={onDelete} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default View001;