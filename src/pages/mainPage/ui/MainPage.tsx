import React, {FC} from 'react'
import Link from "next/link";
import Image from "next/image";
import logoImg from "@/assets/images/logo.svg";

type MainPageProps = object

const MainPage: FC<MainPageProps> = () => {
    return (
        <div className="container mx-auto">
            <h1 className="text-4xl font-bold">Welcome to the Main Page!</h1>
            <Image className={'bg-white p-5 rounded-lg'} src={logoImg} alt={'Logo'} width={100} height={150}/>
            <p className="mt-4">This is your starting point.</p>
            <Link href={'about'}>About</Link> | <Link href={'admin'}>Admin</Link>
        </div>
    );
}

export default MainPage;