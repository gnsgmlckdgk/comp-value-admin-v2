import Home from '../pages/Home'
import CompList from '../pages/CompList'
import NotFound from '../pages/NotFound'

const routes = {

    "Home": {
        section: '기본',
        label: 'Home',
        path: '/',
        element: <Home />
    },
    "CompList": {
        section: '기업분석',
        label: '기업목록',
        path: '/complist',
        element: <CompList />
    },
    "NotFound": {
        section: 'None',
        show: false,
        label: 'NotFound',
        path: '*',
        element: <NotFound />
    }
}

export default routes
