"use client";

import React, {Suspense} from "react";
import MainPage from "@/pages/mainPage/ui/MainPage";


const HomePage = () => (
    <>
        <Suspense>
            <MainPage/>
        </Suspense>
    </>)

export default HomePage;