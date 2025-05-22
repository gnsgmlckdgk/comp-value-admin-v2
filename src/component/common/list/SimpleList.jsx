


const SimpleList = ({ rows = [] }) => {

    return (
        <>
            <ul className="space-y-2 text-sm">
                {rows.map((row, idx) => (
                    <li key={idx}>
                        {row[0]}: {row[1]}
                    </li>
                ))}
            </ul>
        </>
    )
}

export default SimpleList;