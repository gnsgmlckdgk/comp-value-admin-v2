import BoardList from '@/component/feature/board/List002';
import { send } from '@/util/ClientUtil';

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';


function List() {

    const location = useLocation();
    const state = location.state || {};

    const [loading, setLoading] = useState(false);
    const [rowData, setRowData] = useState([]);
    const [search, setSearch] = useState(state.search || '');
    const [sgubun, setSgubun] = useState(state.sgubun || '');  // 검색구분

    const navigate = useNavigate();

    // 페이징
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(state.currentPage || 1);
    // const [pageBlock, setPageBlock] = useState(5);
    // const [pageSize, setPageSize] = useState(20);

    const columns = [
        {
            headerCheckboxSelection: true,
            checkboxSelection: true,
            headerName: "ID",
            field: "id",
        },
        { headerName: "제목", field: "title", flex: 3, sortable: false, filter: true },
        { headerName: "작성자", field: "author", flex: 1, sortable: false, filter: true },
        {
            headerName: "작성일자",
            field: "createdAt",
            flex: 2,
            sortable: false,
            valueFormatter: (params) => new Date(params.value).toLocaleString()
        },
    ];

    const pageNationProps = {
        currentPage,
        totalCount,
        pageBlock: 5,
        pageSize: 10,
        onPageChange: (page) => {
            setCurrentPage(page);
            fetchData(page);
        },
    };

    const searchGubunList = [
        { name: "전체", value: "0" },
        { name: "제목", value: "1" },
        { name: "작성자", value: "2" },
        { name: "내용", value: "3" },
        { name: "제목, 내용", value: "4" },
    ]

    // view 페이지 이동
    const moveViewPage = (param) => {
        navigate(`/freeboard/view/${param.data.id}`, {
            state: {
                search: search,
                sgubun: sgubun,
                currentPage: currentPage
            }
        });
    }

    const testFetchData = async (page = 1) => {
        setLoading(true);
        // 테스트
        setTimeout(() => {
            setRowData(
                Array.from({ length: 10 }, (_, idx) => {
                    return { id: `000_${idx}`, _제목: "BBB", _작성자: "yyyy-MM-dd", _날짜: 123123 }
                })
            );
            setLoading(false);
        }, 3000)
    }

    const fetchData = async (page = 1) => {

        setCurrentPage(page);
        setLoading(true);

        // page 조회 0 index 부터 시작
        const query = `?page=${page - 1}&size=${pageNationProps.pageSize}&search=${search}&sgubun=${sgubun}`;
        const sendUrl = "/dart/freeboard" + query;
        const { data, error } = await send(sendUrl, {}, "GET");

        if (error === null) {
            setTotalCount(data.total);
            setRowData(data.data);
        } else {
            setTotalCount(0);
            setRowData([]);
        }

        setLoading(false);
    }

    return (
        <>
            <BoardList fetchData={fetchData} columns={columns} rowData={rowData} loading={loading} moveViewPage={moveViewPage}
                searchState={{ search, setSearch, sgubun, setSgubun, searchGubunList }}
                pageNationProps={pageNationProps} />
        </>
    )
}

export default List;