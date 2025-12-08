import { useLocation, useNavigate } from 'react-router-dom';

import Register001 from '@/component/feature/board/Register001';

import { send } from '@/util/ClientUtil';
import { useAuth } from '@/context/AuthContext';
import AlertModal from '@/component/layouts/common/popup/AlertModal';
import { useState } from 'react';

const Register = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { userName, nickName } = useAuth();

    const [alertConfig, setAlertConfig] = useState({ open: false, message: '', onConfirm: null });

    const currentAuthor = nickName || userName || localStorage.getItem('nickName') || localStorage.getItem('userName') || '';

    const openAlert = (message, onConfirm) => {
        setAlertConfig({ open: true, message, onConfirm: onConfirm || null });
    };

    const handleCloseAlert = () => {
        const { onConfirm } = alertConfig;
        setAlertConfig({ open: false, message: '', onConfirm: null });
        if (onConfirm) onConfirm();
    };

    const onRegister = async (title, content) => {
        const sendUrl = `/dart/freeboard/regi`;
        const { data, error } = await send(
            sendUrl,
            {
                title,
                author: currentAuthor,
                content,
            },
            'POST'
        );

        if (data) {
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
            <Register001 onRegister={onRegister} moveListPage={moveListPage} currentAuthor={currentAuthor} openAlert={openAlert} />
            <AlertModal open={alertConfig.open} message={alertConfig.message} onClose={handleCloseAlert} />
        </>
    );
};

export default Register;