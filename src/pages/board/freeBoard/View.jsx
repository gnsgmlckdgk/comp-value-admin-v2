import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import View001 from '@/component/feature/board/View001';
import { send } from '@/util/ClientUtil';
import AlertModal from '@/component/layouts/common/popup/AlertModal';
import { useAuth } from '@/context/AuthContext';

function View() {
    const [boardData, setBoardData] = useState();
    const [alertConfig, setAlertConfig] = useState({ open: false, message: '', onConfirm: null });

    const { id } = useParams(); // ← URL에서 :id 값 가져옴
    const navigate = useNavigate();
    const location = useLocation();
    const { userName, nickName, roles } = useAuth();

    const openAlert = (message, onConfirm) => {
        setAlertConfig({ open: true, message, onConfirm: onConfirm || null });
    };

    const handleCloseAlert = () => {
        const { onConfirm } = alertConfig;
        setAlertConfig({ open: false, message: '', onConfirm: null });
        if (onConfirm) onConfirm();
    };

    const moveListPage = () => {
        navigate(`/freeboard/`, { state: location.state });
    };

    const moveUpdatePage = () => {
        if (!boardData) return;
        navigate(`/freeboard/modi/${id}`, { state: location.state });
    };

    const onDelete = async () => {
        if (!boardData) return;
        const sendUrl = `/dart/freeboard/delete/${id}`;
        const { data, error } = await send(sendUrl, {}, 'DELETE');
        if (error) {
            // 백단에서 권한 문제 등으로 500을 던진 경우, 그 메시지를 그대로 사용자에게 노출
            openAlert(error || '게시글 삭제 중 오류가 발생했습니다.');
            return;
        }
        openAlert(`[${id}] 게시글을 삭제하였습니다.`, moveListPage);
    };

    const fetchData = async () => {
        const sendUrl = `/dart/freeboard/view/${id}`;
        const { data, error } = await send(sendUrl, {}, 'GET');
        if (error === null && data) {
            // 1) 기존: { ...게시글... }
            // 2) 신규: { success, code, message, response: { ...게시글... } }
            const payload = data.response ?? data;
            setBoardData({
                ...payload,
                // 뷰에서 일관되게 사용할 표시용 작성자
                author: payload.memberNickname ?? payload.memberUsername ?? '',
            });
        } else {
            setBoardData(undefined);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const currentUsername = userName || localStorage.getItem('userName') || '';
    const currentNickname = nickName || localStorage.getItem('nickName') || '';

    const isMine =
        !!boardData &&
        ((boardData.memberUsername && boardData.memberUsername === currentUsername) ||
            (boardData.memberNickname && boardData.memberNickname === currentNickname));

    // ---- 역할 계산 (ROLE_SUPER_ADMIN / ROLE_ADMIN / ROLE_USER 등) ----
    // 1) Context의 roles 배열
    // 2) 새로고침 이후를 대비해 localStorage.roles(JSON)도 참고
    let storedRoles = [];
    try {
        const raw = localStorage.getItem('roles');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                storedRoles = parsed;
            }
        }
    } catch {
        storedRoles = [];
    }

    const effectiveRoles = (roles && roles.length ? roles : storedRoles).map((r) =>
        (r || '').toString().toUpperCase()
    );

    const isSuperAdmin = effectiveRoles.some((r) => r.includes('SUPER_ADMIN'));
    const isAdmin = !isSuperAdmin && effectiveRoles.some((r) => r.includes('ADMIN'));

    const canEdit = isMine; // 수정은 항상 "내 글만"
    const canDelete = isSuperAdmin || isAdmin || isMine; // 삭제는 관리자 전체 + 내 글

    return (
        <>
            <View001
                onMoveBack={moveListPage}
                onMoveUpdate={moveUpdatePage}
                onDelete={onDelete}
                boardData={boardData}
                canEdit={canEdit}
                canDelete={canDelete}
            />
            <AlertModal open={alertConfig.open} message={alertConfig.message} onClose={handleCloseAlert} />
        </>
    );
}

export default View;