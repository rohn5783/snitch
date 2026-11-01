import React from 'react'
import Nav from '../features/Shared/Components/Nav'
import { Outlet } from 'react-router'
import ToastProvider from '../features/Shared/Components/Toast'

const AppLayout = () => {
    return (
        <ToastProvider>
            <Nav />
            <Outlet />
        </ToastProvider>
    )
}

export default AppLayout
