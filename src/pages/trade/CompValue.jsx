import Button from '@/component/common/button/Button';
import Input from '@/component/common/input/Input';
import InfoTable from '@/component/common/table/InfoTable';
import ToggleSection from '@/component/common/display/ToggleSection';
import SimpleList from '@/component/common/list/SimpleList';
import Loading from '@/component/common/display/Loading';
import BulkCalcPopup from './popup/BulkCalcPopup';

import { useState, useEffect } from 'react'

import { getToday } from '@/util/DateUtil'
import { send } from '@/util/ClientUtil';



const CompValue = () => {

    const [compName, setCompName] = useState('');
    const [compCode, setCompCode] = useState('');
    const [baseYear, setBaseYear] = useState(getToday('yyyy'));

    const [rowData, setRowData] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    const [isPopup, setIsPopup] = useState(false);


    const fetchData = async () => {
        setIsLoading(true);

        const sendUrl = `/dart/main/cal/per_value?corp_name=${compName}&corp_code=${compCode}&year=${baseYear}`;
        const { data, error } = await send(sendUrl, {}, "GET");

        if (error == null) {
            setRowData(data);
        } else {
            setRowData({ '결과메시지': '조회중 오류가 발생했습니다.' });
        }

        setIsLoading(false);
    }


    return (
        <>
            <h1 className='md:text-3xl text-xl mb-5'>기업분석</h1>
            <div className="px-4 py-8">

                <Loading show={isLoading} />
                {isPopup && (
                    <BulkCalcPopup onClose={() => setIsPopup(false)} year={baseYear} />
                )}

                <div>
                    {/* 설명란 */}
                    <div>
                        <p className="text-sm text-gray-500 mb-4 leading-relaxed">당기, 전전기 등 현재년도 기준 아직 재무정보가 없는 경우
                            가장 최근 재무정보를 한번 더 읽어서 계산하기 때문에
                            수동계산이랑 값이 다를 수 있음.</p>
                    </div>
                    {/* 입력란 */}
                    <div className="flex flex-col md:flex-row md:items-end gap-y-2 md:gap-x-4 mb-4 flex-wrap min-w-0">
                        <Input id="compName" placeholder='기업명' value={compName} onEnter={fetchData} onChange={(e) => setCompName(e.target.value)} className="min-w-0 flex-[2]" />
                        <Input id="compCode" placeholder='기업코드' value={compCode} onEnter={fetchData} onChange={(e) => setCompCode(e.target.value)} className="min-w-0 flex-[2]" />
                        <Input
                            id="baseDt"
                            placeholder="기준년도"
                            inputMode="numeric"
                            value={baseYear}
                            onChange={(e) => {
                                const numeric = e.target.value.replace(/[^0-9]/g, '');
                                setBaseYear(numeric.slice(0, 4));
                            }}
                            className="min-w-0 flex-1"
                        />
                        <Button children='분석' variant='primary' onClick={fetchData} className='ml-1 min-w-0 flex-[0.7]' />
                        <Button children='대량분석' variant='primary' onClick={() => setIsPopup(true)} className="min-w-0 flex-[0.7]" />
                    </div>
                </div>

                {/* 결과 */}
                <div>
                    <InfoTable
                        rows={[
                            ['결과메시지', rowData ? rowData.결과메시지 : ''],
                            ['기업명', rowData ? rowData.기업명 : ''],
                            ['기업코드', rowData ? rowData.기업코드 : ''],
                            ['주식코드', rowData ? rowData.주식코드 : ''],
                            ['주당가치', rowData?.주당가치 ? Number(rowData.주당가치).toLocaleString() : ''],
                            ['현재가격', rowData?.현재가격 ? Number(rowData.현재가격).toLocaleString() : ''],
                            ['확인시간', rowData ? rowData.확인시간 : ''],
                        ]}
                    />
                    {/* 상세결과 */}
                    <ToggleSection title="상세">
                        <SimpleList
                            rows={
                                rowData?.상세정보
                                    ? Object.entries(rowData.상세정보).map(([key, value]) => {
                                        return [key, value];
                                    })
                                    : []
                            }
                        />
                        {rowData?.상세정보 && (
                            <div className="mt-4 px-4 py-2 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded text-sm">
                                ⚠️ 위 수치는 단위 적용이 되어있지 않습니다.
                            </div>
                        )}
                    </ToggleSection>
                </div>
            </div>
        </>
    )
}

export default CompValue;