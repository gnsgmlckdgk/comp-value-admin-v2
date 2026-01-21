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
import AbroadCompanyList from '@/pages/trade/AbroadCompanyList'
import AbroadRecommendedStock from '@/pages/trade/AbroadRecommendedStock'
import SellRecordHistory from '@/pages/trade/SellRecordHistory'
import InvestmentEvaluation from '@/pages/trade/InvestmentEvaluation'
import MyProfile from '@/pages/member/MyProfile'
import EditProfile from '@/pages/member/EditProfile'
import MemberManagement from '@/pages/member/MemberManagement'
import Join from '@/pages/member/Join'
import CointradeDashboard from '@/pages/cointrade/CointradeDashboard'
import CointradeConfig from '@/pages/cointrade/CointradeConfig'
import CointradeCoins from '@/pages/cointrade/CointradeCoins'
import CointradeScheduler from '@/pages/cointrade/CointradeScheduler'
import CointradeHistory from '@/pages/cointrade/CointradeHistory'
import MlModelInfo from '@/pages/cointrade/MlModelInfo'

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
    "Join": { section: '회원정보', show: false, label: '회원가입', path: '/member/join', element: <Join /> },
    "MyProfile": { section: '회원정보', show: false, label: '내 정보', path: '/member/myprofile', element: <MyProfile /> },
    "EditProfile": { section: '회원정보', show: false, label: '회원정보 수정', path: '/member/myprofile/edit', element: <EditProfile /> },
    "MemberManagement": { section: '회원정보', show: false, label: '회원 관리 (관리자)', path: '/member/management', element: <MemberManagement /> },

    /* 기업분석(국내) */
    "CompList": { section: '기업분석(국내)', label: '기업목록', path: '/complist', element: <CompList /> },
    "CompValue": { section: '기업분석(국내)', label: '기업분석', path: '/compvalue', element: <CompValue /> },
    "CompValueCustom": { section: '기업분석(국내)', label: '기업분석(수동)', path: '/compvalue/custom', element: <CompValueCustom /> },

    /* 기업분석(미국) */
    "AbroadCompanyList": { section: '기업분석(미국)', label: '기업목록', path: '/complist/abroad', element: <AbroadCompanyList /> },
    "AbroadRecommendedStock": { section: '기업분석(미국)', label: '기업추천', path: '/recommended/abroad', element: <AbroadRecommendedStock /> },
    "AbroadCompValue": { section: '기업분석(미국)', label: '기업분석', path: '/compvalue/abroad', element: <AbroadCompValue /> },

    /* 거래 */
    "InvestmentEvaluation": { section: '거래', label: '투자판단', path: '/trade/evaluation', element: <InvestmentEvaluation /> },
    "TransactionOverview": { section: '거래', label: '보유종목관리', path: '/transaction/overview', element: <TransactionOverview /> },
    "SellRecordHistory": { section: '거래', label: '매도현황기록', path: '/trade/sellrecord', element: <SellRecordHistory /> },

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
    },

    /* 코인 */
    "CointradeDashboard": {
        section: '코인',
        label: '자동매매 대시보드',
        path: '/cointrade/dashboard',
        element: <CointradeDashboard />,
        requiredRoles: ['ROLE_SUPER_ADMIN']
    },
    "CointradeConfig": {
        section: '코인',
        label: '자동매매 파라미터 설정',
        path: '/cointrade/config',
        element: <CointradeConfig />,
        requiredRoles: ['ROLE_SUPER_ADMIN']
    },
    "CointradeCoins": {
        section: '코인',
        label: '대상 종목 설정',
        path: '/cointrade/coins',
        element: <CointradeCoins />,
        requiredRoles: ['ROLE_SUPER_ADMIN']
    },
    "CointradeScheduler": {
        section: '코인',
        label: '스케줄러 관리',
        path: '/cointrade/scheduler',
        element: <CointradeScheduler />,
        requiredRoles: ['ROLE_SUPER_ADMIN']
    },
    "CointradeHistory": {
        section: '코인',
        label: '거래기록 조회',
        path: '/cointrade/history',
        element: <CointradeHistory />,
        requiredRoles: ['ROLE_SUPER_ADMIN']
    },
    "MlModelInfo": {
        section: '코인',
        label: '모델 예측정보 조회',
        path: '/cointrade/ml-models',
        element: <MlModelInfo />,
        requiredRoles: ['ROLE_SUPER_ADMIN']
    }
}

export default routes
