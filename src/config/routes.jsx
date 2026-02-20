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
import Backtest from '@/pages/cointrade/Backtest'
import BacktestOptimizer from '@/pages/cointrade/BacktestOptimizer'
import ExcelViewer from '@/pages/util/excel-viewer'
import MonitoringDashboard from '@/pages/monitoring/MonitoringDashboard'

import { SECTIONS } from '@/component/layouts/common/SideBar001';

const routes = {

    /** SideBar001.jsx 에 SECTIONS 도 같이 수정 필요 */

    "Home": {
        section: SECTIONS[0], label: 'Home', path: '/', element: <Home />
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
    "CompList": { section: SECTIONS[1], label: '기업목록', path: '/complist', element: <CompList /> },
    "CompValue": { section: SECTIONS[1], label: '기업분석', path: '/compvalue', element: <CompValue /> },
    "CompValueCustom": { section: SECTIONS[1], label: '기업분석(수동)', path: '/compvalue/custom', element: <CompValueCustom /> },

    /* 기업분석(미국) */
    "AbroadCompanyList": { section: SECTIONS[2], label: '기업목록', path: '/complist/abroad', element: <AbroadCompanyList /> },
    "AbroadRecommendedStock": { section: SECTIONS[2], label: '기업추천', path: '/recommended/abroad', element: <AbroadRecommendedStock /> },
    "AbroadCompValue": { section: SECTIONS[2], label: '기업분석', path: '/compvalue/abroad', element: <AbroadCompValue /> },

    /* 거래 */
    "InvestmentEvaluation": { section: SECTIONS[3], label: '투자판단', path: '/trade/evaluation', element: <InvestmentEvaluation /> },
    "TransactionOverview": { section: SECTIONS[3], label: '보유종목관리', path: '/transaction/overview', element: <TransactionOverview /> },
    "SellRecordHistory": { section: SECTIONS[3], label: '매도현황기록', path: '/trade/sellrecord', element: <SellRecordHistory /> },

    /* 게시판 */
    "FreeBoard": {
        section: SECTIONS[4],
        label: '자유게시판',
        path: '/freeboard/',
        element: <FreeBoard />,
        children: [
            { section: SECTIONS[4], show: false, label: '게시글목록', path: '', element: <FreeBoardList /> },
            { section: SECTIONS[4], show: false, label: '게시글등록', path: 'regi', element: <Register /> },
            { section: SECTIONS[4], show: false, label: '게시글삭제', path: 'delete' },
            { section: SECTIONS[4], show: false, label: '게시글상세', path: 'view/:id', element: <FreeBoardView /> },
            { section: SECTIONS[4], show: false, label: '게시글수정', path: 'modi/:id', element: <FreeBoardUpdate /> },
        ]
    },

    /* 코인 */
    "CointradeDashboard": {
        section: SECTIONS[5],
        label: '자동매매 대시보드',
        path: '/cointrade/dashboard',
        element: <CointradeDashboard />,
        accessRoles: ['ROLE_SUPER_ADMIN']
    },
    "CointradeConfig": {
        section: SECTIONS[5],
        label: '자동매매 파라미터 설정',
        path: '/cointrade/config',
        element: <CointradeConfig />,
        accessRoles: ['ROLE_SUPER_ADMIN']
    },
    "CointradeCoins": {
        section: SECTIONS[5],
        label: '대상 종목 설정',
        path: '/cointrade/coins',
        element: <CointradeCoins />,
        accessRoles: ['ROLE_SUPER_ADMIN']
    },
    "CointradeScheduler": {
        section: SECTIONS[5],
        label: '스케줄러 관리',
        path: '/cointrade/scheduler',
        element: <CointradeScheduler />,
        accessRoles: ['ROLE_SUPER_ADMIN']
    },
    "CointradeHistory": {
        section: SECTIONS[5],
        label: '거래기록 조회',
        path: '/cointrade/history',
        element: <CointradeHistory />,
        accessRoles: ['ROLE_SUPER_ADMIN']
    },
    "MlModelInfo": {
        section: SECTIONS[5],
        label: '모델 예측정보 조회',
        path: '/cointrade/ml-models',
        element: <MlModelInfo />,
        accessRoles: ['ROLE_SUPER_ADMIN']
    },
    "Backtest": {
        section: SECTIONS[5],
        label: '백테스트',
        path: '/cointrade/backtest',
        element: <Backtest />,
        accessRoles: ['ROLE_SUPER_ADMIN']
    },
    "BacktestOptimizer": {
        section: SECTIONS[5],
        label: '백테스트 옵티마이저',
        path: '/cointrade/backtest-optimizer',
        element: <BacktestOptimizer />,
        accessRoles: ['ROLE_SUPER_ADMIN']
    },

    /* 유틸 */
    "ExcelViewer": {
        section: SECTIONS[6],
        label: '엑셀 보기',
        path: '/util/excel-viewer',
        element: <ExcelViewer />
    },

    /* 모니터링 */
    "MonitoringDashboard": {
        section: SECTIONS[7],
        label: '실시간 대시보드',
        path: '/monitoring',
        element: <MonitoringDashboard />,
        accessRoles: ['ROLE_SUPER_ADMIN']
    }
}

export default routes
