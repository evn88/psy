"use client";

import React, {useEffect, useState} from "react";
import {MainPage} from "@/pages/mainPage/ui/MainPage";


export default function Home() {
    const [time, setTime] = useState<number>(Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(Date.now());
        }, 1000);
        return () => {
            clearInterval(timer);
        }
    }, []);

    return (
        <MainPage test={new Intl.DateTimeFormat('ru-RU', {
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            timeZoneName: "short"
        }).format(time)}/>
    );
}
