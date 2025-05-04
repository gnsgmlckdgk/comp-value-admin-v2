import Grid02 from '@/component/grid/Grid02';
import SearchBar from '@/component/search/SearchBar';

import { useState, useEffect } from 'react';



function Board001({ columns = [], rowData = [], fetchData, loading = false }) {

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
        <>
            <div className="rounded-md shadow-sm font-semibold text-gray-600">
                <div className='mb-3 text-right pr-2'>
                    <SearchBar fetchData={fetchData} searchBarLabel='' />
                </div>
                <Grid02 columns={gColumns} rowData={rowData} loading={loading} />
            </div>
        </>
    )
}

export default Board001;