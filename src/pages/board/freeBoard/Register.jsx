import { useLocation, useNavigate } from 'react-router-dom';

import Register001 from '@/component/feature/board/Register001';

import { send } from '@/util/ClientUtil';
import { useAuth } from '@/context/AuthContext';
import AlertModal from '@/component/layouts/common/popup/AlertModal';
import { useState } from 'react';

const Register = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { userName, nickName, roles } = useAuth();

    const [alertConfig, setAlertConfig] = useState({ open: false, message: '', onConfirm: null });

    const currentAuthor = nickName || userName || localStorage.getItem('nickName') || localStorage.getItem('userName') || '';

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

    const onRegister = async (title, content, notice = false, secret = false) => {
        const sendUrl = `/dart/freeboard/regi`;
        const { data, error } = await send(
            sendUrl,
            {
                title,
                author: currentAuthor,
                content,
                notice,
                secret,
            },
            'POST'
        );

        if (error) {
            openAlert(error || '게시글 등록중 문제가 발생했습니다.\n잠시 후 다시 시도해 주세요.');
        } else if (data) {
            openAlert('게시글 등록이 완료되었습니다.', () => navigate(`/freeboard/`));
        } else {
            openAlert('게시글 등록중 문제가 발생했습니다.\n잠시 후 다시 시도해 주세요.');
        }
    };

    const moveListPage = () => {
        navigate(`/freeboard/`, { state: location.state });
    };

    return (
        <>
            <Register001 onRegister={onRegister} moveListPage={moveListPage} currentAuthor={currentAuthor} openAlert={openAlert} canSetNotice={canSetNotice} />
            <AlertModal open={alertConfig.open} message={alertConfig.message} onClose={handleCloseAlert} />
        </>
    );
};

export default Register;