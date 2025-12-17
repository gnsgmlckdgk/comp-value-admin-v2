import BoardList from '@/component/feature/board/List002';
import SearchBar from '@/component/feature/board/search/SearchBar002';
import Button from '@/component/common/button/Button';
import AlertModal from '@/component/layouts/common/popup/AlertModal';

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

    const [alertConfig, setAlertConfig] = useState({ open: false, message: '' });
    const [confirmDeleteConfig, setConfirmDeleteConfig] = useState({ open: false, message: '' });

    useEffect(() => {
        if (isLoggedIn) fetchData(currentPage);
    }, []);

    const columns = [
        {
            headerCheckboxSelection: true,
            checkboxSelection: true,
            headerName: "번호",
            field: "id",
            width: "100px",
            cellRenderer: (params) => {
                if (params.data.notice) {
                    return '<div class="flex items-center gap-1"><svg class="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"></path></svg><span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">공지</span></div>';
                }
                return params.value;
            },
        },
        {
            headerName: "제목",
            field: "title",
            flex: 1,
            cellRenderer: (params) => {
                const isNotice = params.data.notice;
                const isSecret = params.data.secret;
                let iconHtml = '';

                if (isNotice) {
                    iconHtml = '<svg class="w-4 h-4 mr-1 inline-block text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"></path></svg>';
                }
                if (isSecret) {
                    iconHtml += '<svg class="w-4 h-4 mr-1 inline-block text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path></svg>';
                }

                return iconHtml + (params.value || '');
            },
        },
        {
            headerName: "작성자",
            field: "author",
            width: "200px",
        },
        {
            headerName: "작성일자",
            field: "createdAt",
            width: "180px",
            valueFormatter: (params) => new Date(params.value).toLocaleString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }),
        },
    ];

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

    const handleCheckSelected = () => {
        if (!gridRef.current || !gridRef.current.api) {
            openAlert('테이블이 아직 초기화되지 않았습니다.');
            return;
        }
        const selectedRows = gridRef.current.api.getSelectedRows();
        if (!selectedRows || selectedRows.length === 0) {
            openAlert('선택된 항목이 없습니다.');
            return;
        }

        const count = selectedRows.length;
        setConfirmDeleteConfig({
            open: true,
            message: `선택한 ${count}건의 게시글을 삭제하시겠습니까?\n삭제된 게시글은 복구할 수 없습니다.`
        });
    };

    const executeDelete = async () => {
        const selectedRows = gridRef.current.api.getSelectedRows();
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
            // 2) 신규: { success, code, message, response: { notices, posts, total } }
            const payload = data.response ?? data;

            const mapItem = (item) => ({
                ...item,
                author: item.memberNickname && item.memberUsername
                    ? `${item.memberNickname} (${item.memberUsername})`
                    : item.memberNickname || item.memberUsername || '',
                memberNickname: item.memberNickname,
                memberUsername: item.memberUsername,
            });

            // 공지글과 일반글 처리
            const notices = (payload.notices ?? []).map(mapItem);
            const posts = (payload.posts ?? payload.data ?? []).map(mapItem);

            // 공지글을 맨 위에 배치
            const allRows = [...notices, ...posts];

            setTotalCount(payload.total ?? 0);
            setRowData(allRows);
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
                        <p className="text-sm text-slate-600 dark:text-slate-400 hidden sm:block">자유롭게 의견을 나누는 공간입니다</p>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                        <Button children="등록" onClick={moveRegisterPage} className="w-20 sm:w-24" />
                        {canDelete && (
                            <Button children="삭제" onClick={handleCheckSelected} variant="danger" className="w-20 sm:w-24" />
                        )}
                    </div>
                </div>

                {/* SearchBar */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4 shadow-sm dark:bg-slate-800 dark:border-slate-700">
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

            <AlertModal
                open={alertConfig.open}
                message={alertConfig.message}
                onClose={() => setAlertConfig({ open: false, message: '' })}
            />

            <AlertModal
                open={confirmDeleteConfig.open}
                title="삭제 확인"
                message={confirmDeleteConfig.message}
                onClose={() => setConfirmDeleteConfig({ open: false, message: '' })}
                onConfirm={executeDelete}
            />

        </>
    )
}

export default List;