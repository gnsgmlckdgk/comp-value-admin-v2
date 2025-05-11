import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import View001 from '@/component/feature/board/View001';


function View() {

    const { id } = useParams(); // ← URL에서 :id 값 가져옴

    return (
        <>
            <View001></View001>
        </>
    )
}

export default View