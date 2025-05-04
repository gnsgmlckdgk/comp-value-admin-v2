import Grid02 from '@/component/grid/Grid02';
import Board001 from '@/component/layouts/board/Board001';
import SearchBar from '@/component/search/SearchBar';
import { useState, useEffect } from 'react';



function List() {

    const [loading, setLoading] = useState(false);
    const [rowData, setRowData] = useState([]);

    const fetchData = async () => {
        console.log('List Fetch Data');
        setLoading(true);
        // 테스트
        setTimeout(() => {
            setRowData(
                Array.from({ length: 10 }, (_, idx) => {
                    return { h1: `000_${idx}`, h2: "BBB", h3: "yyyy-MM-dd", h4: 123123 }
                })
            );
            setLoading(false);
        }, 3000)
    }

    return (
        <>
            <h1 className='md:text-3xl text-xl mb-5'>자유게시판</h1>
            <Board001 rowData={rowData} fetchData={fetchData} loading={loading} />
        </>
    )
}

export default List;