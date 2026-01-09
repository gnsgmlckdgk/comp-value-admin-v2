import { useState, useEffect } from 'react';
import { send } from '@/util/ClientUtil';

/**
 * 해외 기업 필터 옵션을 가져오는 커스텀 훅
 * 국가, 거래소, 섹터, 산업군 목록을 병렬로 조회
 *
 * @returns {{
 *   options: {
 *     countries: Array<{value: string, label: string}>,
 *     exchanges: Array<{value: string, label: string}>,
 *     sectors: Array<{value: string, label: string}>,
 *     industries: Array<{value: string, label: string}>
 *   },
 *   loading: {
 *     countries: boolean,
 *     exchanges: boolean,
 *     sectors: boolean,
 *     industries: boolean
 *   },
 *   errors: {
 *     countries: string|null,
 *     exchanges: string|null,
 *     sectors: string|null,
 *     industries: string|null
 *   },
 *   refetch: function
 * }}
 */
export const useFilterOptions = () => {
    const [options, setOptions] = useState({
        countries: [],
        exchanges: [],
        sectors: [],
        industries: []
    });

    const [loading, setLoading] = useState({
        countries: true,
        exchanges: true,
        sectors: true,
        industries: true
    });

    const [errors, setErrors] = useState({
        countries: null,
        exchanges: null,
        sectors: null,
        industries: null
    });

    // API 응답을 옵션 형식으로 변환
    const mapOptionsForKey = (key, data) => {
        if (!Array.isArray(data)) return [];

        switch (key) {
            case 'countries':
                // [{ country: "US" }] → [{ value: "US", label: "US" }]
                return data
                    .map(item => ({
                        value: item.country,
                        label: item.country
                    }))
                    .filter((item, index, self) =>
                        // 중복 제거
                        index === self.findIndex(t => t.value === item.value)
                    )
                    .sort((a, b) => a.label.localeCompare(b.label));

            case 'exchanges':
                // [{ exchange: "NYSE", name: "New York Stock Exchange", ... }]
                // → [{ value: "NYSE", label: "NYSE - New York Stock Exchange" }]
                return data
                    .map(item => ({
                        value: item.exchange,
                        label: item.name ? `${item.exchange} - ${item.name}` : item.exchange
                    }))
                    .filter((item, index, self) =>
                        index === self.findIndex(t => t.value === item.value)
                    )
                    .sort((a, b) => a.value.localeCompare(b.value));

            case 'sectors':
                // [{ sector: "Technology" }] → [{ value: "Technology", label: "Technology" }]
                return data
                    .map(item => ({
                        value: item.sector,
                        label: item.sector
                    }))
                    .filter((item, index, self) =>
                        index === self.findIndex(t => t.value === item.value)
                    )
                    .sort((a, b) => a.label.localeCompare(b.label));

            case 'industries':
                // [{ industry: "Software" }] → [{ value: "Software", label: "Software" }]
                return data
                    .map(item => ({
                        value: item.industry,
                        label: item.industry
                    }))
                    .filter((item, index, self) =>
                        index === self.findIndex(t => t.value === item.value)
                    )
                    .sort((a, b) => a.label.localeCompare(b.label));

            default:
                return [];
        }
    };

    // 필터 옵션 조회
    const fetchFilterOptions = async () => {
        // 로딩 상태 초기화
        setLoading({
            countries: true,
            exchanges: true,
            sectors: true,
            industries: true
        });

        // API 엔드포인트 정의
        const endpoints = [
            { key: 'countries', url: '/dart/abroad/code/countries' },
            { key: 'exchanges', url: '/dart/abroad/code/exchanges' },
            { key: 'sectors', url: '/dart/abroad/code/sectors' },
            { key: 'industries', url: '/dart/abroad/code/industries' }
        ];

        // 병렬로 모든 API 호출 (Promise.allSettled 사용하여 일부 실패해도 계속 진행)
        const results = await Promise.allSettled(
            endpoints.map(({ url }) => send(url, {}, 'GET'))
        );

        const newOptions = {};
        const newLoading = {};
        const newErrors = {};

        results.forEach((result, index) => {
            const { key } = endpoints[index];
            newLoading[key] = false;

            if (result.status === 'fulfilled') {
                const { data, error } = result.value;

                if (!error && data?.success && data?.response) {
                    // 성공: 데이터 변환 후 저장
                    newOptions[key] = mapOptionsForKey(key, data.response);
                    newErrors[key] = null;
                } else {
                    // API는 성공했지만 응답이 올바르지 않음
                    newOptions[key] = [];
                    newErrors[key] = `${key} 데이터를 불러오는데 실패했습니다.`;
                    console.error(`Failed to fetch ${key}:`, error || data);
                }
            } else {
                // Promise rejected
                newOptions[key] = [];
                newErrors[key] = `${key} 요청이 실패했습니다.`;
                console.error(`Failed to fetch ${key}:`, result.reason);
            }
        });

        setOptions(prev => ({ ...prev, ...newOptions }));
        setLoading(newLoading);
        setErrors(newErrors);
    };

    // 컴포넌트 마운트 시 한 번만 실행
    useEffect(() => {
        fetchFilterOptions();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        options,
        loading,
        errors,
        refetch: fetchFilterOptions // 수동으로 다시 불러오기
    };
};
