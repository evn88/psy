import React, {FC} from 'react';
import {auth} from "@/auth";
import Navbar from './Navbar';

interface NavbarWrapperProps {
    className?: string;
}

const NavbarWrapper: FC<NavbarWrapperProps> = async ({className = ''}) => {
    const session = await auth();

    return <Navbar session={session} className={className}/>;
};

export default NavbarWrapper;