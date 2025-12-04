import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import Update001 from '@/component/feature/board/Update001';
import { send } from '@/util/ClientUtil';
import BoardAlertModal from '@/component/layouts/common/popup/BoardAlertModal';

function Update() {
    const { id } = useParams(); // ← URL에서 :id 값 가져옴
    const [boardData, setBoardData] = useState({});
    const [alertConfig, setAlertConfig] = useState({ open: false, message: '', onConfirm: null });

    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state;

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

    const updateData = async (title, content) => {
        const sendUrl = `/dart/freeboard/modi`;

        const updateBoardData = { ...boardData, title, content };

        const { data, error } = await send(sendUrl, updateBoardData, 'PUT');

        if (data != null) {
            openAlert('정상처리되었습니다.', moveViewPage);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <Update001 boardData={boardData} onUpdate={updateData} moveViewPage={moveViewPage} />
            <BoardAlertModal open={alertConfig.open} message={alertConfig.message} onClose={handleCloseAlert} />
        </>
    );
}

export default Update;