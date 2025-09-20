// src/components/BottomNav.jsx
import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { HomeIcon, BookmarkIcon, UserIcon, FilmIcon, SearchIcon, LoginIcon, LogoutIcon } from '@heroicons/react/outline';
import AuthService from '../services/AuthService';

const BottomNav = ({ notifications }) => {
  const { auth, setAuth } = useContext(AuthContext);
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

  const navItems = [
    { path: '/', label: 'Главная', icon: HomeIcon },
    { path: '/explore', label: 'Обзор', icon: SearchIcon },
    { path: '/bookmarks', label: 'Закладки', icon: BookmarkIcon },
    { path: '/feed', label: 'Лента', icon: FilmIcon },
    auth?.isAuth && auth.user
      ? { path: `/profile/${auth.user.id}`, label: 'Профиль', icon: UserIcon }
      : { path: '/login', label: 'Войти', icon: LoginIcon }
  ];

  return (
    <>
      {/* --- Mobile: оригинальная навигация с подписями (не тронута) --- */}
      <nav className="bottom-nav-safe fixed bottom-0 left-0 right-0 bg-theme border-t border-theme flex justify-around items-center h-16 z-50 safe-bottom md:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center text-xs w-full pt-1 transition-colors ${
                  isActive ? 'text-brand-purple' : 'text-muted-theme hover:text-theme'
                }`
              }
            >
              <Icon className="h-6 w-6 mb-1" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* --- Desktop: центрированная плавающая pill-панель с "кнопками на всю высоту" --- */}
      {/* Центрируем относительно viewport, чтобы панель не сдвигалась при появлении скролла */}
      <div className="hidden md:flex fixed transform -translate-x-1/2 bottom-8 z-50" style={{ left: '50vw' }}>
        <div
          className="w-[min(680px,92vw)] max-w-2xl bg-theme border border-theme shadow-lg rounded-2xl px-1 h-14 flex items-stretch"
          role="navigation"
          aria-label="Desktop bottom panel"
        >
          {/* Каждая кнопка занимает равную ширину и всю высоту панели */}
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={item.label}
                className={({ isActive }) =>
                  `flex-1 h-full flex items-center justify-center transition-colors rounded-xl mx-1 ${
                    isActive ? 'text-brand-purple' : 'text-muted-theme hover:text-theme'
                  }`
                }
              >
                {/* увеличенные иконки под высоту кнопки */}
                <Icon className="h-6 w-6" />
              </NavLink>
            );
          })}
          {auth.isAuth && <div className="flex-1 h-full flex items-center justify-center">{notifications}</div>}
          {auth.isAuth && (
            <button 
              onClick={handleLogout} 
              title="Выйти"
              className="flex-1 h-full flex items-center justify-center transition-colors rounded-xl mx-1 text-muted-theme hover:text-theme"
            >
              <LogoutIcon className="h-6 w-6 text-red-400" />
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default BottomNav;
