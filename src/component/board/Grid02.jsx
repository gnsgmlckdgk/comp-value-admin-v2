import { useState, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-theme-alpine.css'; // 테마 CSS

import { ModuleRegistry, ClientSideRowModelModule, ValidationModule, PaginationModule } from 'ag-grid-community';
import { RowDragModule } from 'ag-grid-community';
ModuleRegistry.registerModules([
    ClientSideRowModelModule,
    RowDragModule,
    ValidationModule,
    PaginationModule
]);


const ProgressComponent = () => {
    return (
        <div className="flex flex-col items-center justify-center p-6 text-gray-500">
            <svg className="animate-spin h-8 w-8 mb-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <p>로딩 중입니다...</p>
        </div>
    )
}

const NoDataComponent = () => {
    return (
        <div className="flex flex-col items-center justify-center p-6 text-gray-500" >
            <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M12 3v1m0 16v1m8.485-8.485l-.707.707M4.222 4.222l.707.707M3 12h1m16 0h1m-8.485 8.485l.707-.707M4.222 19.778l.707-.707" />
            </svg>
            <p>표시할 데이터가 없습니다.</p>
        </div>
    )
}



function Grid02({ columns, rowData = [], paginationViewYn = false, loading = false }) {

    const [gridApi, setGridApi] = useState(null);

    const [totalCount, setTotalCount] = useState(0);       // 전체 데이터 건수
    const [pageSize, setPageSize] = useState(20);          // 한 페이지에 보여줄 데이터 수
    const [currentPage, setCurrentPage] = useState(1);     // 현재 페이지 번호
    const [pageBlock, setPageBlock] = useState(3);         // 한 번에 보여줄 페이지 버튼 수
    const [totalPage, setTotalPage] = useState(0);         // 전체 페이지 수

    const [startPage, setStartPage] = useState(0);
    const [endPage, setEndPage] = useState(0);


    // 그리드 상호작용
    useEffect(() => {
        if (gridApi) {
            if (loading) {
                gridApi.showLoadingOverlay();
            } else {
                if (rowData.length === 0) {
                    gridApi.showNoRowsOverlay();
                } else {
                    gridApi.hideOverlay();
                }
            }
        }
    }, [loading, rowData, gridApi]);

    // 페이징 처리
    useEffect(() => {

        const realTotalCount = rowData.length; // 직접 변수로 저장
        const realTotalPage = Math.ceil(realTotalCount / pageSize);
        const realStartPage = Math.floor((currentPage - 1) / pageBlock) * pageBlock + 1;
        let realEndPage = realStartPage + pageBlock - 1;
        if (realEndPage > realTotalPage) realEndPage = realTotalPage;

        setTotalCount(realTotalCount);
        setTotalPage(Math.ceil(realTotalCount / pageSize));
        setStartPage(Math.floor((currentPage - 1) / pageBlock) * pageBlock + 1);
        setEndPage(realEndPage);

        console.log("totalCount", realTotalCount);
        console.log("pageSize", pageSize);
        console.log("currentPage", currentPage);
        console.log("pageBlock", pageBlock);
        console.log("totalPage", realTotalPage);
        console.log("startPage", realStartPage);
        console.log("endPage", realEndPage);

    }, [rowData, currentPage])

    const onGridReady = (params) => {
        setGridApi(params.api);
    };

    return (
        <>
            <div className="flex items-center gap-2 mb-1">
                {/* 데이터 출력 개수 */}
                <label className="text-sm">표시 개수:</label>
                <select
                    value={pageSize}
                    className="border border-gray-300 rounded px-2 py-1 text-sm">
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="30">30</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                </select>

                {/* 페이지버튼 */}
                <div className='ml-10'>
                    <button className="p-1 mr-3 cursor-pointer hover:scale-150">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 16" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <button className='p-1 mr-1 ml-1 cursor-pointer hover:text-amber-700 hover:scale-110'>1</button>
                    <button className='p-1 mr-1 ml-1 cursor-pointer hover:text-amber-700 hover:scale-110'>2</button>
                    <button className='p-1 mr-1 ml-1 cursor-pointer hover:text-amber-700 hover:scale-110'>3</button>

                    <button className="p-1 ml-3 cursor-pointer hover:scale-150">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 16" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M6 5l7 7-7 7" />
                        </svg>
                    </button>

                </div>
            </div >

            <div className="ag-theme-alpine md:h-156 h-96">
                <AgGridReact
                    onGridReady={onGridReady}

                    rowData={rowData}
                    columnDefs={columns}
                    pagination={paginationViewYn}
                    paginationPageSize={pageSize}
                    enableCellTextSelection={true}
                    pageSize={pageSize}

                    loadingOverlayComponent={ProgressComponent}
                    noRowsOverlayComponent={NoDataComponent}

                    rowHeight={48}
                />
            </div>
        </>
    );
}

export default Grid02