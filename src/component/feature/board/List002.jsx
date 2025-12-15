import CustomTable from '@/component/feature/board/CustomTable';
import PageNation from '@/component/feature/board/pagenation/PageNation';

import { forwardRef } from 'react';

const List002 = forwardRef(({ columns = [], rowData = [], fetchData, loading = false, moveViewPage, pageNationProps }, ref) => {

    return (
        <div className="px-2 md:px-4 py-3">
            <CustomTable ref={ref} columns={columns} rowData={rowData} loading={loading} moveViewPage={moveViewPage} />
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