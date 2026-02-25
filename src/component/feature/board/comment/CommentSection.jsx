import { useState, useEffect } from 'react';
import { send } from '@/util/ClientUtil';
import CommentForm from './CommentForm';
import CommentItem from './CommentItem';

function CommentSection({ boardId }) {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);

    // 현재 로그인 사용자 정보
    const currentUser = (() => {
        try {
            const userName = localStorage.getItem('userName');
            const nickName = localStorage.getItem('nickName');
            const rawRoles = localStorage.getItem('roles');
            let roles = [];
            if (rawRoles) {
                const parsed = JSON.parse(rawRoles);
                if (Array.isArray(parsed)) {
                    roles = parsed.map(r => (r || '').toString().toUpperCase());
                }
            }
            return userName ? { userName, nickName, roles } : null;
        } catch {
            return null;
        }
    })();

    // 댓글 목록 조회
    const fetchComments = async () => {
        setLoading(true);
        const { data, error } = await send(`/dart/freeboard/${boardId}/comments`, {}, 'GET');
        if (!error && data) {
            const payload = data.response ?? data;
            setComments(Array.isArray(payload) ? payload : []);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (boardId) fetchComments();
    }, [boardId]);

    // 댓글 작성
    const handleCreate = async (content) => {
        const { data, error } = await send(`/dart/freeboard/${boardId}/comments`, { content }, 'POST');
        if (!error) {
            fetchComments();
        }
    };

    // 답글 작성
    const handleReply = async (parentId, content) => {
        const { data, error } = await send(`/dart/freeboard/${boardId}/comments`, { content, parentId }, 'POST');
        if (!error) {
            fetchComments();
        }
    };

    // 댓글 수정
    const handleUpdate = async (commentId, content) => {
        const { data, error } = await send(`/dart/freeboard/comments/${commentId}`, { content }, 'PUT');
        if (!error) {
            fetchComments();
        }
    };

    // 댓글 삭제
    const handleDelete = async (commentId) => {
        const { data, error } = await send(`/dart/freeboard/comments/${commentId}`, {}, 'DELETE');
        if (!error) {
            fetchComments();
        }
    };

    // 전체 댓글 수 (답글 포함)
    const totalCount = comments.reduce((acc, c) => {
        let count = c.deleted ? 0 : 1;
        if (c.replies) count += c.replies.filter(r => !r.deleted).length;
        return acc + count;
    }, 0);

    return (
        <div className="border-t border-slate-200 px-3 sm:px-4 py-4 dark:border-slate-700">
            {/* 댓글 헤더 */}
            <div className="flex items-center gap-1.5 mb-4">
                <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    댓글 {totalCount > 0 && `(${totalCount})`}
                </span>
            </div>

            {/* 댓글 목록 */}
            {loading ? (
                <div className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">
                    댓글을 불러오는 중...
                </div>
            ) : comments.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-700 mb-4">
                    {comments.map((comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            currentUser={currentUser}
                            onReply={handleReply}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center mb-4">
                    첫 번째 댓글을 작성해보세요.
                </div>
            )}

            {/* 댓글 작성 폼 */}
            {currentUser?.userName ? (
                <CommentForm onSubmit={handleCreate} placeholder="댓글을 입력하세요." />
            ) : (
                <div className="text-sm text-slate-400 dark:text-slate-500 text-center py-3 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
                    로그인 후 댓글을 작성할 수 있습니다.
                </div>
            )}
        </div>
    );
}

export default CommentSection;
