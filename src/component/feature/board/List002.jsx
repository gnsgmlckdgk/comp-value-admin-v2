import Grid02 from '@/component/grid/Grid02';
import PageNation from '@/component/feature/board/pagenation/PageNation';

import { forwardRef } from 'react';

const List002 = forwardRef(({ columns = [], rowData = [], fetchData, loading = false, moveViewPage, pageNationProps }, ref) => {

    return (
        <div className="rounded-md shadow-sm font-semibold text-gray-600 p-3">
            <Grid02 ref={ref} columns={columns} rowData={rowData} loading={loading} moveViewPage={moveViewPage} />
            <PageNation
                currentPage={pageNationProps.currentPage}
                totalCount={pageNationProps.totalCount}
                pageBlock={pageNationProps.pageBlock}
                pageSize={pageNationProps.pageSize}
                onPageChange={pageNationProps.onPageChange} />
        </div>
    )
})

export default List002;