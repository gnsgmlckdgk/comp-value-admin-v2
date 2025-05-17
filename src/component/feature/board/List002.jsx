import Grid02 from '@/component/grid/Grid02';
import SearchBar from '@/component/feature/board/search/SearchBar002';
import PageNation from '@/component/feature/board/pagenation/PageNation';

import { useState, useEffect } from 'react';

function List002({ columns = [], rowData = [], fetchData, loading = false, moveViewPage, searchState, pageNationProps }) {

    const [gColumns, setGColumns] = useState([]);

    const testColumns = [
        { headerName: "H1", field: "h1", flex: 1, sortable: false, minWidth: 110 },
        { headerName: "H2", field: "h2", flex: 2, minWidth: 150 },
        { headerName: "H3", field: "h3", flex: 1, minWidth: 110 },
        { headerName: "H4", field: "h4", flex: 1, minWidth: 100 },
    ];

    useEffect(() => {
        setGColumns(columns.length === 0 ? testColumns : columns);
        fetchData();
    }, []);

    return (
        <div className="rounded-md shadow-sm font-semibold text-gray-600 p-3">

            <SearchBar fetchData={() => fetchData(1)} searchBarLabel='' searchState={searchState} />

            <Grid02 columns={gColumns} rowData={rowData} loading={loading} moveViewPage={moveViewPage} />
            <PageNation
                currentPage={pageNationProps.currentPage}
                totalCount={pageNationProps.totalCount}
                pageBlock={pageNationProps.pageBlock}
                pageSize={pageNationProps.pageSize}
                onPageChange={pageNationProps.onPageChange} />
        </div>
    )
}

export default List002;