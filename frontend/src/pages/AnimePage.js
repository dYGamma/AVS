import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import axios from 'axios';
import Loader from '../components/Loader';
import { PlayIcon } from '@heroicons/react/solid';
import { AuthContext } from '../App';
import { ListContext } from '../context/ListContext';

/**
 * AnimePage — страница информации об аниме.
 * Улучшения:
 *  - унифицированные классы .btn/.btn-primary/.card/.bottom-panel
 *  - мобильный bottom sheet, блокирующий прокрутку
 *  - синхронизация статуса в списке пользователя
 *  - используем только 4 статуса: watching/planned/completed/dropped
 */

const JIKAN_BASE = 'https://api.jikan.moe/v4';

const MetaItem = ({ title, children }) => (
  <div className="flex items-start space-x-3">
    <div className="min-w-[1px] text-sm text-muted-2 w-40 md:w-56">{title}</div>
    <div className="text-sm text-muted-theme">{children}</div>
  </div>
);

const Tag = ({ children }) => (
  <span className="inline-block text-xs px-2 py-1 bg-theme rounded-md text-muted-theme mr-2 mb-2">
    {children}
  </span>
);

// mapping statuses to Russian labels (только 4)
const STATUS_LABELS = {
  watching: 'Смотрю',
  planned: 'В планах',
  completed: 'Завершено',
  dropped: 'Брошено'
};

const STATUS_ORDER = ['watching', 'planned', 'completed', 'dropped'];

const AnimePage = () => {
  const { id } = useParams(); // mal_id
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const { list, updateListItem, removeListItem } = useContext(ListContext);

  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);

  // Доп. данные
  const [playerData, setPlayerData] = useState(null); // от нашего бэкенда /player/:id
  const [pictures, setPictures] = useState([]); // from Jikan /pictures
  const [characters, setCharacters] = useState([]); // from Jikan /characters (для озвучки)
  const [recommendations, setRecommendations] = useState([]);
  const [isNewEpisode, setIsNewEpisode] = useState(false);
  const [newEpisodesList, setNewEpisodesList] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedImage, setSelectedImage] = useState(null); // For image modal

  // Нормализация статуса — общая util
  const normalizeStatusKey = (status) => {
    if (!status && status !== 0) return null;
    if (typeof status !== 'string') status = String(status);

    const raw = status.trim();
    const lower = raw.toLowerCase();

    const map = {
      // watching variants
      watching: 'watching',
      watch: 'watching',
      'currently airing': 'watching',
      airing: 'watching',
      'now airing': 'watching',
      'on air': 'watching',
      'airing now': 'watching',
      'смотрю': 'watching',
      // planned variants
      planned: 'planned',
      'plan to watch': 'planned',
      'plan': 'planned',
      'в планах': 'planned',
      // completed variants
      completed: 'completed',
      finished: 'completed',
      'завершено': 'completed',
      // dropped variants
      dropped: 'dropped',
      'брошено': 'dropped'
    };

    if (map[lower]) return map[lower];

    // допускаем, что бек уже отдал правильный ключ
    const validKeys = Object.keys(STATUS_LABELS);
    if (validKeys.includes(lower)) return lower;

    // попробовать найти по русской метке (точное совпадение)
    const foundByLabel = Object.entries(STATUS_LABELS).find(([, label]) => label === raw);
    if (foundByLabel) return foundByLabel[0];

    // fallback - вернуть trimmed
    return raw;
  };

  // Состояние списка пользователя: currentStatusRaw берём из контекста list
  const currentStatusRaw = useMemo(() => {
    const entry = list.find(item => String(item.mal_id) === String(id) || String(item.shikimori_id) === String(id));
    return entry?.status || null;
  }, [list, id]);

  // Нормализованный ключ для использования во всём компоненте
  const currentStatus = useMemo(() => normalizeStatusKey(currentStatusRaw), [currentStatusRaw]);

  const [menuOpen, setMenuOpen] = useState(false); // для десктопа - dropdown, для мобилки - bottom sheet
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [busy, setBusy] = useState(false);

  // Отслеживаем размер экрана (не условно — hook всегда вызывается)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Блокировка скролла при открытой мобильной панели
  useEffect(() => {
    if (menuOpen && isMobile) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [menuOpen, isMobile]);

  // Загрузка основной информации об аниме
  // Теперь возвращает payload (чтобы использовать его синхронно ниже)
  const fetchAnime = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data } = await api.get(`/anime/${id}`);
      // Поддержка возможных форматов ответа
      const payload = data && (data.data || data.title || data.name) ? (data.data ? data.data : data) : data;
      setAnime(payload);
      return payload;
    } catch (err) {
      console.error('Ошибка загрузки данных аниме:', err);
      setErrorMsg('Не удалось загрузить информацию об аниме.');
      setAnime(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Попытка получить плеер (Kodik) — для подсказок о новых эпизодах и перехода на просмотр
  const fetchPlayer = useCallback(async () => {
    try {
      const { data } = await api.get(`/player/${id}`);
      setPlayerData(data);
      return data;
    } catch (err) {
      // Это нормальная ситуация (плеер может быть не настроен/не найден)
      console.warn('Kodik player unavailable:', err?.response?.data || err.message);
      setPlayerData(null);
      return null;
    }
  }, [id]);

  // Получить дополнительные данные напрямую из Jikan (фотки, characters, recommendations)
  const fetchJikanExtras = useCallback(async () => {
    try {
      // pictures
      try {
        const picsRes = await axios.get(`${JIKAN_BASE}/anime/${id}/pictures`);
        setPictures(picsRes.data?.data || []);
      } catch (e) {
        setPictures([]);
      }

      // characters (для voice actors)
      try {
        const charsRes = await axios.get(`${JIKAN_BASE}/anime/${id}/characters`);
        setCharacters(charsRes.data?.data || []);
      } catch (e) {
        setCharacters([]);
      }

      // recommendations
      try {
        const recRes = await axios.get(`${JIKAN_BASE}/anime/${id}/recommendations`);
        setRecommendations(recRes.data?.data || []);
      } catch (e) {
        setRecommendations([]);
      }
    } catch (e) {
      console.warn('Extras load failed', e);
    }
  }, [id]);

  // При загрузке страницы — грузим все данные (fetchAnime возвращает payload)
  useEffect(() => {
    (async () => {
      const payload = await fetchAnime();
      const player = await fetchPlayer();
      await fetchJikanExtras();

      // Проверим новые эпизоды (best-effort) — используем payload, а не внешний anime стейт
      try {
        const localEpisodes = Number(payload?.episodes) || 0;
        const playerCount = player?.episodes_total ? Number(player.episodes_total) : null;
        if (playerCount && playerCount > localEpisodes) {
          setIsNewEpisode(true);
          const from = localEpisodes + 1;
          const to = playerCount;
          const list = [];
          for (let ep = from; ep <= to; ep++) {
            let va = 'неизвестно';
            if (characters && characters.length) {
              const firstWithVA = characters.find(c => c.voice_actors && c.voice_actors.length);
              if (firstWithVA) {
                va = firstWithVA.voice_actors[0].person?.name || va;
              }
            }
            list.push({ ep, va });
          }
          setNewEpisodesList(list);
        } else {
          setIsNewEpisode(false);
          setNewEpisodesList([]);
        }
      } catch (e) {
        setIsNewEpisode(false);
        setNewEpisodesList([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAnime, fetchPlayer, fetchJikanExtras, id]);

  // Обработчик нажатия "Смотреть" — запрашиваем плеер и переходим
  const handleWatchClick = async (selectedEpisode = null) => {
    try {
      setErrorMsg('');
      const { data } = await api.get(`/player/${id}`);
      navigate(`/watch/${id}`, {
        state: { playerData: data, animeTitle: anime?.title || anime?.title_english || 'Просмотр', selectedEpisode }
      });
    } catch (err) {
      console.error('Ошибка получения плеера:', err);
      setErrorMsg(err.response?.data?.message || 'Просмотр временно недоступен');
    }
  };

  // Обновление статуса аниме (POST /list)
  const updateStatus = async (status) => {
    if (!auth?.isAuth) {
      navigate('/login');
      return;
    }
    if (!status) return;
    setBusy(true);
    try {
      // animeData для бэкенда
      const animeData = {
        title: anime?.title || anime?.name || '',
        image_url: anime?.images?.jpg?.image_url || anime?.image_url || '',
        episodes: anime?.episodes || null
      };
      // используем mal_id — сервер в user.service допускает shikimori_id или mal_id
      await api.post('/list', { mal_id: Number(id), status, animeData });
      updateListItem(Number(id), status, animeData);
      setMenuOpen(false);
    } catch (e) {
      console.error('Не удалось обновить статус:', e);
      alert('Не удалось сохранить статус.');
    } finally {
      setBusy(false);
    }
  };

  // Удаление аниме из списка (DELETE /list/:mal_id)
  const removeFromList = async () => {
    if (!auth?.isAuth) {
      navigate('/login');
      return;
    }
    setBusy(true);
    try {
      await api.delete(`/list/${id}`);
      removeListItem(Number(id));
      setMenuOpen(false);
    } catch (e) {
      console.error('Не удалось удалить из списка:', e);
      alert('Не удалось удалить из списка.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader />;

  if (!anime) {
    return <p className="text-center mt-10">Не удалось загрузить информацию об аниме.</p>;
  }

  // Helpers извлечения свойств с учётом возможной структуры (data или просто объект)
  const A = anime;
  const title = A.title || A.title_english || 'Без названия';
  const synopsis = A.synopsis || 'Описание отсутствует.';
  const imageUrl = A.images?.jpg?.large_image_url || A.images?.jpg?.image_url || A.image_url || '';
  const type = A.type || A.media_type || 'N/A';
  const episodes = A.episodes || A.episodes_count || null;
  const duration = A.duration || (A.duration ? A.duration : null);
  const season = A.season || (A.aired?.prop?.from ? `${A.aired.prop.from.year}` : '');
  const seasonLabel = A.season ? `${A.season} ${A.year || ''}` : (A.aired?.string || '');
  const source = A.source || 'N/A';
  const studios = (A.studios || []).map(s => s.name).join(', ');
  const producers = (A.producers || []).map(p => p.name).join(', ');
  const genres = (A.genres || []).map(g => g.name);
  const ratingScore = A.score;
  const rank = A.rank;
  const popularity = A.popularity;
  const members = A.members;

  // schedule: if published dates/airing info exist
  let schedule = '—';
  if (A.status) {
    schedule = A.status;
    if (A.broadcast) schedule = A.broadcast;
  }

  // trailer link
  const trailerUrl = A.trailer?.url || (A.trailer && A.trailer.embed_url) || null;

  // UI for status button (label) — всегда русский, если ключ известен
  const statusLabel = (() => {
    if (!currentStatus) return 'Добавить в список';
    if (STATUS_LABELS[currentStatus]) return STATUS_LABELS[currentStatus];

    const found = Object.entries(STATUS_LABELS).find(([, label]) => label === currentStatus);
    if (found) return found[1];

    const normalized = String(currentStatus).toLowerCase().trim();
    if (STATUS_LABELS[normalized]) return STATUS_LABELS[normalized];

    // fallback — показать то, что пришло (но это нежелательно; нормализуйте в ListContext)
    return String(currentStatusRaw || currentStatus);
  })();

  // Render dropdown for desktop
  const DesktopStatusDropdown = () => {
    if (menuOpen) {
      return (
        <div className="bg-theme border border-theme-2 rounded-xl shadow-lg p-3 z-10 animate-fade-in">
          <div className="text-xs text-muted-theme px-1 pb-2">Выберите статус</div>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_ORDER.map(s => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                className={`w-full text-center px-3 py-2 rounded-lg text-sm transition-colors ${currentStatus === s ? 'bg-brand-purple text-white' : 'bg-theme-2 text-theme hover-theme'}`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <div className="border-t border-theme-2 mt-3 pt-3 space-y-2">
            {currentStatus && (
              <button onClick={removeFromList} className="w-full text-center px-3 py-2 rounded-lg text-red-400 hover:bg-red-900/50 transition-colors">
                Удалить из списка
              </button>
            )}
            <button onClick={() => setMenuOpen(false)} className="w-full text-center px-3 py-2 rounded-lg text-muted-theme hover-theme transition-colors">
              Отмена
            </button>
          </div>
        </div>
      );
    }

    return (
      <button
        onClick={() => setMenuOpen(true)}
        className="w-full btn btn-dark"
        aria-expanded={menuOpen}
      >
        {statusLabel}
      </button>
    );
  };

  // Mobile bottom sheet
  const MobileStatusSheet = () => (
    <>
      <div className="bottom-panel fixed-bottom-sheet animate-slide-up z-60">
        <div className="sheet-handle" />
        <div className="mt-2">
          <div className="flex items-center justify-between px-2">
            <div>
              <div className="text-sm font-semibold text-theme">Статус в списке</div>
              <div className="text-xs text-muted-theme">Выберите статус для этого аниме</div>
            </div>
            <button onClick={() => setMenuOpen(false)} className="text-sm text-muted-theme">Закрыть</button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 px-2">
            {STATUS_ORDER.map(s => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                disabled={busy}
                className={`btn ${currentStatus === s ? 'btn-primary' : 'btn-ghost'} w-full`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          <div className="px-2 mt-4">
            {currentStatus && (
              <button onClick={removeFromList} className="w-full py-3 rounded-lg btn-ghost" style={{ borderColor: 'rgba(255,50,50,0.18)', color: 'var(--danger)' }}>
                Удалить из списка
              </button>
            )}
          </div>
        </div>
      </div>

      {/* полупрозрачный backdrop */}
      <div onClick={() => setMenuOpen(false)} className="modal-backdrop z-50" />
    </>
  );

  const ImageModal = ({ src, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[999]" onClick={onClose}>
      <div className="relative p-4">
        <img src={src} alt="Просмотр изображения" className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl" />
        <button onClick={onClose} className="absolute top-0 right-0 mt-2 mr-2 text-white bg-black bg-opacity-50 rounded-full p-2 leading-none">&times;</button>
      </div>
    </div>
  );

  return (
    <div className="p-4 main-with-bottom-space">
      {/* Banner / cover */}
      <div className="relative w-full h-48 md:h-64 rounded-xl overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-theme flex items-center justify-center text-muted-theme">Нет обложки</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex flex-col justify-end backdrop-blur-sm">
          <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-md">{title}</h1>
          {A.title_english && <h2 className="text-sm text-gray-300">{A.title_english}</h2>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Left column: poster + actions */}
        <div className="md:col-span-1">
          <div className="sticky top-20">
            <img src={imageUrl} alt={title} className="w-full rounded-xl shadow-2xl object-cover" />
            <div className="mt-4 space-y-3">
              <button
                onClick={() => handleWatchClick(null)}
                className="w-full btn btn-primary flex items-center justify-center gap-2 rounded-xl"
              >
                <PlayIcon className="w-5 h-5" />
                <span>Смотреть</span>
              </button>

              {/* Статус: на десктопе dropdown, на мобилке — кнопка, открывающая bottom sheet */}
              {!isMobile ? (
                <DesktopStatusDropdown />
              ) : (
                <>
                  <button
                    onClick={() => setMenuOpen(true)}
                    className="w-full btn btn-dark mt-2"
                  >
                    {statusLabel}
                  </button>
                </>
              )}

              {trailerUrl && (
                <a href={trailerUrl} target="_blank" rel="noopener noreferrer" className="block text-center text-sm text-muted-theme underline mt-2">
                  Смотреть трейлер
                </a>
              )}

              {errorMsg && <p className="text-sm text-red-500 mt-2">{errorMsg}</p>}
            </div>
          </div>
        </div>

        {/* Right column: details */}
        <div className="md:col-span-4">
          {/* New episodes banner */}
          {isNewEpisode && newEpisodesList.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-500 rounded-lg text-black pulse-accent">
              <div className="font-bold">Версята, новая серия вышла!</div>
              <div className="mt-2 space-y-1 text-sm">
                {newEpisodesList.map(item => (
                  <div key={item.ep} className="flex items-center justify-between">
                    <div>Серия {item.ep} : <span className="font-semibold">{item.va}</span></div>
                    <div>
                      <button
                        onClick={() => {
                          if (playerData) {
                            navigate(`/watch/${id}`, { state: { playerData, animeTitle: title, selectedEpisode: item.ep } });
                          } else {
                            handleWatchClick(item.ep);
                          }
                        }}
                        className="text-xs px-2 py-1 bg-theme rounded-md text-theme"
                      >
                        Открыть плеер
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata block */}
          <div className="bg-theme p-4 rounded-lg mb-4 card">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetaItem title="Страна / Сезон">
                {A.source === 'Original' ? `${A.aired?.string || seasonLabel}` : (A.aired?.string || seasonLabel) || '—'}
              </MetaItem>

              <MetaItem title="Эпизоды / Длительность">
                {episodes ? `${episodes} эп. по ${duration || '—'}` : (duration ? `~${duration}` : '—')}
              </MetaItem>

              <MetaItem title="Тип / Расписание">
                <span>{type}{schedule ? `, ${schedule}` : ''}</span>
              </MetaItem>

              <MetaItem title="Первоисточник">
                {source || '—'}
              </MetaItem>

              <MetaItem title="Студии / Автор / Режиссёр">
                <div>
                  <div className="text-sm">{studios || '—'}</div>
                  {A.staff && A.staff.length > 0 && (
                    <div className="text-xs text-muted-theme mt-2">
                      {A.staff.slice(0, 3).map(s => `${s.name}${s.positions ? ` (${s.positions.join(',')})` : ''}`).join('; ')}
                    </div>
                  )}
                </div>
              </MetaItem>

              <MetaItem title="Жанры">
                <div className="flex flex-wrap">
                  {genres && genres.length ? genres.map(g => <Tag key={g}>{g}</Tag>) : '—'}
                </div>
              </MetaItem>
            </div>
          </div>

          {/* Synopsis */}
          <div className="bg-body p-4 rounded-lg mb-4">
            <h3 className="font-bold text-theme text-lg mb-2">Описание</h3>
            <p className="text-muted-theme text-sm whitespace-pre-line">{synopsis}</p>
          </div>

          {/* Видео / трейлеры / внешние ссылки */}
          <div className="bg-theme p-4 rounded-lg mb-4">
            <h3 className="font-bold text-theme mb-3">Видео</h3>
            {A.trailer?.embed_url ? (
              <div className="aspect-video">
                <iframe
                  src={`${A.trailer.embed_url}${A.trailer.embed_url.includes('?') ? '&' : '?'}mute=1`}
                  title="Trailer"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full rounded-lg"
                ></iframe>
              </div>
            ) : trailerUrl ? (
              <a href={trailerUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-theme-2 rounded-md text-sm text-muted-theme">
                Смотреть трейлер
              </a>
            ) : (
              <p className="text-muted-theme text-sm">Видео недоступно.</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {(A.external || []).map((ext, idx) => (
                <a key={idx} href={ext.url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-theme-2 rounded-md text-sm text-muted-theme">
                  {ext.name || 'Внешняя ссылка'}
                </a>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div className="bg-body p-4 rounded-lg mb-4">
            <h3 className="font-bold text-theme mb-2">Рейтинг</h3>
            <div className="flex flex-col md:flex-row md:items-center md:space-x-6">
              <div className="text-2xl font-bold text-theme">{ratingScore || '—'}</div>
              <div className="text-sm text-muted-theme">
                <div>Rank: {rank || '—'}</div>
                <div>Popularity: {popularity || '—'}</div>
                <div>Members: {members || '—'}</div>
              </div>
            </div>
          </div>

          {/* Pictures gallery */}
          <div className="bg-theme p-4 rounded-lg mb-4">
            <h3 className="font-bold text-theme mb-3">Кадры</h3>
            {pictures && pictures.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {pictures.slice(0, 18).map((pic, i) => (
                  <button key={i} onClick={() => setSelectedImage(pic.jpg?.image_url || pic.image_url)} className="block rounded overflow-hidden aspect-video cursor-pointer focus:outline-none">
                    <img src={pic.jpg?.image_url || pic.image_url} alt={`pic-${i}`} className="w-full h-full object-cover rounded transition-transform duration-300 hover:scale-105" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted-theme text-sm">Кадры недоступны.</p>
            )}
          </div>

          {/* Related / Releases */}
          <div className="bg-body p-4 rounded-lg mb-4">
            <h3 className="font-bold text-theme mb-3">Релизы / Связанные</h3>
            {A.relations && A.relations.length ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {A.relations.flatMap(rel => rel.entry.map(e => (
                  <div
                    key={e.mal_id}
                    onClick={() => navigate(`/anime/${e.mal_id}`)}
                    className="bg-theme p-3 rounded-lg cursor-pointer hover-theme transition-colors"
                  >
                    <div className="text-sm font-semibold truncate text-theme" title={e.name}>{e.name}</div>
                    <div className="text-xs text-muted-theme mt-1">{rel.relation}</div>
                    <div className="text-xs text-muted-theme mt-1">{e.type}</div>
                  </div>
                )))}
              </div>
            ) : (
              <p className="text-muted-theme text-sm">Нет связанных релизов.</p>
            )}
          </div>

          {/* Recommendations */}
          <div className="bg-theme p-4 rounded-lg mb-8">
            <h3 className="font-bold text-theme mb-3">Рекомендации</h3>
            {recommendations && recommendations.length ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {recommendations.slice(0, 8).map(rec => {
                  const recAnime = rec.entry || rec;
                  return (
                    <div key={recAnime.mal_id || recAnime.uid} className="bg-body rounded p-2 text-sm">
                      <div className="font-semibold text-theme">{recAnime.title || recAnime.name}</div>
                      <div className="text-xs text-muted-theme">Рейтинг: {rec.recommended_count || '-'}</div>
                      <button
                        onClick={() => navigate(`/anime/${recAnime.mal_id}`)}
                        className="mt-2 text-xs underline text-muted-theme"
                      >
                        Подробнее
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-theme text-sm">Похожих аниме не найдено.</p>
            )}
          </div>

        </div>
      </div>

      {/* Mobile sheet render */}
      {isMobile && menuOpen && <MobileStatusSheet />}

      {/* Image Modal */}
      {selectedImage && <ImageModal src={selectedImage} onClose={() => setSelectedImage(null)} />}
    </div>
  );
};

export default AnimePage;
