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
import MLRetrainManagement from '@/pages/trade/MLRetrainManagement'
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
import CointradeMLRetrain from '@/pages/cointrade/CointradeMLRetrain'
import Backtest from '@/pages/cointrade/Backtest'
// BacktestOptimizer 삭제됨 (v4.0 모멘텀 스캘핑 전환)
import ExcelViewer from '@/pages/util/excel-viewer'
import ExchangeRate from '@/pages/util/exchange-rate'
import JsonViewer from '@/pages/util/json-viewer'
import Memo from '@/pages/util/memo'
import Calculator from '@/pages/util/calculator'
import MonitoringDashboard from '@/pages/monitoring/MonitoringDashboard'

import { SECTIONS } from '@/component/layouts/common/SideBar001';
import {
    Home as HomeIcon, List, BarChart3, Pencil, Sparkles, Brain, Scale, Briefcase,
    Receipt, MessageSquare, LayoutDashboard, Settings, Coins, CalendarClock,
    History, LineChart, FlaskConical, FileSpreadsheet, DollarSign, Braces,
    StickyNote, Calculator as CalculatorIcon, Activity
} from 'lucide-react';

const routes = {

    "Home": {
        section: SECTIONS[0], label: 'Home', path: '/', element: <Home />, icon: HomeIcon
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
    "CompList": { section: SECTIONS[1], label: '기업목록', path: '/complist', element: <CompList />, icon: List },
    "CompValue": { section: SECTIONS[1], label: '기업분석', path: '/compvalue', element: <CompValue />, icon: BarChart3 },
    "CompValueCustom": { section: SECTIONS[1], label: '기업분석(수동)', path: '/compvalue/custom', element: <CompValueCustom />, icon: Pencil },

    /* 기업분석(미국) */
    "AbroadCompanyList": { section: SECTIONS[2], label: '기업목록', path: '/complist/abroad', element: <AbroadCompanyList />, icon: List },
    "AbroadRecommendedStock": { section: SECTIONS[2], label: '기업추천', path: '/recommended/abroad', element: <AbroadRecommendedStock />, icon: Sparkles },
    "AbroadCompValue": { section: SECTIONS[2], label: '기업분석', path: '/compvalue/abroad', element: <AbroadCompValue />, icon: BarChart3 },
    "MLRetrainManagement": { section: SECTIONS[2], label: 'AI 모델 관리', path: '/ml/retrain', element: <MLRetrainManagement />, icon: Brain },

    /* 거래 */
    "InvestmentEvaluation": { section: SECTIONS[3], label: '투자판단', path: '/trade/evaluation', element: <InvestmentEvaluation />, icon: Scale },
    "TransactionOverview": { section: SECTIONS[3], label: '보유종목관리', path: '/transaction/overview', element: <TransactionOverview />, icon: Briefcase },
    "SellRecordHistory": { section: SECTIONS[3], label: '매도현황기록', path: '/trade/sellrecord', element: <SellRecordHistory />, icon: Receipt },

    /* 게시판 */
    "FreeBoard": {
        section: SECTIONS[4],
        label: '자유게시판',
        path: '/freeboard/',
        element: <FreeBoard />,
        icon: MessageSquare,
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
        icon: LayoutDashboard,
        accessRoles: ['ROLE_SUPER_ADMIN']
    },
    "CointradeConfig": {
        section: SECTIONS[5],
        label: '자동매매 파라미터 설정',
        path: '/cointrade/config',
        element: <CointradeConfig />,
        icon: Settings,
        accessRoles: ['ROLE_SUPER_ADMIN']
    },
    "CointradeCoins": {
        section: SECTIONS[5],
        label: '대상 종목 설정',
        path: '/cointrade/coins',
        element: <CointradeCoins />,
        icon: Coins,
        accessRoles: ['ROLE_SUPER_ADMIN']
    },
    "CointradeScheduler": {
        section: SECTIONS[5],
        label: '스케줄러 관리',
        path: '/cointrade/scheduler',
        element: <CointradeScheduler />,
        icon: CalendarClock,
        accessRoles: ['ROLE_SUPER_ADMIN']
    },
    "CointradeHistory": {
        section: SECTIONS[5],
        label: '거래기록 조회',
        path: '/cointrade/history',
        element: <CointradeHistory />,
        icon: History,
        accessRoles: ['ROLE_SUPER_ADMIN']
    },
    "MlModelInfo": {
        section: SECTIONS[5],
        label: '모델 예측정보 조회',
        path: '/cointrade/ml-models',
        element: <MlModelInfo />,
        icon: LineChart,
        accessRoles: ['ROLE_SUPER_ADMIN']
    },
    "CointradeMLRetrain": {
        section: SECTIONS[5],
        label: 'AI 모델 관리',
        path: '/cointrade/ml-retrain',
        element: <CointradeMLRetrain />,
        icon: Brain,
        accessRoles: ['ROLE_SUPER_ADMIN']
    },
    "Backtest": {
        section: SECTIONS[5],
        label: '페이퍼 트레이딩',
        path: '/cointrade/backtest',
        element: <Backtest />,
        icon: FlaskConical,
        accessRoles: ['ROLE_SUPER_ADMIN']
    },
    // BacktestOptimizer 라우트 삭제됨 (v4.0)

    /* 유틸 */
    "ExcelViewer": {
        section: SECTIONS[6],
        label: '엑셀 보기',
        path: '/util/excel-viewer',
        element: <ExcelViewer />,
        icon: FileSpreadsheet
    },
    "ExchangeRate": {
        section: SECTIONS[6],
        label: '환율 계산기',
        path: '/util/exchange-rate',
        element: <ExchangeRate />,
        icon: DollarSign
    },
    "JsonViewer": {
        section: SECTIONS[6],
        label: 'JSON 뷰어',
        path: '/util/json-viewer',
        element: <JsonViewer />,
        icon: Braces
    },
    "Memo": {
        section: SECTIONS[6],
        label: '메모',
        path: '/util/memo',
        element: <Memo />,
        icon: StickyNote
    },
    "Calculator": {
        section: SECTIONS[6],
        label: '계산기',
        path: '/util/calculator',
        element: <Calculator />,
        icon: CalculatorIcon
    },

    /* 모니터링 */
    "MonitoringDashboard": {
        section: SECTIONS[7],
        label: '실시간 대시보드',
        path: '/monitoring',
        element: <MonitoringDashboard />,
        icon: Activity,
        accessRoles: ['ROLE_SUPER_ADMIN']
    }
}

export default routes
