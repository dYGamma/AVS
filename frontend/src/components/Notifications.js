import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../App';
import { BellIcon, UserIcon } from '@heroicons/react/outline';

const Notifications = ({ panelPosition = 'bottom-center' }) => {
  const [notifications, setNotifications] = useState([]);
  const [notificationStatus, setNotificationStatus] = useState({});
  const [isOpen, setIsOpen] = useState(false);
  const { auth } = useContext(AuthContext);
  const panelRef = useRef(null);

  useEffect(() => {
    if (auth.isAuth) {
      fetchNotifications();
    }
  }, [auth.isAuth]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      // Дедупликация уведомлений по ID
      const uniqueNotifications = res.data.filter((notification, index, self) => 
        index === self.findIndex(n => n._id === notification._id)
      );
      setNotifications(uniqueNotifications);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const handleToggle = async () => {
    setIsOpen(!isOpen);
    if (!isOpen && notifications.some(n => !n.read)) {
      try {
        await api.post('/notifications/read');
        // Обновляем статус локально без повторного запроса
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      } catch (err) {
        console.error('Failed to mark notifications as read', err);
        // В случае ошибки все же обновляем с сервера
        fetchNotifications();
      }
    }
  };

  const handleFriendRequest = async (notificationId, requesterId, action) => {
    // Предотвращаем повторные клики
    if (notificationStatus[notificationId]) return;
    
    try {
      setNotificationStatus(prev => ({ ...prev, [notificationId]: 'processing' }));
      await api.post(`/users/${requesterId}/${action}-friend`);
      
      // Устанавливаем финальный статус
      const finalStatus = action === 'accept' ? 'accepted' : 'rejected';
      setNotificationStatus(prev => ({ ...prev, [notificationId]: finalStatus }));
      
      // Удаляем уведомление через 2 секунды с плавной анимацией
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        setNotificationStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[notificationId];
          return newStatus;
        });
        // Обновляем список уведомлений с сервера для синхронизации
        fetchNotifications();
      }, 2000);
    } catch (err) {
      console.error(`Failed to ${action} friend request`, err);
      setNotificationStatus(prev => ({ ...prev, [notificationId]: null }));
      // В случае ошибки также обновляем список с сервера
      fetchNotifications();
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const panelClasses = {
    'bottom-center': 'absolute bottom-full right-1/2 translate-x-1/2 mb-2 w-80 bg-dark-card rounded-lg shadow-lg p-4 z-50 animate-fade-in-fast',
    'header': 'absolute top-full left-0 mt-2 w-80 bg-dark-card rounded-lg shadow-lg p-4 z-50 animate-fade-in-fast',
  };

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={handleToggle} className="relative flex-1 h-full flex items-center justify-center transition-colors rounded-xl mx-1 text-muted-theme hover:text-theme">
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-gray-800"></span>
        )}
      </button>
      {isOpen && (
        <div className={panelClasses[panelPosition]}>
          <h3 className="font-bold text-white mb-2">Уведомления</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-gray-400">Нет новых уведомлений.</p>
            ) : (
              notifications.map(n => (
                <div key={n._id} className={`p-2 rounded-lg ${n.read ? 'bg-theme-2' : 'bg-brand-purple'}`}>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                      {n.from.avatar_url ? (
                        <img src={n.from.avatar_url} alt="avatar" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <UserIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <Link to={`/profile/${n.from._id}`} className="text-sm text-theme">{n.message}</Link>
                  </div>
                  {n.type === 'friend_request' && (
                    <div className="mt-2">
                      {!notificationStatus[n._id] ? (
                        <div className="flex justify-end space-x-2">
                          <button 
                            onClick={() => handleFriendRequest(n._id, n.from._id, 'accept')} 
                            className="px-3 py-1.5 text-xs bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors font-medium"
                          >
                            Принять
                          </button>
                          <button 
                            onClick={() => handleFriendRequest(n._id, n.from._id, 'reject')} 
                            className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors font-medium"
                          >
                            Отклонить
                          </button>
                        </div>
                      ) : (
                        <div className="text-right">
                          {notificationStatus[n._id] === 'processing' && (
                            <div className="inline-flex items-center space-x-2 text-sm text-blue-400">
                              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                              <span>Обработка...</span>
                            </div>
                          )}
                          {notificationStatus[n._id] === 'accepted' && (
                            <div className="inline-flex items-center space-x-2 text-sm text-green-400 animate-fade-in">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span>Заявка принята</span>
                            </div>
                          )}
                          {notificationStatus[n._id] === 'rejected' && (
                            <div className="inline-flex items-center space-x-2 text-sm text-red-400 animate-fade-in">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                              <span>Заявка отклонена</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
