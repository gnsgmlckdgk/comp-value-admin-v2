import { useState } from 'react'



function NotFound() {

    const [message, setMessage] = useState("404 NotFound!! ㅠㅠ");

    return (
        <>
            <h1>{message}</h1>
        </>
    )

}

export default NotFound;