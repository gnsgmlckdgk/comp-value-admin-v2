import { useState, useEffect } from 'react';

function PageNation({ totalCount, pageSize = 10, pageBlock = 3, currentPage, onPageChange }) {
    const [totalPage, setTotalPage] = useState(0);
    const [startPage, setStartPage] = useState(0);
    const [endPage, setEndPage] = useState(0);

    useEffect(() => {
        const realTotalPage = Math.ceil(totalCount / pageSize);
        const realStartPage = Math.floor((currentPage - 1) / pageBlock) * pageBlock + 1;
        let realEndPage = realStartPage + pageBlock - 1;
        if (realEndPage > realTotalPage) realEndPage = realTotalPage;

        setTotalPage(realTotalPage);
        setStartPage(realStartPage);
        setEndPage(realEndPage);
    }, [totalCount, pageSize, pageBlock, currentPage]);

    if (totalPage === 0) return null; // 데이터 없으면 렌더링 안함

    const goPrevBlock = () => {
        const prevPage = Math.max(startPage - 1, 1);
        onPageChange(prevPage);
    };

    const goNextBlock = () => {
        const nextPage = Math.min(endPage + 1, totalPage);
        onPageChange(nextPage);
    };

    return (
        <div className="flex justify-center items-center space-x-2 my-4">
            {/* << 버튼 */}
            {startPage > 1 && (
                <button onClick={goPrevBlock} className="p-2 hover:scale-110">
                    ◀
                </button>
            )}

            {/* 페이지 번호 버튼들 */}
            {Array.from({ length: endPage - startPage + 1 }, (_, idx) => {
                const page = startPage + idx;
                return (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`px-3 py-1 rounded border 
                            ${page === currentPage ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}
                        `}
                    >
                        {page}
                    </button>
                );
            })}

            {/* >> 버튼 */}
            {endPage < totalPage && (
                <button onClick={goNextBlock} className="p-2 hover:scale-110">
                    ▶
                </button>
            )}
        </div>
    );
}

export default PageNation;