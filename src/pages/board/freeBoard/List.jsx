import BoardList from '@/component/feature/board/List002';
import SearchBar from '@/component/feature/board/search/SearchBar002';
import Button from '@/component/common/button/Button';
import BoardAlertModal from '@/component/layouts/common/popup/BoardAlertModal';

import { useAuth } from '@/context/AuthContext';
import { send } from '@/util/ClientUtil';

import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function List() {
    const location = useLocation();
    const state = location.state || {};
    const gridRef = useRef(); // 자식 컴포넌트 정보를 담기위해 생성(그리드 정보)

    const { isLoggedIn, roles } = useAuth(); // 로그인 상태 및 역할

    const [loading, setLoading] = useState(false);
    const [rowData, setRowData] = useState([]);
    const [search, setSearch] = useState(state.search || '');
    const [sgubun, setSgubun] = useState(state.sgubun || ''); // 검색구분

    const navigate = useNavigate();

    // 페이징
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(state.currentPage || 1);
    // const [pageBlock, setPageBlock] = useState(5);
    // const [pageSize, setPageSize] = useState(20);

    // 그리드
    const [columns, setColumns] = useState([]);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [alertConfig, setAlertConfig] = useState({ open: false, message: '' });

    useEffect(() => {
        if (isLoggedIn) fetchData(currentPage);
    }, []);

    // 반응형 그리드 설정용
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            updateColumns(mobile);
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // 초기 실행

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const updateColumns = (mobile) => {
        const newCols = [
            {
                headerCheckboxSelection: true,
                checkboxSelection: true,
                headerName: "ID",
                field: "id",
                hide: mobile,
            },
            {
                headerName: "제목", field: "title", flex: 3, sortable: false, filter: true,
                ...(mobile && {
                    headerCheckboxSelection: true,
                    checkboxSelection: true,
                })
            },
            { headerName: "작성자", field: "author", flex: 1, sortable: false, filter: true, hide: mobile },
            {
                headerName: "작성일자",
                field: "createdAt",
                flex: 2,
                sortable: false,
                valueFormatter: (params) => new Date(params.value).toLocaleString(),
                hide: mobile,
            },
        ];

        setColumns(newCols);
    }

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

    const openAlert = (message) => {
        setAlertConfig({ open: true, message });
    };

    const handleCheckSelected = async () => {
        if (!gridRef.current || !gridRef.current.api) {
            console.warn("그리드가 아직 초기화되지 않았습니다.");
            return;
        }
        const selectedRows = gridRef.current.api.getSelectedRows();
        if (!selectedRows || selectedRows.length === 0) {
            openAlert('선택된 행이 없습니다.');
            return;
        }

        const idList = selectedRows.map((row) => row.id);

        let successCount = 0;
        let failCount = 0;
        let lastErrorMessage = '';

        for (const id of idList) {
            const sendUrl = `/dart/freeboard/delete/${id}`;
            const { data, error } = await send(sendUrl, {}, "DELETE");
            if (error) {
                failCount++;
                lastErrorMessage = error;
                // 권한 문제나 기타 오류가 계속 날 수 있으므로, 나머지는 더 이상 시도하지 않고 중단
                break;
            } else {
                successCount++;
            }
        }

        if (successCount > 0) {
            const suffix = failCount > 0 ? '\n일부 게시글은 삭제되지 않았습니다.' : '';
            openAlert(`${successCount}건의 게시글을 삭제했습니다.${suffix}`);
            fetchData(currentPage);
        } else if (failCount > 0) {
            // 모두 실패한 경우 → 서버에서 내려준 에러 메시지를 그대로 노출
            openAlert(lastErrorMessage || '게시글 삭제 중 오류가 발생했습니다.');
        }
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

        if (error === null && data) {
            // 백엔드 응답 형태:
            // 1) 기존: { total, data }
            // 2) 신규: { success, code, message, response: { total, data } }
            const payload = data.response ?? data;

            console.log("[DEBUG] 백엔드에서 받은 데이터 순서 확인:", payload.data?.map(item => ({
                id: item.id,
                createdAt: item.createdAt,
                title: item.title
            })));

            const rows = (payload.data ?? []).map((item) => ({
                // 기존 구조 호환을 위해 전체를 그대로 두고
                ...item,
                // 그리드에서 사용하는 author 컬럼을 백엔드 작성자 필드에 맞춰 매핑
                author: item.memberNickname ?? item.memberUsername ?? '',
            }));

            console.log("[DEBUG] 그리드에 전달되는 데이터 순서:", rows.map(item => ({
                id: item.id,
                createdAt: item.createdAt,
                title: item.title
            })));

            setTotalCount(payload.total ?? 0);
            setRowData(rows);
        } else {
            setTotalCount(0);
            setRowData([]);
        }

        setLoading(false);
    }

    // ---- 역할 계산 (ROLE_SUPER_ADMIN / ROLE_ADMIN / ROLE_USER 등) ----
    let storedRoles = [];
    try {
        const raw = localStorage.getItem('roles');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                storedRoles = parsed;
            }
        }
    } catch {
        storedRoles = [];
    }

    const effectiveRoles = (roles && roles.length ? roles : storedRoles).map((r) =>
        (r || '').toString().toUpperCase()
    );

    const isSuperAdmin = effectiveRoles.some((r) => r.includes('SUPER_ADMIN'));
    const isAdmin = !isSuperAdmin && effectiveRoles.some((r) => r.includes('ADMIN'));
    const canDelete = isSuperAdmin || isAdmin;

    return (
        <>
            {/* 상단 영역 */}
            <div className="mt-4 md:mt-6 mb-4 md:mb-6 w-full px-2 md:px-4">
                {/* 헤더와 버튼 */}
                <div className="mb-3 md:mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <p className="text-sm text-slate-600 hidden sm:block">자유롭게 의견을 나누는 공간입니다</p>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                        <Button children="등록" onClick={moveRegisterPage} className="w-20 sm:w-24" />
                        {canDelete && (
                            <Button children="삭제" onClick={handleCheckSelected} variant="danger" className="w-20 sm:w-24" />
                        )}
                    </div>
                </div>

                {/* SearchBar */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4 shadow-sm">
                    <SearchBar
                        fetchData={() => fetchData(1)}
                        searchBarLabel=""
                        searchState={{ search, setSearch, sgubun, setSgubun, searchGubunList }}
                    />
                </div>
            </div>

            <BoardList
                ref={gridRef}
                fetchData={fetchData}
                columns={columns}
                rowData={rowData}
                loading={loading}
                moveViewPage={moveViewPage}
                searchState={{ search, setSearch, sgubun, setSgubun, searchGubunList }}
                pageNationProps={pageNationProps}
            />

            <BoardAlertModal
                open={alertConfig.open}
                message={alertConfig.message}
                onClose={() => setAlertConfig({ open: false, message: '' })}
            />

        </>
    )
}

export default List;