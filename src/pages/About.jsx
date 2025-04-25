import { useState } from 'react'



function About() {

    const [desc, setDesc] = useState("Desc");

    return (
        <>
            <h1>{desc}</h1>
        </>
    )

}

export default About;