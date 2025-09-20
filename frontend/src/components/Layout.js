// ./frontend/src/components/Layout.js
import React, { useContext } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import Header from './Header';
import Notifications from './Notifications';
import { AuthContext } from '../App';
import Loader from './Loader';

const Layout = () => {
    const location = useLocation();
    const { auth } = useContext(AuthContext);

    const showLayout = !['/login', '/register'].includes(location.pathname);
    const showHeader = showLayout && !['/'].includes(location.pathname);

    if (auth.isLoading) {
        return <Loader />;
    }

    // Возвращаем простую структуру — без pull-to-refresh
    return (
        <div className="min-h-screen bg-body text-theme font-sans">
            {showHeader && <Header notifications={<Notifications panelPosition="header" />} />}
            <main className={showLayout ? 'pb-20' : ''}>
                <Outlet />
            </main>
            {showLayout && <BottomNav notifications={<Notifications panelPosition="bottom-center" />} />}
        </div>
    );
};

export default Layout;
