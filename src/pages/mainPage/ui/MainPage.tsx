"use client"

import React, {FC} from 'react'

type MainPageProps = object

const MainPage: FC<MainPageProps> = () => {
    return (
        <div className="container mx-auto">
            <h1 className="text-4xl font-bold">Welcome to the Main Page!</h1>
            <p className="mt-4">This is your starting point.</p>
        </div>
    );
}

export default MainPage;