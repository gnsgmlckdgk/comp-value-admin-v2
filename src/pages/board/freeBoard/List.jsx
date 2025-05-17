import BoardList from '@/component/feature/board/List002';
import SearchBar from '@/component/feature/board/search/SearchBar002';
import Button from '@/component/common/button/Button';

import { send } from '@/util/ClientUtil';

import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';


function List() {

    const location = useLocation();
    const state = location.state || {};
    const gridRef = useRef();   // 자식 컴포넌트 정보를 담기위해 생성(그리드 정보)

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


    useEffect(() => {
        fetchData(currentPage);
    }, []);


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

    const handleCheckSelected = async () => {
        if (!gridRef.current || !gridRef.current.api) {
            console.warn("그리드가 아직 초기화되지 않았습니다.");
            return;
        }
        const selectedRows = gridRef.current.api.getSelectedRows();
        if (!selectedRows || selectedRows.length == 0) {
            alert('선택된 행이 없습니다.');
            return;
        }

        const idList = selectedRows.map((child, idx) => (
            child.id
        ));

        let count = 0;
        for (const id of idList) {
            const sendUrl = `/dart/freeboard/delete/${id}`;
            await send(sendUrl, {}, "DELETE");
            count++;
        }
        alert(`${count}건 의 게시글을 삭제했습니다.`);

        fetchData(currentPage);
    };

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

    // 등록 페이지 이동
    const moveRegisterPage = () => {
        navigate(`/freeboard/regi/`, {
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

            {/* 상단 검색 + 버튼 영역 */}
            <div className="w-full px-6 mt-4 mb-4">
                {/* SearchBar */}
                <div className="mb-3">
                    <SearchBar
                        fetchData={() => fetchData(1)}
                        searchBarLabel=""
                        searchState={{ search, setSearch, sgubun, setSgubun, searchGubunList }}
                    />
                </div>

                {/* 버튼 영역 */}
                <div className="flex justify-end gap-2">
                    <Button children="등록" onClick={moveRegisterPage} className="w-24" />
                    <Button children="삭제" onClick={handleCheckSelected} variant="danger" className="w-24" />
                </div>
            </div>

            <BoardList ref={gridRef} fetchData={fetchData} columns={columns} rowData={rowData} loading={loading} moveViewPage={moveViewPage}
                searchState={{ search, setSearch, sgubun, setSgubun, searchGubunList }}
                pageNationProps={pageNationProps} />

        </>
    )
}

export default List;