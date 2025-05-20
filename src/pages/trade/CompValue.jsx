import Button from '@/component/common/button/Button';
import Input from '@/component/common/input/Input';
import { getToday } from '@/util/DateUtil'
import { useState, useEffect } from 'react'


const CompValue = () => {

    const [compName, setCompName] = useState('');
    const [compCode, setCompCode] = useState('');
    const [baseYear, setBaseYear] = useState(getToday('yyyy'));

    return (
        <>
            <h1 className='md:text-3xl text-xl mb-5'>기업분석</h1>

            <div>
                {/* 설명란 */}
                <div>
                    <p>당기, 전전기 등 현재년도 기준 아직 재무정보가 없는 경우
                        가장 최근 재무정보를 한번 더 읽어서 계산하기 때문에
                        수동계산이랑 값이 다를 수 있음.</p>
                </div>
                {/* 입력란 */}
                <div>
                    <Input id="compName" placeholder='기업명' value={compName} onChange={(e) => setCompName(e.target.value)} />
                    <Input id="compCode" placeholder='기업코드' value={compCode} onChange={(e) => setCompCode(e.target.value)} />
                    <Input
                        id="baseDt"
                        placeholder="기준년도"
                        inputMode="numeric"
                        value={baseYear}
                        onChange={(e) => {
                            const numeric = e.target.value.replace(/[^0-9]/g, '');
                            setBaseYear(numeric.slice(0, 4));
                        }}
                    />
                    {/* children, onClick, type = 'button', variant = 'primary', className = '' */}
                    <Button children='검색' variant='primary' onClick={{}} className='ml-1' />
                </div>
            </div>

            <div>

            </div>

        </>
    )
}

export default CompValue;