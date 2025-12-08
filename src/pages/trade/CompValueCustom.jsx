import Loading from '@/component/common/display/Loading';
import InputRowList from '@/component/common/input/InputRowList_Number';
import Button from '@/component/common/button/Button';

import { useState, useEffect } from 'react'
import { send } from '@/util/ClientUtil';


const CompValueCustom = () => {

    const [isLoading, setIsLoading] = useState('');

    const [unit, setUnit] = useState('100000000');

    const [operatingProfitPrePre, setOperatingProfitPrePre] = useState('');     // 전전기 영업이익
    const [operatingProfitPre, setOperatingProfitPre] = useState('');           // 전기 영업이익
    const [operatingProfitCurrent, setOperatingProfitCurrent] = useState('');   // 당기 영업이익    

    const [currentAssetsTotal, setCurrentAssetsTotal] = useState('');           // 유동자산 합계
    const [currentLiabilitiesTotal, setCurrentLiabilitiesTotal] = useState(''); // 유동부채 합계
    const [currentRatio, setCurrentRatio] = useState('');                       // 유동비율

    const [investmentAssets, setInvestmentAssets] = useState('');               // 투자자산(비유동자산내)
    const [fixedLiabilities, setFixedLiabilities] = useState('');               // 고정부채(비유동부채)
    const [issuedShares, setIssuedShares] = useState('');                       // 발행주식수

    const [data, setData] = useState('');


    /**
     * 유동비율 계산
     * @returns 
     */
    const calculateCurrentRatio = () => {
        const assets = parseFloat(currentAssetsTotal.replace(/,/g, '')) || 0;
        const liabilities = parseFloat(currentLiabilitiesTotal.replace(/,/g, '')) || 0;
        if (liabilities === 0) {
            setCurrentRatio('0');
            return;
        }
        const ratio = (assets / liabilities);
        setCurrentRatio(ratio.toFixed(2));
    };

    /**
     * 파라미터 초기화
     */
    const resetParam = () => {
        setOperatingProfitPrePre('');
        setOperatingProfitPre('');
        setOperatingProfitCurrent('');
        setCurrentAssetsTotal('');
        setCurrentLiabilitiesTotal('');
        setCurrentRatio('');
        setInvestmentAssets('');
        setFixedLiabilities('');
        setIssuedShares('');
        setData('');
    }

    /**
     * 분석
     */
    const fetchData = async () => {

        setIsLoading(true);

        const requestBody = {
            unit: unit,
            operatingProfitPrePre: operatingProfitPrePre,
            operatingProfitPre: operatingProfitPre,
            operatingProfitCurrent: operatingProfitCurrent,
            currentAssetsTotal: currentAssetsTotal,
            currentLiabilitiesTotal: currentLiabilitiesTotal,
            currentRatio: currentRatio,
            investmentAssets: investmentAssets,
            fixedLiabilities: fixedLiabilities,
            issuedShares: issuedShares
        };

        const sendUrl = `/dart/main/cal/per_value/manual`;
        const { data, error } = await send(sendUrl, requestBody, "POST");
        if (data) {
            setData(Number(data.result).toLocaleString());
        } else {
            setData(error);
        }

        setIsLoading(false);
    }


    return (
        <>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800 dark:text-white mb-6">기업분석(수동)</h1>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md rounded-lg p-6 space-y-6">
                <Loading show={isLoading} />


                <div className="flex items-center space-x-2 mb-4">
                    <Button children="분석" onClick={fetchData} />
                    <Button children="초기화" variant="danger" onClick={resetParam} />
                    {data !== '' && (
                        <div className="px-4 py-2 bg-green-100 border border-green-300 text-green-800 rounded-md text-sm dark:bg-green-900/30 dark:border-green-700 dark:text-green-300">
                            <span className="font-medium">결과:</span> {data}
                        </div>
                    )}
                </div>

                <InputRowList
                    rows={[
                        ['단위 (Default: 1억)', unit, setUnit],
                        ['전전기 영업이익', operatingProfitPrePre, setOperatingProfitPrePre],
                        ['전기 영업이익', operatingProfitPre, setOperatingProfitPre],
                        ['당기 영업이익', operatingProfitCurrent, setOperatingProfitCurrent],
                        ['유동자산 합계', currentAssetsTotal, setCurrentAssetsTotal],
                        ['유동부채 합계', currentLiabilitiesTotal, setCurrentLiabilitiesTotal],
                        [
                            <span className="flex items-center">
                                유동비율
                                <Button
                                    children="계산"
                                    onClick={calculateCurrentRatio}
                                    variant="primary"
                                    className="ml-2"
                                />
                            </span>,
                            currentRatio,
                            setCurrentRatio
                        ],
                        ['투자자산(비유동자산내)', investmentAssets, setInvestmentAssets],
                        ['고정부채(비유동부채)', fixedLiabilities, setFixedLiabilities],
                        ['발행주식수', issuedShares, setIssuedShares]
                    ].map(([label, value, setter]) =>
                        [typeof label === 'string' ? <span>{label}</span> : label, value, setter]
                    )}
                />

            </div>
        </>
    )
}

export default CompValueCustom;