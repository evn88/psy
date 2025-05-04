"use client"

import React, {FC} from 'react';
import Link from "next/link";

const About: FC = () => (
    <div className="container mx-auto">
        <h1>About page</h1>
        <Link href={'admin'}>Login</Link>
    </div>
);

export default About;