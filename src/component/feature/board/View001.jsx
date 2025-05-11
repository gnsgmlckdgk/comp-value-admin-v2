import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';


import Button from '@/component/common/button/Button';


function View001() {

    const { id } = useParams(); // ← URL에서 :id 값 가져옴

    return (
        <div className=''>
            <h1>View 페이지 {id}</h1>
            <Button variant='primary'></Button>
        </div>
    )
}

export default View001