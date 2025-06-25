import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext';
import Input from '@/component/common/input/Input';
import Button from '@/component/common/button/Button';

function TransactionOverview() {

    return (
        <>
            <table>
                <thead>
                    <tr>
                        <th>h1</th>
                        <th>h2</th>
                        <th>h3</th>
                        <th>h4</th>
                        <th>h5</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>b1</td>
                        <td>b2</td>
                        <td>b3</td>
                        <td>b4</td>
                        <td>b5</td>
                    </tr>
                    <tr>
                        <td>b1</td>
                        <td>b2</td>
                        <td>b3</td>
                        <td>b4</td>
                        <td>b5</td>
                    </tr>
                </tbody>

            </table>
        </>
    );

}

export default TransactionOverview;
