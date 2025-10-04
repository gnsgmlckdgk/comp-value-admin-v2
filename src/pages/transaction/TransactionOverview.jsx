import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext';
import Input from '@/component/common/input/Input';
import Button from '@/component/common/button/Button';
import SearchBar001 from '@/component/feature/board/search/SearchBar001';

function TransactionOverview() {
    const sampleData = Array.from({ length: 30 }, (_, i) => ({
        h1: `기업${i + 1}`,
        h2: `섹터${i + 1}`,
        h3: `평가${i + 1}`,
        h4: `지표${i + 1}`,
        h5: `상태${i + 1}`,
    }));

    const fetchData = () => {
        console.log("샘플 fetchData 호출됨");
    };

    return (
        <div className="flex flex-col md:flex-row gap-16">

            {/* 거래 기록 */}
            <div className="w-full md:w-1/2 border-2 border-gray-200 rounded-xl p-4">
                {/* 헤더영역 */}
                <div>
                    <h3 className="text-lg font-semibold">거래 기록(개발중)</h3>
                    <SearchBar001 fetchData={fetchData} searchBarLabel="기업명" searchState={{}} />
                </div>

                {/* 데이터 헤더 영역 */}
                <div className='h-1/2'>
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-100 text-gray-700">
                            <tr>
                                <th className="px-4 py-2 text-left">h1</th>
                                <th className="px-4 py-2 text-left">h2</th>
                                <th className="px-4 py-2 text-left">h3</th>
                                <th className="px-4 py-2 text-left">h4</th>
                                <th className="px-4 py-2 text-left">h5</th>
                            </tr>
                        </thead>
                    </table>
                </div>

                {/* 데이터 영역 */}
                <div className='overflow-y-auto'>
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <tbody className="divide-y divide-gray-100">
                            {sampleData.map((row, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-2">{row.h1}</td>
                                    <td className="px-4 py-2">{row.h2}</td>
                                    <td className="px-4 py-2">{row.h3}</td>
                                    <td className="px-4 py-2">{row.h4}</td>
                                    <td className="px-4 py-2">{row.h5}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>


            {/* 저평가 기업 목록 */}
            <div className="w-full md:w-1/2 border-2 border-gray-200 rounded-xl p-4">

                {/* 헤더영역 */}
                <div>
                    <h3 className="text-lg font-semibold">저평가 기업 목록</h3>
                    <SearchBar001 fetchData={fetchData} searchBarLabel="기업명" searchState={{}} />
                </div>

                {/* 데이터 헤더 영역 */}
                <div>
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-100 text-gray-700">
                            <tr>
                                <th className="px-4 py-2 text-left">h1</th>
                                <th className="px-4 py-2 text-left">h2</th>
                                <th className="px-4 py-2 text-left">h3</th>
                                <th className="px-4 py-2 text-left">h4</th>
                                <th className="px-4 py-2 text-left">h5</th>
                            </tr>
                        </thead>
                    </table>
                </div>

                {/* 데이터 영역 */}
                <div>
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <tbody className="divide-y divide-gray-100">
                            {sampleData.map((row, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-2">{row.h1}</td>
                                    <td className="px-4 py-2">{row.h2}</td>
                                    <td className="px-4 py-2">{row.h3}</td>
                                    <td className="px-4 py-2">{row.h4}</td>
                                    <td className="px-4 py-2">{row.h5}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>

        </div >
    );
}

export default TransactionOverview;
