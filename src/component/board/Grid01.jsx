import { useState, useEffect } from 'react'
import DataTable from 'react-data-table-component'


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


function Grid01({ title = '', columns, data, paginationYn = false, loading = false }) {

    return (
        <div className="rounded-md shadow-sm font-semibold text-gray-600">
            <DataTable theme="default" title={title} columns={columns} data={data}
                pagination={paginationYn} noDataComponent={<NoDataComponent />}
                progressComponent={<ProgressComponent />} progressPending={loading} fixedHeader />
        </div>
    )
}
export default Grid01