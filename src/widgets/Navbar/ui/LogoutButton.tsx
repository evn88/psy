import React, {FC} from 'react';
import {signOutAction} from '../actions/signOutAction';

interface LogoutButtonProps {
    className?: string;
}

const LogoutButton: FC<LogoutButtonProps> = ({className = ''}) => {
    return (
        <form action={signOutAction}>
            <button className={className}>
                Выйти
            </button>
        </form>
    );
};

export default LogoutButton;