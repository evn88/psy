import React, {FC} from 'react';
import Link from "next/link";

const About: FC = () => (
    <>
        <h1>About page</h1>
        <Link href={'admin'}>Login</Link>
    </>
);

export default About;