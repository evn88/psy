import {FC} from 'react'

export type MainPageProps = {
    test: string
}

export const MainPage: FC<MainPageProps> = ({test}) => {
    return (
        <div className="container mx-auto">
            <h1 className="text-4xl font-bold">Welcome to the Main Page!</h1>
            <p className="mt-4">This is your starting point.</p>
            <p suppressHydrationWarning>{test}</p>
        </div>
    );
}