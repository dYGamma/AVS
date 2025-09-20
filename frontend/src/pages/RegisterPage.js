import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import AuthService from '../services/AuthService';

const RegisterPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { setAuth } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await AuthService.register(email, password);
            localStorage.setItem('token', response.data.accessToken);
            setAuth({ isAuth: true, user: response.data.user, isLoading: false });
            const userId = response.data.user.id || response.data.user._id;
            navigate(`/profile/${userId}`);
        } catch (err) {
            console.error('Registration failed', err);
            setError(err.response?.data?.message || 'Ошибка регистрации');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-body px-4">
            <div className="w-full max-w-md p-8 space-y-8 bg-theme rounded-xl shadow-lg">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-theme">
                        Регистрация
                    </h1>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleRegister}>
                    {/* Поля ввода аналогичны LoginPage */}
                    <input
                        type="email"
                        required
                        className="appearance-none rounded-none relative block w-full px-3 py-3 border border-theme bg-theme-2 text-theme placeholder-muted-theme focus:outline-none focus:ring-brand-purple focus:border-brand-purple focus:z-10 sm:text-sm rounded-t-md"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        required
                        className="appearance-none rounded-none relative block w-full px-3 py-3 border border-theme bg-theme-2 text-theme placeholder-muted-theme focus:outline-none focus:ring-brand-purple focus:border-brand-purple focus:z-10 sm:text-sm rounded-b-md"
                        placeholder="Пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    {error && (
                        <p className="text-sm text-red-500 text-center">{error}</p>
                    )}
                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-purple hover:bg-brand-purple/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple disabled:bg-gray-500"
                        >
                            {loading ? 'Регистрация...' : 'Создать аккаунт'}
                        </button>
                    </div>
                </form>
                <div className="text-sm text-center">
                    <p className="text-muted-theme">
                        Уже есть аккаунт?{' '}
                        <Link to="/login" className="font-medium text-brand-purple hover:text-purple-500">
                            Войти
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
