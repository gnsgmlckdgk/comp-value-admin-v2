import Home from '../pages/Home'
import About from '../pages/About'
import NotFound from '../pages/NotFound'

const routes = {
    "Home": {
        label: 'Home',
        path: '/',
        element: <Home />
    },
    "About": {
        label: '설명',
        path: '/About',
        element: <About />
    },
    "NotFound": {
        show: false,
        label: 'NotFound',
        path: '*',
        element: <NotFound />
    }
}

export default routes
