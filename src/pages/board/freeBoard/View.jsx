import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import View001 from '@/component/feature/board/View001';
import { send } from '@/util/ClientUtil';

function View() {

    const [boardData, setBoardData] = useState();

    const { id } = useParams(); // ← URL에서 :id 값 가져옴
    const navigate = useNavigate();
    const location = useLocation();

    const moveListPage = () => {
        navigate(`/freeboard/`, { state: location.state })
    }

    const moveUpdatePage = () => {
        navigate(`/freeboard/modi/${id}`, { state: location.state })
    }

    const onDelete = async () => {
        const sendUrl = `/dart/freeboard/delete/${id}`;
        await send(sendUrl, {}, "DELETE");
        alert(`[${id}] 게시글을 삭제하였습니다.`);
        moveListPage();
    }

    const fetchData = async () => {
        const sendUrl = `/dart/freeboard/view/${id}`;
        const { data, error } = await send(sendUrl, {}, "GET");
        setBoardData(data);
    }

    useEffect(() => {
        fetchData();
    }, [])

    return (
        <>
            <View001 onMoveBack={moveListPage} onMoveUpdate={moveUpdatePage} onDelete={onDelete} boardData={boardData}></View001 >
        </>
    )
}

export default View