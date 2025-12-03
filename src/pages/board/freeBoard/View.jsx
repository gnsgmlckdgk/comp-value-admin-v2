import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import View001 from '@/component/feature/board/View001';
import { send } from '@/util/ClientUtil';
import BoardAlertModal from '@/component/layouts/common/popup/BoardAlertModal';

function View() {
    const [boardData, setBoardData] = useState();
    const [alertConfig, setAlertConfig] = useState({ open: false, message: '', onConfirm: null });

    const { id } = useParams(); // ← URL에서 :id 값 가져옴
    const navigate = useNavigate();
    const location = useLocation();

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
        await send(sendUrl, {}, 'DELETE');
        openAlert(`[${id}] 게시글을 삭제하였습니다.`, moveListPage);
    };

    const fetchData = async () => {
        const sendUrl = `/dart/freeboard/view/${id}`;
        const { data, error } = await send(sendUrl, {}, 'GET');
        setBoardData(data);
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <>
            <View001
                onMoveBack={moveListPage}
                onMoveUpdate={moveUpdatePage}
                onDelete={onDelete}
                boardData={boardData}
            />
            <BoardAlertModal open={alertConfig.open} message={alertConfig.message} onClose={handleCloseAlert} />
        </>
    );
}

export default View;