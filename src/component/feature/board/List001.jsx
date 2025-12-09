import Grid02 from '@/component/grid/Grid02';
import SearchBar001 from '@/component/feature/board/search/SearchBar001';

import { useState, useEffect } from 'react';

/**
 * Board001 컴포넌트는 검색 바와 데이터 그리드를 포함하는 단순한 게시판 레이아웃을 렌더링합니다.
 *
 * @component
 * @param {Object} props - 컴포넌트 속성
 * @param {Array<Object>} [props.columns=[]] - 그리드에 표시할 컬럼 정의 배열
 * @param {Array<Object>} [props.rowData=[]] - 그리드에 표시할 행 데이터 배열
 * @param {Function} props.fetchData - 데이터를 가져오는 함수
 * @param {boolean} [props.loading=false] - 데이터 로딩 상태를 나타내는 플래그
 * @param {Object} props.searchState - 검색 상태를 관리하는 객체
 * @param {string} props.searchState.search - 현재 검색어
 * @param {Function} props.searchState.setSearch - 검색어를 업데이트하는 함수
 * @returns {JSX.Element} 검색 바와 데이터 그리드를 포함하는 게시판 레이아웃
 *
 * @example
 * const columns = [
 *   { headerName: "기업코드", field: "corpCode" },
 *   { headerName: "기업명", field: "corpName" },
 * ];
 * const rowData = [{ corpCode: "001", corpName: "ABC Corp" }];
 * const fetchData = () => { ... };
 * const searchState = { search: "", setSearch: () => {} };
 *
 * <Board001
 *   columns={columns}
 *   rowData={rowData}
 *   fetchData={fetchData}
 *   loading={false}
 *   searchState={searchState}
 * />
 */
function List001({ columns = [], rowData = [], fetchData, loading = false, searchState }) {

    const [gColumns, setGColumns] = useState([]);
    const [count, setCount] = useState(0);

    const testColumns = [
        { headerName: "H1", field: "h1", flex: 1, sortable: false, minWidth: 110 },
        { headerName: "H2", field: "h2", flex: 2, minWidth: 150 },
        { headerName: "H3", field: "h3", flex: 1, minWidth: 110 },
        { headerName: "H4", field: "h4", flex: 1, minWidth: 100 },
    ];

    useEffect(() => {
        setGColumns(columns.length === 0 ? testColumns : columns);
    }, []);

    useEffect(() => {
        setCount(rowData.length);
    }, [rowData])

    return (
        <>
            <div className="rounded-md shadow-sm font-semibold text-gray-600 p-3 dark:text-slate-300">
                <SearchBar001 fetchData={fetchData} searchBarLabel='' searchState={searchState} />
                <div className="flex justify-end mb-2">
                    <span>{count} 건</span>
                </div>
                <Grid02 columns={gColumns} rowData={rowData} loading={loading} height="h-[calc(100vh-320px)]" />
            </div>
        </>
    )
}

export default List001;