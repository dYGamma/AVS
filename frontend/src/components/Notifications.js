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
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const handleToggle = async () => {
    setIsOpen(!isOpen);
    if (!isOpen && notifications.some(n => !n.read)) {
      try {
        await api.post('/notifications/read');
        fetchNotifications(); // Refresh notifications to mark as read
      } catch (err) {
        console.error('Failed to mark notifications as read', err);
      }
    }
  };

  const handleFriendRequest = async (notificationId, requesterId, action) => {
    try {
      setNotificationStatus(prev => ({ ...prev, [notificationId]: action === 'accept' ? 'Принято' : 'Отклонено' }));
      await api.post(`/users/${requesterId}/${action}-friend`);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
      }, 500); //
    } catch (err) {
      console.error(`Failed to ${action} friend request`, err);
      setNotificationStatus(prev => ({ ...prev, [notificationId]: null }));
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
                  {n.type === 'friend_request' && !notificationStatus[n._id] && (
                    <div className="flex justify-end space-x-2 mt-2">
                      <button onClick={() => handleFriendRequest(n._id, n.from._id, 'accept')} className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600">Принять</button>
                      <button onClick={() => handleFriendRequest(n._id, n.from._id, 'reject')} className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">Отклонить</button>
                    </div>
                  )}
                  {notificationStatus[n._id] && (
                    <div className="text-right mt-2 text-sm text-gray-400">
                      {notificationStatus[n._id]}
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
