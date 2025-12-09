import { forwardRef, useState, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';

import 'ag-grid-community/styles/ag-theme-alpine.css'; // 테마 CSS

import {
    ModuleRegistry,
    RowSelectionModule,
    ClientSideRowModelModule,
    ValidationModule,
    PaginationModule,
    TextFilterModule,
    NumberFilterModule,
    DateFilterModule,
    CellStyleModule
} from 'ag-grid-community';
ModuleRegistry.registerModules([
    RowSelectionModule,
    ClientSideRowModelModule,
    ValidationModule,
    PaginationModule,
    TextFilterModule,
    NumberFilterModule,
    DateFilterModule,
    CellStyleModule
]);

const ProgressComponent = () => {
    return (
        <div className="flex flex-col items-center justify-center p-6 text-gray-500 dark:text-slate-400">
            <svg className="animate-spin h-8 w-8 mb-3 text-blue-500 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <p>로딩 중입니다...</p>
        </div>
    )
}

const NoDataComponent = () => {
    return (
        <div className="flex flex-col items-center justify-center p-6 text-gray-500 dark:text-slate-400" >
            <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M12 3v1m0 16v1m8.485-8.485l-.707.707M4.222 4.222l.707.707M3 12h1m16 0h1m-8.485 8.485l.707-.707M4.222 19.778l.707-.707" />
            </svg>
            <p>표시할 데이터가 없습니다.</p>
        </div>
    )
}


/**
 * AG Grid를 활용하여 데이터를 테이블 형태로 렌더링하는 컴포넌트입니다.
 * 페이징 포함
 *
 * @component
 * @param {Object[]} columns - 테이블의 컬럼 정의 배열입니다.
 * @param {Object[]} [rowData=[]] - 테이블에 표시할 데이터 배열입니다.
 * @param {boolean} [loading=false] - 데이터 로딩 상태를 나타냅니다.
 * @param {boolean} [showPageNation=false] - 페이지네이션 표시 여부를 설정합니다.
 * @param {string} [height='md:h-156 h-96'] - 그리드의 높이 클래스 (Tailwind CSS)
 * @returns {JSX.Element} 렌더링된 AG Grid 컴포넌트입니다.
 *
 * @example
 * const columns = [
 *   { headerName: "이름", field: "name" },
 *   { headerName: "나이", field: "age" },
 * ];
 * const data = [
 *   { name: "홍길동", age: 30 },
 *   { name: "김철수", age: 25 },
 * ];
 *
 * <Grid02 columns={columns} rowData={data} loading={false} showPageNation={true} height="h-screen" />
 */



// function Grid02({ ref, columns, rowData = [], loading = false, showPageNation = false, moveViewPage }) {
const Grid02 = forwardRef(({ columns, rowData = [], loading = false, showPageNation = false, moveViewPage = null, height = 'md:h-156 h-96' }, ref) => {

    const [gridApi, setGridApi] = useState(null);
    const navigate = useNavigate();
    const { isDark } = useTheme();

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

    const onGridReady = (params) => {
        setGridApi(params.api);
    };

    return (
        <div className={`ag-theme-alpine ${height} ${isDark ? 'dark-mode' : ''}`}>
            {/* 그리드 */}
            <AgGridReact
                onGridReady={onGridReady}
                ref={ref}

                rowData={rowData}
                columnDefs={columns}
                pagination={showPageNation}
                enableCellTextSelection={true}

                {...(typeof moveViewPage === 'function' && {
                    onCellClicked: (params) => {
                        if (params.colDef.field !== 'id') {
                            moveViewPage(params);
                        }
                    }
                })}

                loadingOverlayComponent={ProgressComponent}
                noRowsOverlayComponent={NoDataComponent}

                rowSelection="multiple"
                rowMultiSelectWithClick={true}

                rowHeight={48}
            />
        </div>
    );
})

export default Grid02