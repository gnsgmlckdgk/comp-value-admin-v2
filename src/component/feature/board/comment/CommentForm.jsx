import { useState } from 'react';
import Button from '@/component/common/button/Button';

function CommentForm({
    onSubmit,
    onCancel,
    placeholder = '댓글을 입력하세요.',
    initialContent = '',
    submitLabel = '등록',
}) {
    const [content, setContent] = useState(initialContent);

    const handleSubmit = () => {
        if (!content.trim()) return;
        onSubmit(content.trim());
        setContent('');
    };

    return (
        <div className="flex flex-col gap-2">
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={placeholder}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
            />
            <div className="flex justify-end gap-2">
                {onCancel && (
                    <Button variant="outline" onClick={onCancel} className="!px-3 !py-1.5 !text-sm">
                        취소
                    </Button>
                )}
                <Button onClick={handleSubmit} disabled={!content.trim()} className="!px-3 !py-1.5 !text-sm">
                    {submitLabel}
                </Button>
            </div>
        </div>
    );
}

export default CommentForm;
