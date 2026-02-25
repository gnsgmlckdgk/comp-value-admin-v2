import { Outlet } from 'react-router-dom';
import PageTitle from '@/component/common/display/PageTitle';

function FreeBoard() {

    return (
        <>
            <PageTitle />
            <Outlet />
        </>
    )
}

export default FreeBoard