import { useState, useEffect } from 'react'

import { send } from '@/util/ClientUtil';
import Board from '@/component/feature/board/List001';

function CompList() {

    const [data, setData] = useState('');
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const columns = [
        { headerName: "기업코드", field: "corpCode", flex: 1, sortable: false, minWidth: 110 },
        { headerName: "기업명", field: "corpName", flex: 2, minWidth: 150 },
        { headerName: "갱신일", field: "modifyDate", flex: 1, minWidth: 110 },
        { headerName: "종목코드", field: "stockCode", flex: 1, minWidth: 100 },
    ]

    const fetchData = async () => {
        setLoading(true);

        const sendUrl = "/dart/disclosure/corpCode";
        const { data, error } = await send(sendUrl, {}, "GET");

        const searchList = data.list.filter((item) => {
            const regex = new RegExp(search, 'i');  // i: 대소문자구분없이
            return regex.test(item.corpName);
        })
        setData(searchList);

        setLoading(false);
    }

    return (
        <>
            <h1 className='md:text-3xl text-xl mb-5'>기업목록</h1>
            <Board fetchData={fetchData} columns={columns} rowData={data} loading={loading} searchState={{ search, setSearch }} />
        </>
    )

}

export default CompList;