import React, { useContext, useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext, ThemeContext } from '../App';
import { SearchIcon, FilmIcon, BookmarkIcon, UserIcon, LogoutIcon, MoonIcon, SunIcon } from '@heroicons/react/outline';
import AuthService from '../services/AuthService';

const Header = ({ notifications }) => {
    const { auth, setAuth } = useContext(AuthContext);
    const { theme, setTheme } = useContext(ThemeContext);
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await AuthService.logout();
            localStorage.removeItem('token');
            setAuth({ isAuth: false, user: null, isLoading: false });
            navigate('/login');
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    const NavItem = ({ to, children }) => (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-brand-purple text-white' : 'text-muted-1 hover-theme'
                }`
            }
        >
            {children}
        </NavLink>
    );

    return (
        <header className={`flex bg-theme sticky top-0 z-50 p-4 items-center justify-between shadow-lg text-theme`}>
            <div className="flex items-center gap-2">
                <div className="md:hidden">
                    {auth.isAuth && notifications}
                </div>
                <button 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
                    className="relative flex-1 h-full flex items-center justify-center transition-colors rounded-xl mx-1 text-muted-theme hover:text-theme icon-btn btn-animated"
                    aria-label="Toggle theme"
                >
                    {theme === 'dark' ? 
                        <SunIcon className="w-6 h-6 text-yellow-400 animate-scale-in" /> : 
                        <MoonIcon className="w-6 h-6 text-gray-700 animate-scale-in" />
                    }
                </button>
            </div>

            <Link to="/" className="text-2xl font-bold text-theme absolute left-1/2 -translate-x-1/2">
                Anime<span className="text-brand-purple">Verse</span>
            </Link>
            
            <div className="flex items-center gap-4">
                {auth.isAuth && auth.user ? (
                    <>
                        <Link to={auth.user ? `/profile/${auth.user.id}` : '/profile'} className="hidden md:flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full object-cover avatar-border bg-gray-800 flex items-center justify-center">
                                {auth.user.avatar_url ? (
                                    <img 
                                        src={auth.user.avatar_url} 
                                        alt="avatar" 
                                        className="w-full h-full rounded-full object-cover" 
                                    />
                                ) : (
                                    <UserIcon className="w-6 h-6 text-gray-400" />
                                )}
                            </div>
                        </Link>
                        <button onClick={handleLogout} className="md:hidden icon-btn hover-theme transition-all duration-300 btn-animated">
                            <LogoutIcon className="w-6 h-6 text-red-400" />
                        </button>
                    </>
                ) : (
                    <Link to="/login" className="px-4 py-2 rounded-lg bg-brand-purple text-white font-bold">Войти</Link>
                )}
            </div>
        </header>
    );
};

export default Header;
