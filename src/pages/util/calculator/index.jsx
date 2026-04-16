import { useState, useCallback } from 'react';
import { Delete, RotateCcw } from 'lucide-react';
import PageTitle from '@/component/common/display/PageTitle';

const MAX_DISPLAY_LENGTH = 15;

const Calculator = () => {
    const [display, setDisplay] = useState('0');
    const [prevValue, setPrevValue] = useState(null);
    const [operator, setOperator] = useState(null);
    const [waitingForOperand, setWaitingForOperand] = useState(false);
    const [history, setHistory] = useState([]);

    const inputDigit = useCallback((digit) => {
        if (waitingForOperand) {
            setDisplay(String(digit));
            setWaitingForOperand(false);
        } else {
            if (display.replace(/[^0-9]/g, '').length >= MAX_DISPLAY_LENGTH) return;
            setDisplay(display === '0' ? String(digit) : display + digit);
        }
    }, [display, waitingForOperand]);

    const inputDot = useCallback(() => {
        if (waitingForOperand) {
            setDisplay('0.');
            setWaitingForOperand(false);
            return;
        }
        if (!display.includes('.')) {
            setDisplay(display + '.');
        }
    }, [display, waitingForOperand]);

    const toggleSign = useCallback(() => {
        if (display === '0') return;
        setDisplay(display.startsWith('-') ? display.slice(1) : '-' + display);
    }, [display]);

    const inputPercent = useCallback(() => {
        const value = parseFloat(display);
        if (isNaN(value)) return;
        setDisplay(String(value / 100));
    }, [display]);

    const calculate = (left, right, op) => {
        switch (op) {
            case '+': return left + right;
            case '-': return left - right;
            case '*': return left * right;
            case '/': return right === 0 ? null : left / right;
            default: return right;
        }
    };

    const formatResult = (value) => {
        if (value === null) return 'Error';
        const str = String(value);
        if (str.length > MAX_DISPLAY_LENGTH) {
            return Number(value.toPrecision(10)).toString();
        }
        return str;
    };

    const handleOperator = useCallback((nextOperator) => {
        const currentValue = parseFloat(display);

        if (prevValue !== null && operator && !waitingForOperand) {
            const result = calculate(prevValue, currentValue, operator);
            const formatted = formatResult(result);
            if (result !== null) {
                setHistory(prev => [
                    { expression: `${prevValue} ${operator} ${currentValue}`, result: formatted },
                    ...prev.slice(0, 19)
                ]);
            }
            setDisplay(formatted);
            setPrevValue(result);
        } else {
            setPrevValue(currentValue);
        }

        setOperator(nextOperator);
        setWaitingForOperand(true);
    }, [display, prevValue, operator, waitingForOperand]);

    const handleEquals = useCallback(() => {
        if (prevValue === null || operator === null) return;

        const currentValue = parseFloat(display);
        const result = calculate(prevValue, currentValue, operator);
        const formatted = formatResult(result);

        setHistory(prev => [
            { expression: `${prevValue} ${operator} ${currentValue}`, result: formatted },
            ...prev.slice(0, 19)
        ]);

        setDisplay(formatted);
        setPrevValue(null);
        setOperator(null);
        setWaitingForOperand(true);
    }, [display, prevValue, operator]);

    const handleClear = useCallback(() => {
        setDisplay('0');
        setPrevValue(null);
        setOperator(null);
        setWaitingForOperand(false);
    }, []);

    const handleBackspace = useCallback(() => {
        if (waitingForOperand) return;
        setDisplay(display.length === 1 || (display.length === 2 && display.startsWith('-')) ? '0' : display.slice(0, -1));
    }, [display, waitingForOperand]);

    const clearHistory = useCallback(() => setHistory([]), []);

    const operatorLabels = { '+': '+', '-': '-', '*': '\u00d7', '/': '\u00f7' };

    const CalcButton = ({ onClick, children, className = '' }) => (
        <button
            onClick={onClick}
            className={`flex items-center justify-center rounded-lg py-3 text-lg font-medium transition-colors select-none ${className}`}
        >
            {children}
        </button>
    );

    const numClass = 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600';
    const opClass = 'bg-sky-500 text-white hover:bg-sky-600';
    const fnClass = 'bg-slate-300 text-slate-700 hover:bg-slate-400 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500';
    const eqClass = 'bg-amber-500 text-white hover:bg-amber-600';

    return (
        <div>
            <PageTitle />

            <div className="flex flex-col gap-6 lg:flex-row">
                {/* 계산기 */}
                <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
                    {/* 디스플레이 */}
                    <div className="mb-4 rounded-lg bg-slate-900 p-4 dark:bg-slate-950">
                        {prevValue !== null && operator && (
                            <div className="mb-1 text-right text-sm text-slate-400">
                                {prevValue} {operatorLabels[operator] || operator}
                            </div>
                        )}
                        <div className="text-right text-3xl font-bold text-white break-all">
                            {display}
                        </div>
                    </div>

                    {/* 버튼 그리드 */}
                    <div className="grid grid-cols-4 gap-2">
                        <CalcButton onClick={handleClear} className={fnClass}>AC</CalcButton>
                        <CalcButton onClick={toggleSign} className={fnClass}>+/-</CalcButton>
                        <CalcButton onClick={inputPercent} className={fnClass}>%</CalcButton>
                        <CalcButton onClick={() => handleOperator('/')} className={`${operator === '/' && waitingForOperand ? 'ring-2 ring-sky-300 ' : ''}${opClass}`}>
                            {'\u00f7'}
                        </CalcButton>

                        {[7, 8, 9].map(d => (
                            <CalcButton key={d} onClick={() => inputDigit(d)} className={numClass}>{d}</CalcButton>
                        ))}
                        <CalcButton onClick={() => handleOperator('*')} className={`${operator === '*' && waitingForOperand ? 'ring-2 ring-sky-300 ' : ''}${opClass}`}>
                            {'\u00d7'}
                        </CalcButton>

                        {[4, 5, 6].map(d => (
                            <CalcButton key={d} onClick={() => inputDigit(d)} className={numClass}>{d}</CalcButton>
                        ))}
                        <CalcButton onClick={() => handleOperator('-')} className={`${operator === '-' && waitingForOperand ? 'ring-2 ring-sky-300 ' : ''}${opClass}`}>
                            -
                        </CalcButton>

                        {[1, 2, 3].map(d => (
                            <CalcButton key={d} onClick={() => inputDigit(d)} className={numClass}>{d}</CalcButton>
                        ))}
                        <CalcButton onClick={() => handleOperator('+')} className={`${operator === '+' && waitingForOperand ? 'ring-2 ring-sky-300 ' : ''}${opClass}`}>
                            +
                        </CalcButton>

                        <CalcButton onClick={() => inputDigit(0)} className={`col-span-1 ${numClass}`}>0</CalcButton>
                        <CalcButton onClick={inputDot} className={numClass}>.</CalcButton>
                        <CalcButton onClick={handleBackspace} className={fnClass}>
                            <Delete size={18} />
                        </CalcButton>
                        <CalcButton onClick={handleEquals} className={eqClass}>=</CalcButton>
                    </div>
                </div>

                {/* 계산 기록 */}
                <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">계산 기록</h3>
                        {history.length > 0 && (
                            <button
                                onClick={clearHistory}
                                className="flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                            >
                                <RotateCcw size={12} />
                                초기화
                            </button>
                        )}
                    </div>
                    {history.length === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-400">계산 기록이 없습니다</p>
                    ) : (
                        <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
                            {history.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-700/50"
                                >
                                    <div className="text-xs text-slate-400">{item.expression}</div>
                                    <div className="text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        = {item.result}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Calculator;
