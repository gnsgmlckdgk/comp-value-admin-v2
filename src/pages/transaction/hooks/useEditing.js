import { useState } from 'react';

/**
 * 셀 편집 상태 관리 커스텀 훅
 */
export function useEditing() {
    const [editing, setEditing] = useState(null); // { id, field }
    const [draft, setDraft] = useState('');

    const startEdit = (row, field) => {
        setEditing({ id: row.id, field });
        setDraft(row[field] ?? '');
    };

    const cancelEdit = () => {
        setEditing(null);
        setDraft('');
    };

    return {
        editing,
        setEditing,
        draft,
        setDraft,
        startEdit,
        cancelEdit,
    };
}
