import React from 'react';
import { Link } from 'react-router-dom';

const FriendsModal = ({ friends, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-dark-card rounded-xl shadow-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Все друзья ({friends.length})</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {friends.map(friend => {
            const friendAvatar = friend.avatar_url || `https://i.pravatar.cc/40?u=${friend._id || friend.id}`;
            const friendLink = `/profile/${friend._id}`;
            return (
              <Link to={friendLink} key={friend._id || friend.id} className="flex items-center space-x-4 bg-theme-2 p-3 rounded-lg hover:bg-theme-3 transition-colors">
                <img src={friendAvatar} alt="avatar" className="w-12 h-12 rounded-full object-cover" />
                <div>
                  <div className="font-bold text-white">{friend.nickname || friend.email}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FriendsModal;
