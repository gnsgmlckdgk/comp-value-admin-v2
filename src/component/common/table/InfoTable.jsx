
// src/component/common/table/InfoTable.jsx
const InfoTable = ({ headers = [], rows = [] }) => {
    return (
        <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm text-left text-gray-900 border border-gray-300 rounded-md">
                <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                        {headers.map((header, idx) => (
                            <th key={idx} className="px-4 py-2 font-semibold text-gray-700">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, idx) => (
                        <tr key={idx} className="border-b border-gray-300">
                            <th className="px-4 py-3 font-medium bg-gray-50 w-40">{row[0]}</th>
                            <td className="px-4 py-3 font-semibold">{row[1]}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default InfoTable;