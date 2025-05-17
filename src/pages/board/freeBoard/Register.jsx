import { useLocation, useNavigate } from 'react-router-dom';

import Register001 from '@/component/feature/board/Register001'

import { send } from '@/util/ClientUtil';


const Register = () => {

    const navigate = useNavigate();
    const location = useLocation();


    const onRegister = async (title, author, content) => {

        const sendUrl = `/dart/freeboard/regi`;
        const { data, error } = await send(sendUrl, {
            title: title,
            author: author,
            content: content
        }, "POST");

        if (data) {
            alert('게시글 등록이 완료되었습니다.');
            navigate(`/freeboard/`);
        } else {
            alert('게시글 등록중 문제가 발생했습니다.');
            console.log(error);
        }
    }

    const moveListPage = () => {
        navigate(`/freeboard/`, { state: location.state })
    }

    return (
        <>
            <Register001 onRegister={onRegister} moveListPage={moveListPage}></Register001>
        </>
    )
}

export default Register;