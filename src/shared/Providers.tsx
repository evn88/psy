import React, {FC} from 'react';
import {SessionProvider} from "next-auth/react";

export const Providers: FC<{ children: React.ReactNode }> = ({children}) => {


    return (
        <SessionProvider>{children}</SessionProvider>
    );
};
