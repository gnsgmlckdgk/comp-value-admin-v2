// src/component/common/table/InfoTable.jsx
/**
 * InfoTable 컴포넌트
 *
 * 행과 열 데이터로 구성된 정보를 테이블 형식으로 출력하는 공통 컴포넌트입니다.
 *
 * @param {Object} props - 컴포넌트 속성
 * @param {Array<string|JSX.Element>} props.headers - 테이블의 헤더 셀 배열
 * @param {Array<Array<string|JSX.Element>>} props.rows - 행 데이터 배열 (각 행은 셀 배열)
 * @param {Array<string>} [props.colWidths=[]] - 각 컬럼의 너비 (예: "100px", "20%")
 *
 * @returns {JSX.Element} 테이블 형태로 렌더링된 요소
 *
 * @example
 * <InfoTable
 *   headers={['이름', '이메일']}
 *   rows={[
 *     ['홍길동', 'hong@example.com'],
 *     ['김철수', 'kim@example.com'],
 *   ]}
 *   colWidths={['30%', '70%']}
 * />
 */
const InfoTable = ({ headers = [], rows = [], colWidths = ['20%'] }) => {
    return (
        <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm text-left text-gray-900 border border-gray-300 rounded-md">
                <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                        {headers.map((header, idx) => (
                            <th
                                key={idx}
                                className="px-4 py-2 font-semibold text-gray-700"
                                style={colWidths[idx] ? { width: colWidths[idx] } : {}}
                            >
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, idx) => (
                        <tr key={idx} className="border-b border-gray-300">
                            {row.map((cell, idx2) => (
                                idx2 === 0 ? (
                                    <th
                                        key={idx2}
                                        className="px-4 py-3 font-medium bg-gray-50"
                                        style={colWidths[idx2] ? { width: colWidths[idx2] } : {}}
                                    >
                                        {cell}
                                    </th>
                                ) : (
                                    <td
                                        key={idx2}
                                        className="px-4 py-3 font-semibold"
                                        style={colWidths[idx2] ? { width: colWidths[idx2] } : {}}
                                    >
                                        {cell}
                                    </td>
                                )
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default InfoTable;