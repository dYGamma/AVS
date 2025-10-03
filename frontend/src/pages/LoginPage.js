import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import AuthService from '../services/AuthService';

const LoginPage = () => {
    // Состояния для хранения введенных email и пароля
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Получаем функцию для обновления состояния авторизации из глобального контекста
    const { setAuth } = useContext(AuthContext);
    // Хук для программной навигации
    const navigate = useNavigate();

    /**
     * Обработчик отправки формы входа.
     * @param {Event} e - Событие отправки формы.
     */
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // Вызываем метод сервиса для отправки запроса на логин
            const response = await AuthService.login(email, password);
            // Сохраняем токен доступа в localStorage для последующих запросов
            localStorage.setItem('token', response.data.accessToken);
            // Обновляем глобальное состояние авторизации
            setAuth({ isAuth: true, user: response.data.user, isLoading: false });
            // Перенаправляем пользователя на страницу профиля после успешного входа
            const profileId = response.data.user.id || response.data.user._id;
            navigate(`/profile/${profileId}`);
        } catch (err) {
            console.error('Login failed', err);
            // Устанавливаем сообщение об ошибке для отображения пользователю
            setError(err.response?.data?.message || 'Неверный логин или пароль');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-body px-4">
            <div className="w-full max-w-md p-8 space-y-8 bg-theme rounded-xl shadow-lg">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-theme">
                        Вход
                    </h1>
                    <p className="mt-2 text-sm text-muted-theme">
                        Добро пожаловать обратно!
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-theme bg-theme-2 text-theme placeholder-muted-theme focus:outline-none focus:ring-brand-purple focus:border-brand-purple focus:z-10 sm:text-sm rounded-t-md"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Пароль</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-theme bg-theme-2 text-theme placeholder-muted-theme focus:outline-none focus:ring-brand-purple focus:border-brand-purple focus:z-10 sm:text-sm rounded-b-md"
                                placeholder="Пароль"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm text-red-500 text-center">{error}</p>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-purple hover:bg-brand-purple/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple disabled:bg-gray-500"
                        >
                            {loading ? 'Вход...' : 'Войти'}
                        </button>
                    </div>
                </form>
                <div className="text-sm text-center">
                    <p className="text-muted-theme">
                        Нет аккаунта?{' '}
                        <Link to="/register" className="font-medium text-brand-purple hover:text-purple-500">
                            Зарегистрироваться
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
