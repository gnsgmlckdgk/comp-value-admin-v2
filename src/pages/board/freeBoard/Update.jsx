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

    // 수정할 게시글 조회
    const fetchData = async () => {
        const sendUrl = `/dart/freeboard/view/${id}`;
        const { data, error } = await send(sendUrl, {}, "GET");
        setBoardData(data);
    }

    const updateData = async (title, content) => {
        const sendUrl = `/dart/freeboard/modi`;

        const updateBoardData = boardData;
        updateBoardData.title = title;
        updateBoardData.content = content;

        const { data, error } = await send(sendUrl, updateBoardData, "PUT");

        if (data != null) {
            alert("정상처리되었습니다.");
        }

        moveViewPage();
    }

    useEffect(() => {
        fetchData();
    }, [])


    return (
        <>
            <Update001 boardData={boardData} onUpdate={updateData} moveViewPage={moveViewPage}></Update001>
        </>
    )
}

export default Update