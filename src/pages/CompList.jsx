import { useState, useEffect } from 'react'
import Grid01 from '@/component/board/Grid01'
import Button from '@/component/common/button/Button';
import { send } from '@/util/ClientUtil';
import Grid02 from '@/component/board/Grid02';

function CompList() {

    const [data, setData] = useState('');
    const [loading, setLoading] = useState(false);

    const columns = [
        { headerName: "기업코드", field: "corpCode", flex: 1, sortable: false, minWidth: 110 },
        { headerName: "기업명", field: "corpName", flex: 2, minWidth: 150 },
        { headerName: "갱신일", field: "modifyDate", flex: 1, minWidth: 110 },
        { headerName: "종목코드", field: "stockCode", flex: 1, minWidth: 100 },
    ]

    const fetchData = async () => {
        setLoading(true);
        // const sendUrl = "/dart/disclosure/corpCode";
        // const { data, error } = await send(sendUrl, {}, "GET");
        // setData(data.list);
        // setLoading(false);

        // 테스트
        setTimeout(() => {
            setData([
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
                { corpCode: "123123", corpName: "BBB", modifyDate: "yyyy-MM-dd", stockCode: 123123 },
            ])
            setLoading(false);
        }, 3000)
    }

    return (
        <>
            <h1 className='md:text-3xl text-xl mb-5'>기업목록</h1>
            <div className="rounded-md shadow-sm font-semibold text-gray-600">
                <div className='mb-3 text-right pr-2'>
                    <Button children='조회하기' onClick={fetchData} variant='select' className='' ></Button>
                </div>
                <Grid02 columns={columns} rowData={data} paginationViewYn={true} loading={loading} />
            </div>
        </>
    )

}

export default CompList;