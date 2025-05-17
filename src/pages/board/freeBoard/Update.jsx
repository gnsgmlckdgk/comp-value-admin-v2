import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import Update001 from '@/component/feature/board/Update001';
import { send } from '@/util/ClientUtil';


function Update() {

    const { id } = useParams(); // ← URL에서 :id 값 가져옴
    const [boardData, setBoardData] = useState({});

    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state;


    // view 페이지 이동
    const moveViewPage = () => {
        navigate(`/freeboard/view/${id}`, { state });
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
            <Update001 boardData={boardData} moveViewPage={moveViewPage}></Update001>
        </>
    )
}

export default Update