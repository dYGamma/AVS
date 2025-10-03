// ./frontend/src/pages/ProfilePage.js
import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../App';
import ProfileEditModal from '../components/ProfileEditModal';
import FriendsModal from '../components/FriendsModal';
import DetailedStatsModal from '../components/DetailedStatsModal';
import Loader from '../components/Loader';
import { UserIcon } from '@heroicons/react/outline';

const ProfilePage = () => {
  const params = useParams();
  const { auth, setAuth } = useContext(AuthContext);
  const navigate = useNavigate();

  // Надёжно получаем id целевого профиля: либо из URL, либо из авторизованного юзера (.id или ._id)
  const targetId = params.id || auth?.user?.id || auth?.user?._id || null;

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [dynamics, setDynamics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [friendLoading, setFriendLoading] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [bioFrameStyle, setBioFrameStyle] = useState('default');

  // Не редиректим до тех пор, пока не известен статус авторизации (auth.isLoading)
  useEffect(() => {
    // Если контекст предоставляет флаг загрузки — используем его.
    // Если нет — будем действовать аккуратно (не сразу редиректим).
    const isAuthLoaded = auth?.isLoading === false || typeof auth?.isLoading === 'undefined';
    if (!targetId && isAuthLoaded) {
      navigate('/login');
    }
  }, [targetId, navigate, auth]);

  const isMe = auth?.user && profile ? String(auth.user.id) === String(profile.id) : false;

  const randomFriends = useMemo(() => {
    if (!profile?.friends || profile.friends.length === 0) return [];
    return [...profile.friends].sort(() => 0.5 - Math.random()).slice(0, 5);
  }, [profile?.friends]);

  const fetchProfile = useCallback(async () => {
    if (!targetId) return;
    try {
      setLoading(true);
      const res = await api.get(`/users/${targetId}`);
      // поддерживаем варианты: res.data или res.data.user
      const payload = res?.data?.user ? res.data.user : res?.data ? res.data : null;
      setProfile(payload);
    } catch (err) {
      console.error('fetchProfile error', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  const fetchStats = useCallback(async () => {
    if (!targetId) return;
    try {
      const res = await api.get(`/users/${targetId}/stats`);
      setStats(res?.data ?? null);
    } catch (err) {
      console.error('fetchStats error', err);
      setStats(null);
    }
  }, [targetId]);

  const fetchRecent = useCallback(async () => {
    if (!targetId) return;
    try {
      const res = await api.get(`/users/${targetId}/recent`);
      setRecent(res?.data || []);
    } catch (err) {
      console.error('fetchRecent error', err);
      setRecent([]);
    }
  }, [targetId]);

  // Загружаем всё при монтировании / когда targetId изменится
  useEffect(() => {
    fetchProfile();
    fetchStats();
    fetchRecent();
  }, [fetchProfile, fetchStats, fetchRecent]);

  const openEdit = () => setEditing(true);

  const handleSave = async (data) => {
    try {
      const res = await api.put('/users/me', data);
      const saved = res?.data ?? res;
      // обновляем auth.user если редактируем свой профиль
      if (isMe) {
        setAuth(prev => ({ ...prev, user: { ...prev?.user, ...(saved || {}) } }));
      }
      setProfile(prev => ({ ...(prev || {}), ...(saved || {}) }));
      setEditing(false);
    } catch (err) {
      console.error('Failed to save profile', err);
      alert('Не удалось сохранить профиль');
    }
  };

  const sendFriendRequest = async () => {
    if (!auth?.isAuth) return navigate('/login');
    try {
      setFriendLoading(true);
      await api.post(`/users/${profile.id}/request-friend`);
      await fetchProfile();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Не удалось отправить запрос');
    } finally {
      setFriendLoading(false);
    }
  };

  const acceptFriendRequest = async () => {
    try {
      setFriendLoading(true);
      await api.post(`/users/${profile.id}/accept-friend`);
      await fetchProfile();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Не удалось принять запрос');
    } finally {
      setFriendLoading(false);
    }
  };

  const rejectFriendRequest = async () => {
    try {
      setFriendLoading(true);
      await api.post(`/users/${profile.id}/reject-friend`);
      await fetchProfile();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Не удалось отклонить запрос');
    } finally {
      setFriendLoading(false);
    }
  };

  const removeFriend = async () => {
    try {
      setFriendLoading(true);
      await api.delete(`/users/${profile.id}/friend`);
      await fetchProfile();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Не удалось удалить из друзей');
    } finally {
      setFriendLoading(false);
    }
  };

  if (loading) return <Loader />;
  if (!profile) return <p className="text-center mt-10">Профиль не найден.</p>;

  // Sticker source (inline only). Не показываем на аватаре.
  const stickerSrc = profile?.sticker
    ? (String(profile.sticker).startsWith('http') ? profile.sticker : `/assets/stickers/${profile.sticker}.png`)
    : null;

  // avatar/cover: если относительный путь — используем как есть (nginx проксирует /uploads)
  const avatarSrc = profile?.avatar_url ? profile.avatar_url : null;
  const coverStyle = profile?.cover_url ? { backgroundImage: `url(${profile.cover_url})` } : {};

  return (
    <div className="max-w-4xl mx-auto p-4 main-with-bottom-space app-safe-bottom">
      {/* Cover */}
      <div
        className="relative rounded-xl overflow-hidden mb-6 profile-cover"
        style={{
          ...coverStyle,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#0b1220'
        }}
      >
        {/* Градиент удалён — теперь обложка отображается без тёмного overlay */}

        <div className="absolute left-4 bottom-4 flex items-end space-x-4">
          <div className="relative profile-avatar overflow-hidden bg-gray-800 border-4 border-dark-card rounded-2xl flex-shrink-0 w-24 h-24 md:w-28 md:h-28">
            {avatarSrc ? (
              <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <UserIcon className="w-8 h-8 md:w-10 md:h-10" />
              </div>
            )}
          </div>

          <div className="text-white bg-black/20 backdrop-blur-sm p-2 rounded-lg">
            <div className="flex items-center gap-3">
              <h1 className="text-lg md:text-2xl font-bold leading-tight">
                {profile.nickname || profile.email}
              </h1>
              {/* Inline sticker near nickname (единственный бейдж) */}
              {stickerSrc && <img src={stickerSrc} alt="sticker-inline" className="sticker-inline" />}
            </div>
          </div>
        </div>
      </div>

      {/* Описание профиля под обложкой */}
      {profile.bio && (
        <div className="card mb-6 border-l-4 border-accent">
          <h3 className="font-bold text-theme mb-3">О себе</h3>
          <p className="text-theme whitespace-pre-wrap break-words">{profile.bio}</p>
        </div>
      )}

      <div className="profile-grid">
        {/* Left column: actions, friends & social */}
        <div className="space-y-4">
          <div className="card">
            {isMe ? (
              <button onClick={openEdit} className="w-full py-2 rounded-xl bg-brand-purple text-white font-bold touch-target">
                Редактировать профиль
              </button>
            ) : (
              <div className="flex flex-col space-y-2">
                {!profile.isFriend && !profile.requestSent && !profile.requestReceived && (
                  <button onClick={sendFriendRequest} disabled={friendLoading} className="py-2 rounded-xl bg-brand-accent text-black font-bold touch-target">
                    Добавить в друзья
                  </button>
                )}
                {profile.requestSent && (
                  <button disabled={true} className="py-2 rounded-xl bg-gray-500 text-white font-bold">
                    Запрос отправлен
                  </button>
                )}
                {profile.requestReceived && (
                  <div className="flex gap-2">
                    <button onClick={acceptFriendRequest} disabled={friendLoading} className="w-full py-2 rounded-xl bg-green-600 text-white font-bold touch-target">
                      Принять
                    </button>
                    <button onClick={rejectFriendRequest} disabled={friendLoading} className="w-full py-2 rounded-xl bg-red-600 text-white font-bold touch-target">
                      Отклонить
                    </button>
                  </div>
                )}
                {profile.isFriend && (
                  <button onClick={removeFriend} disabled={friendLoading} className="py-2 rounded-xl bg-red-600 text-white font-bold touch-target">
                    Удалить из друзей
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-theme">Друзья ({profile.friends?.length || 0})</h3>
              {profile.friends?.length > 5 && (
                <button onClick={() => setShowFriendsModal(true)} className="text-sm text-brand-purple hover:underline">
                  Показать всех
                </button>
              )}
            </div>
            {(!profile.friends || profile.friends.length === 0) ? (
              <p className="text-muted-theme">Пока нет друзей.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {randomFriends.map(friend => {
                  const friendSticker = friend.sticker || null;
                  const friendStickerSrc = friendSticker
                    ? (String(friendSticker).startsWith('http') ? friendSticker : `/assets/stickers/${friendSticker}.png`)
                    : null;
                  const friendLink = `/profile/${friend._id}`;
                  return (
                    <Link to={friendLink} key={friend._id || friend.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-theme-3 transition-colors">
                      <div className="relative w-10 h-10">
                        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                            {friend.avatar_url ? (
                                <img src={friend.avatar_url} alt="avatar" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <UserIcon className="w-6 h-6 text-gray-400" />
                            )}
                        </div>
                        {friendStickerSrc && <img src={friendStickerSrc} alt="st" className="sticker-small" />}
                      </div>
                      <div>
                        <div className="font-medium text-theme truncate">{friend.nickname || friend.email}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {profile.social_links && Object.values(profile.social_links).some(link => !!link) && (
            <div className="card">
              <h3 className="font-bold mb-3 text-theme">Социальные сети</h3>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(profile.social_links).map(([key, value]) => {
                  if (!value) return null;
                  let Icon, label, url;
                  switch (key) {
                    case 'website':
                      Icon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>;
                      label = 'Сайт';
                      url = value.startsWith('http') ? value : `https://${value}`;
                      break;
                    case 'telegram':
                      Icon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;
                      label = 'Telegram';
                      url = `https://t.me/${value}`;
                      break;
                    case 'twitter':
                      Icon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" /></svg>;
                      label = 'Twitter';
                      url = `https://twitter.com/${value}`;
                      break;
                    case 'vk':
                      Icon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M13.162 18.992c.634.404 1.52.153 1.662-.552.08-.404-.13-.807-.545-1.009-.414-.202-1.12-.05-1.312.353-.192.404.203.807.195 1.208zm-3.18-5.548c1.512 0 2.525-.96 2.525-2.825 0-1.564-.707-2.422-2.07-2.422-1.01 0-1.716.555-1.716 1.262 0 .404.242.656.595.656.404 0 .707-.404.707-.91 0-.353-.101-.504-.353-.504-.202 0-.303.15-.303.352 0 .404.454.96 1.06.96.757 0 1.11-.556 1.11-1.413 0-.96-.505-1.514-1.413-1.514-1.262 0-2.423 1.01-2.423 2.977 0 1.514.808 2.423 2.12 2.423zm-1.413-7.466h2.22c.202 0 .303-.152.303-.304 0-.202-.101-.303-.303-.303h-2.22c-.202 0-.303.101-.303.303 0 .152.101.304.303.304zm7.417 7.466c.96 0 1.565-.505 1.565-1.413 0-1.01-.606-1.716-1.817-1.716h-.656c-.202 0-.303-.101-.303-.303s.101-.303.303-.303h.606c1.06 0 1.615-.555 1.615-1.463 0-.908-.605-1.413-1.564-1.413-1.413 0-2.473 1.16-2.473 2.876 0 1.817 1.11 2.825 2.725 2.825zm-.101-3.834h.15c.505 0 .757.252.757.656 0 .404-.252.605-.757.605h-.15c-.202 0-.303-.101-.303-.303s.101-.302.303-.302zm-.05-1.867h.15c.454 0 .706.252.706.605 0 .353-.252.555-.706.555h-.15c-.202 0-.303-.101-.303-.303s.101-.302.303-.302zm-12.918-1.615c-1.16 0-1.766.757-1.766 1.565 0 .757.606 1.262 1.21 1.262.202 0 .303-.101.303-.303s-.101-.303-.303-.303c-.353 0-.504-.202-.504-.505 0-.353.201-.656.656-.656h1.918v5.954h-1.918c-1.16 0-1.766.757-1.766 1.565 0 .757.606 1.262 1.21 1.262.202 0 .303-.101.303-.303s-.101-.303-.303-.303c-.353 0-.504-.202-.504-.505 0-.353.201-.656.656-.656h1.918v1.21c0 .202.101.303.303.303h.606c.202 0 .303-.101.303-.303v-8.88c0-.202-.101-.303-.303-.303h-.606c-.202 0-.303.101-.303.303v1.21h-1.918z"/></svg>;
                      label = 'VK';
                      url = `https://vk.com/${value}`;
                      break;
                    case 'discord':
                      Icon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20.2,2.2H3.8C2.8,2.2,2,3,2,4v16c0,1,0.8,1.8,1.8,1.8h16.4c1,0,1.8-0.8,1.8-1.8V4C22,3,21.2,2.2,20.2,2.2z M8.1,16.4 c-0.9,0-1.6-0.8-1.6-1.7c0-1,0.7-1.7,1.6-1.7c0.9,0,1.7,0.8,1.7,1.7C9.8,15.6,9,16.4,8.1,16.4z M12,16.4c-0.9,0-1.6-0.8-1.6-1.7 c0-1,0.7-1.7,1.6-1.7c0.9,0,1.7,0.8,1.7,1.7C13.7,15.6,12.9,16.4,12,16.4z M15.9,16.4c-0.9,0-1.6-0.8-1.6-1.7c0-1,0.7-1.7,1.6-1.7 c0.9,0,1.7,0.8,1.7,1.7C17.6,15.6,16.8,16.4,15.9,16.4z"/></svg>;
                      label = 'Discord';
                      url = `#`; // Discord не имеет прямых ссылок на профиль
                      return (
                        <div className="flex flex-col items-center justify-center text-center p-2 rounded-lg bg-theme-2 hover:bg-theme-3 transition-colors">
                          <Icon />
                          <span className="mt-1 text-xs font-medium text-theme">{label}</span>
                          <span className="text-xs text-muted-theme truncate">{value}</span>
                        </div>
                      );
                    default:
                      return null;
                  }
                  return (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center text-center p-2 rounded-lg bg-theme-2 hover:bg-theme-3 transition-colors">
                      <Icon />
                      <span className="mt-1 text-xs font-medium text-theme">{label}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column: stats, recent */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg text-theme">Статистика</h3>
              <button
                onClick={() => setShowStatsModal(true)}
                className="px-3 py-1.5 rounded-lg bg-theme-2 hover:bg-theme-3 text-theme text-sm font-medium transition-colors touch-target"
              >
                Подробнее
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-theme">
              <div>
                Всего: <span className="font-semibold text-theme">{stats?.total ?? '—'}</span>
              </div>
              <div>
                Смотрю: <span className="font-semibold">{stats?.watching ?? 0}</span>
              </div>
              <div>
                В планах: <span className="font-semibold">{stats?.planned ?? 0}</span>
              </div>
              <div>
                Просмотрено: <span className="font-semibold">{stats?.completed ?? 0}</span>
              </div>
              <div>
                Брошено: <span className="font-semibold">{stats?.dropped ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold mb-3 text-theme">Просмотрено недавно</h3>
            {recent.length === 0 ? (
              <p className="text-muted-theme">Нет недавно просмотренных эпизодов.</p>
            ) : (
              <div className="space-y-2">
                {recent.map((r, i) => {
                  const animeId = r.mal_id || r.shikimori_id;
                  const episodeNum = r.episode || '';
                  const watchDate = r.watched_at ? new Date(r.watched_at).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '';
                  
                  return (
                    <div key={`${animeId}-${r.watched_at}-${i}`} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-theme-2 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-theme truncate">{r.title || animeId}</div>
                        <div className="text-sm text-muted-theme">
                          {episodeNum && `Серия ${episodeNum}`}
                          {episodeNum && watchDate && ' • '}
                          {watchDate}
                        </div>
                      </div>
                      <button 
                        onClick={() => navigate(`/anime/${animeId}`)} 
                        className="px-3 py-1.5 rounded-lg bg-theme-2 hover:bg-theme-3 text-theme text-sm font-medium transition-colors touch-target flex-shrink-0"
                      >
                        Открыть
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {editing && <ProfileEditModal initial={profile} onClose={() => setEditing(false)} onSave={handleSave} />}
      {showFriendsModal && <FriendsModal friends={profile.friends} onClose={() => setShowFriendsModal(false)} />}
      {showStatsModal && <DetailedStatsModal userId={targetId} onClose={() => setShowStatsModal(false)} />}
    </div>
  );
};

export default ProfilePage;
