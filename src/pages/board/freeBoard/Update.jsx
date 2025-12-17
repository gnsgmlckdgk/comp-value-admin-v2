import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import Update001 from '@/component/feature/board/Update001';
import { send } from '@/util/ClientUtil';
import AlertModal from '@/component/layouts/common/popup/AlertModal';
import { useAuth } from '@/context/AuthContext';

function Update() {
    const { id } = useParams(); // ← URL에서 :id 값 가져옴
    const [boardData, setBoardData] = useState({});
    const [alertConfig, setAlertConfig] = useState({ open: false, message: '', onConfirm: null });

    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state;
    const { roles } = useAuth();

    // 권한 계산
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
    const isAdmin = effectiveRoles.some((r) => r.includes('ADMIN'));
    const canSetNotice = isSuperAdmin || isAdmin;

    const openAlert = (message, onConfirm) => {
        setAlertConfig({ open: true, message, onConfirm: onConfirm || null });
    };

    const handleCloseAlert = () => {
        const { onConfirm } = alertConfig;
        setAlertConfig({ open: false, message: '', onConfirm: null });
        if (onConfirm) onConfirm();
    };

    // view 페이지 이동
    const moveViewPage = () => {
        navigate(`/freeboard/view/${id}`, { state });
    };

    // 수정할 게시글 조회
    const fetchData = async () => {
        const sendUrl = `/dart/freeboard/view/${id}`;
        const { data, error } = await send(sendUrl, {}, 'GET');
        if (error === null && data) {
            const payload = data.response ?? data;
            setBoardData({
                ...payload,
                author: payload.memberNickname ?? payload.memberUsername ?? '',
            });
        }
    };

    const updateData = async (title, content, notice = false, secret = false) => {
        const sendUrl = `/dart/freeboard/modi`;

        const updateBoardData = { ...boardData, title, content, notice, secret };

        const { data, error } = await send(sendUrl, updateBoardData, 'PUT');

        if (error) {
            openAlert(error || '수정 중 문제가 발생했습니다.\n잠시 후 다시 시도해 주세요.');
        } else if (data != null) {
            openAlert('정상처리되었습니다.', moveViewPage);
        } else {
            openAlert('수정 중 문제가 발생했습니다.\n잠시 후 다시 시도해 주세요.');
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <Update001 boardData={boardData} onUpdate={updateData} moveViewPage={moveViewPage} canSetNotice={canSetNotice} />
            <AlertModal open={alertConfig.open} message={alertConfig.message} onClose={handleCloseAlert} />
        </>
    );
}

export default Update;