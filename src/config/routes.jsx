import Home from '@/pages/Home'
import CompList from '@/pages/trade/CompList'
import FreeBoard from '@/pages/board/freeBoard/FreeBoard'
import FreeBoardList from '@/pages/board/freeBoard/List'
import NotFound from '@/pages/NotFound'
import FreeBoardView from '@/pages/board/freeBoard/View'
import FreeBoardUpdate from '@/pages/board/freeBoard/Update'
import Register from '@/pages/board/freeBoard/Register'
import CompValue from '@/pages/trade/CompValue'
import CompValueCustom from '@/pages/trade/CompValueCustom'
import TransactionOverview from '@/pages/transaction/TransactionOverview'
import AbroadCompValue from '@/pages/trade/AbroadCompValue'

const routes = {

    /** SideBar001.jsx 에 SECTIONS 도 같이 수정 필요 */

    "Home": {
        section: '시작하기', label: 'Home', path: '/', element: <Home />
    },
    "NotFound": {
        section: 'None', show: false, label: 'NotFound', path: '*', element: <NotFound />
    },

    /* 회원정보 */
    "로그인": { section: '회원정보', label: '로그인', path: '/', element: <Home /> },

    /* 기업분석(국내) */
    "CompList": { section: '기업분석(국내)', label: '기업목록', path: '/complist', element: <CompList /> },
    "CompValue": { section: '기업분석(국내)', label: '기업분석', path: '/compvalue', element: <CompValue /> },
    "CompValueCustom": { section: '기업분석(국내)', label: '기업분석(수동)', path: '/compvalue/custom', element: <CompValueCustom /> },

    /* 기업분석(미국) */
    "AbroadCompValue": { section: '기업분석(미국)', label: '보유종목관리', path: '/compvalue/abroad', element: <AbroadCompValue /> },

    /* 거래 */
    "TransactionOverview": { section: '거래', label: '거래기록(미국)', path: '/transaction/overview', element: <TransactionOverview /> },

    /* 게시판 */
    "FreeBoard": {
        section: '게시판',
        label: '자유게시판',
        path: '/freeboard/',
        element: <FreeBoard />,
        children: [
            { section: '게시판', show: false, label: '게시글목록', path: '', element: <FreeBoardList /> },
            { section: '게시판', show: false, label: '게시글등록', path: 'regi', element: <Register /> },
            { section: '게시판', show: false, label: '게시글삭제', path: 'delete' },
            { section: '게시판', show: false, label: '게시글상세', path: 'view/:id', element: <FreeBoardView /> },
            { section: '게시판', show: false, label: '게시글수정', path: 'modi/:id', element: <FreeBoardUpdate /> },
        ]
    }
}

export default routes
