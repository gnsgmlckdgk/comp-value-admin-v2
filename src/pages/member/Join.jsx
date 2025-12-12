import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { send } from '@/util/ClientUtil';
import PageTitle from '@/component/common/display/PageTitle';
import Input from '@/component/common/input/Input';
import AlertModal from '@/component/layouts/common/popup/AlertModal';

export default function Join() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        passwordConfirm: '',
        email: '',
        nickname: ''
    });
    const [loading, setLoading] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ open: false, message: '', onAfterClose: null });

    const openAlert = (message, onAfterClose = null) => {
        setAlertConfig({ open: true, message, onAfterClose });
    };

    const handleChange = (field) => (e) => {
        setFormData(prev => ({
            ...prev,
            [field]: e.target.value
        }));
    };

    const validateForm = () => {
        if (!formData.username.trim()) {
            openAlert('사용자 ID를 입력해주세요.');
            return false;
        }

        if (formData.username.length < 4) {
            openAlert('사용자 ID는 4자 이상이어야 합니다.');
            return false;
        }

        if (!formData.password) {
            openAlert('비밀번호를 입력해주세요.');
            return false;
        }

        if (formData.password.length < 8) {
            openAlert('비밀번호는 8자 이상이어야 합니다.');
            return false;
        }

        if (formData.password !== formData.passwordConfirm) {
            openAlert('비밀번호가 일치하지 않습니다.');
            return false;
        }

        if (!formData.email.trim()) {
            openAlert('이메일을 입력해주세요.');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            openAlert('올바른 이메일 형식이 아닙니다.');
            return false;
        }

        if (!formData.nickname.trim()) {
            openAlert('닉네임을 입력해주세요.');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await send('/dart/member/join', {
                username: formData.username.trim(),
                password: formData.password,
                email: formData.email.trim(),
                nickname: formData.nickname.trim()
            }, 'POST');

            if (error) {
                openAlert(error);
            } else if (data?.success) {
                openAlert('회원가입이 완료되었습니다.\n로그인 후 이용해주세요.', () => {
                    navigate('/');
                });
            } else {
                openAlert(data?.message || '회원가입에 실패했습니다.');
            }
        } catch (e) {
            console.error('회원가입 실패:', e);
            openAlert('회원가입 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <PageTitle />

            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <div className="w-full max-w-md">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
                        <div className="text-center mb-8">
                            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-lg mb-4">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">회원가입</h1>
                            <p className="text-sm text-slate-600 dark:text-slate-400">CompValue에 오신 것을 환영합니다</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                    사용자 ID <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    value={formData.username}
                                    onChange={handleChange('username')}
                                    placeholder="사용자 ID (4자 이상)"
                                    wdfull={true}
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                    비밀번호 <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange('password')}
                                    placeholder="비밀번호 (8자 이상)"
                                    wdfull={true}
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                    비밀번호 확인 <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    type="password"
                                    value={formData.passwordConfirm}
                                    onChange={handleChange('passwordConfirm')}
                                    placeholder="비밀번호 확인"
                                    wdfull={true}
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                    이메일 <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange('email')}
                                    placeholder="example@email.com"
                                    wdfull={true}
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                    닉네임 <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    value={formData.nickname}
                                    onChange={handleChange('nickname')}
                                    placeholder="닉네임"
                                    wdfull={true}
                                    disabled={loading}
                                    onEnter={handleSubmit}
                                />
                            </div>

                            <div className="pt-4 space-y-3">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-medium rounded-lg hover:from-sky-600 hover:to-indigo-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? '가입 중...' : '회원가입'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => navigate('/')}
                                    disabled={loading}
                                    className="w-full py-3 px-4 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                >
                                    취소
                                </button>
                            </div>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                이미 계정이 있으신가요?{' '}
                                <button
                                    onClick={() => {
                                        navigate('/');
                                        setTimeout(() => {
                                            window.dispatchEvent(new Event('auth:login:open'));
                                        }, 100);
                                    }}
                                    className="text-sky-600 dark:text-sky-400 hover:underline font-medium"
                                >
                                    로그인
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <AlertModal
                open={alertConfig.open}
                message={alertConfig.message}
                onClose={() => setAlertConfig({ open: false, message: '', onAfterClose: null })}
                onAfterClose={alertConfig.onAfterClose}
            />
        </>
    );
}
