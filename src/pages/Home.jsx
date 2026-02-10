import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from 'react-router-dom';
import MarketIndexCharts from '@/component/feature/home/MarketIndexCharts';
import { useFxRate } from '@/pages/transaction/hooks/useFxRate';

export default function Home() {
    const location = useLocation();
    const { isLoggedIn } = useAuth();
    const { fxRate, fxUpdatedAt } = useFxRate({ enabled: isLoggedIn });

    useEffect(() => {
        document.title = 'CompValue — 기업가치 분석';
    }, []);

    const reason = location.state?.reason;

    return (
        <div className="min-h-[calc(100vh-120px)] px-6 py-8">
            <div className="max-w-7xl mx-auto">
                {/* 로그아웃/인증만료 알림 */}
                {reason === 'logout' && (
                    <div className="mb-6 w-full max-w-xl mx-auto rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs text-emerald-700 shadow-sm dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300 text-center animate__animated animate__fadeInDown" style={{ animationDuration: '0.5s' }}>
                        안전하게 로그아웃되었습니다. 다시 이용하시려면 상단의 로그인 버튼을 눌러주세요.
                    </div>
                )}
                {reason === '401' && (
                    <div className="mb-6 w-full max-w-xl mx-auto rounded-2xl border border-amber-100 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 shadow-sm dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300 text-center animate__animated animate__fadeInDown" style={{ animationDuration: '0.5s' }}>
                        인증 정보가 만료되었습니다. 보안을 위해 자동으로 로그아웃되었어요. 다시 로그인해 주세요.
                    </div>
                )}

                {/* 환영 메시지 */}
                <div className="text-center mb-12">
                    <div className="text-6xl mb-4">📊</div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-3 text-slate-800 dark:text-white">
                        {isLoggedIn
                            ? `${localStorage.getItem("nickName") || localStorage.getItem("userName") || '환영합니다'}님, 반갑습니다`
                            : 'CompValue — 기업가치 분석 플랫폼'
                        }
                    </h1>
                    <p className="text-slate-600 dark:text-slate-300 text-lg mb-2">
                        {new Date().toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'long'
                        })}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                        {isLoggedIn
                            ? '오늘도 좋은 투자 분석이 되시길 바랍니다'
                            : '주식의 내재가치를 정량적으로 평가하고, 기업의 성장성과 밸류에이션을 시각적으로 비교해보세요'
                        }
                    </p>
                </div>

                {isLoggedIn && (
                    <>
                        {/* 환율 정보 */}
                        <div className="flex justify-center mb-12">
                            <div className="inline-flex items-center gap-3 px-5 py-3 bg-white rounded-xl border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                                <span className="text-2xl">💱</span>
                                <div>
                                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        {fxRate
                                            ? `1 USD = ${Number(fxRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}원`
                                            : '환율 정보 로딩 중...'
                                        }
                                    </div>
                                    {fxUpdatedAt && (
                                        <div className="text-xs text-slate-400 dark:text-slate-500">
                                            {fxUpdatedAt.toLocaleString('ko-KR')} 기준
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 미국 3대 지수 차트 */}
                        <div className="mb-12">
                            <MarketIndexCharts />
                        </div>
                    </>
                )}

                {/* 소개 섹션 */}
                <div className="max-w-3xl mx-auto">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100 dark:from-blue-900/30 dark:to-indigo-900/30 dark:border-blue-800">
                        <h2 className="text-lg font-semibold mb-2 text-slate-800 dark:text-white">CompValue 소개</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            주식의 내재가치를 정량적으로 평가하고, 기업의 성장성과 밸류에이션을 시각적으로 비교하는 플랫폼입니다.
                            PER, PEG, ROE 등 다양한 지표를 활용하여 합리적인 투자 의사결정을 지원합니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
