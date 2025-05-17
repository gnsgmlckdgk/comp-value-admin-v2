import Home from '@/pages/Home'
import CompList from '@/pages/trade/CompList'
import FreeBoard from '@/pages/board/freeBoard/FreeBoard'
import FreeBoardList from '@/pages/board/freeBoard/List'
import NotFound from '@/pages/NotFound'
import FreeBoardView from '@/pages/board/freeBoard/View'
import FreeBoardUpdate from '@/pages/board/freeBoard/Update'

const routes = {

    "Home": {
        section: '시작하기', label: 'Home', path: '/', element: <Home />
    },
    "NotFound": {
        section: 'None', show: false, label: 'NotFound', path: '*', element: <NotFound />
    },

    /* 기업분석 */
    "CompList": {
        section: '기업분석',
        label: '기업목록',
        path: '/complist',
        element: <CompList />
    },

    /* 게시판 */
    "FreeBoard": {
        section: '게시판',
        label: '자유게시판',
        path: '/freeboard/',
        element: <FreeBoard />,
        children: [
            { section: '게시판', show: false, label: '게시글목록', path: '', element: <FreeBoardList /> },
            { section: '게시판', show: false, label: '게시글등록', path: 'regi', element: <Home /> },
            { section: '게시판', show: false, label: '게시글삭제', path: 'delete', element: <Home /> },
            { section: '게시판', show: false, label: '게시글상세', path: 'view/:id', element: <FreeBoardView /> },
            { section: '게시판', show: false, label: '게시글수정', path: 'modi/:id', element: <FreeBoardUpdate /> },
        ]
    }
}

export default routes
