import { useState, useEffect } from 'react';
import Button from '@/component/common/button/Button';
import Input from '@/component/common/input/Input';

function SearchBar({ fetchData, searchBarLabel = '' }) {

    return (
        <>
            <Input id='search' label={searchBarLabel} placeholder='검색어 입력' onEnter={fetchData} />
            <Button children='조회하기' onClick={fetchData} variant='select' />
        </>
    )
}

export default SearchBar