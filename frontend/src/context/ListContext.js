import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../api';
import { AuthContext } from '../App';

export const ListContext = createContext();

const STATUS_KEYS = ['watching', 'planned', 'completed', 'dropped'];

/**
 * Нормализует входной статус к одному из ключей:
 * watching | planned | completed | dropped
 */
const normalizeStatusKey = (status) => {
  if (status === null || status === undefined) return null;
  if (typeof status !== 'string') status = String(status);
  const raw = status.trim();
  const lower = raw.toLowerCase();

  const map = {
    // watching variants
    watching: 'watching', watch: 'watching', 'currently airing': 'watching',
    airing: 'watching', 'now airing': 'watching', 'on air': 'watching', 'airing now': 'watching',
    'смотрю': 'watching',

    // planned variants
    planned: 'planned', 'plan to watch': 'planned', plan: 'planned', 'в планах': 'planned',

    // completed
    completed: 'completed', finished: 'completed', 'завершено': 'completed',

    // dropped
    dropped: 'dropped', 'брошено': 'dropped'
  };

  if (map[lower]) return map[lower];
  if (STATUS_KEYS.includes(lower)) return lower;

  const labelsToKeys = {
    'Смотрю': 'watching',
    'В планах': 'planned',
    'Завершено': 'completed',
    'Брошено': 'dropped'
  };
  if (labelsToKeys[raw]) return labelsToKeys[raw];

  return raw; // fallback, нежелательно
};

/**
 * Простая helper-функция с retry
 */
const fetchWithRetry = async (fn, attempts = 3, delayMs = 600) => {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      // небольшой backoff
      await new Promise(res => setTimeout(res, delayMs));
    }
  }
  throw lastErr;
};

export const ListProvider = ({ children }) => {
  const [list, setList] = useState([]); // array of items (merged)
  const [loading, setLoading] = useState(true);
  const { auth } = useContext(AuthContext);

  const fetchList = useCallback(async () => {
    if (auth?.isAuth && auth.user) {
      setLoading(true);
      try {
        const response = await api.get('/list');
        if (!Array.isArray(response.data)) {
          setList([]);
          setLoading(false);
          return;
        }

        // 1) Создаём минимальный локальный список на основе response.data
        //    не дожидаясь подробных данных, показываем UI сразу
        const initial = response.data.map(item => {
          const mal = item.mal_id ?? item.shikimori_id ?? item.id ?? '';
          const sh = item.shikimori_id ?? item.mal_id ?? item.id ?? '';
          const malStr = mal !== undefined && mal !== null ? String(mal) : '';
          const shStr = sh !== undefined && sh !== null ? String(sh) : '';
          return {
            // минимальные поля
            id: malStr || shStr || String(Math.random()),
            mal_id: malStr,
            shikimori_id: shStr,
            status: normalizeStatusKey(item.status),
            // пользовательские метаданные (аннотация)
            added_at: item.added_at || item.createdAt || item.timestamp || null,
            // пометка что деталей пока нет
            detailsLoaded: false,
            // включаем исходный объект, чтобы позже его не потерять
            __raw: item
          };
        });

        setList(initial);

        // 2) Асинхронно докачиваем детали для каждого элемента
        //    используем более надежный подход с последовательной загрузкой и лучшей обработкой ошибок
        const fetchDetailFor = async (fetchId) => {
          const res = await fetchWithRetry(() => api.get(`/anime/${fetchId}`), 5, 1000);
          const payload = res?.data?.data ?? res?.data ?? {};
          return payload;
        };

        // Загружаем детали последовательно с небольшими задержками для избежания rate limiting
        // Загружаем сверху вниз (с начала списка)
        const loadDetailsSequentially = async () => {
          for (let i = 0; i < initial.length; i++) {
            const item = initial[i];
            const fetchId = item.__raw?.shikimori_id || item.__raw?.mal_id || item.mal_id || item.shikimori_id;
            
            if (!fetchId) continue;

            try {
              // Добавляем задержку между запросами для избежания rate limiting
              if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 300));
              }

              const details = await fetchDetailFor(fetchId);
              
              // merge: сначала details, затем исходный item -> пользовательские поля (status etc.) не затираются
              const merged = { 
                ...(details || {}), 
                ...item.__raw, // raw from server contains user fields
                // ensure ids as strings
                mal_id: details?.mal_id ? String(details.mal_id) : item.mal_id,
                shikimori_id: details?.shikimori_id ? String(details.shikimori_id) : item.shikimori_id,
                status: normalizeStatusKey(item.__raw?.status ?? item.status),
                detailsLoaded: true
              };

              // обновляем только конкретный элемент
              setList(prev => prev.map(p => {
                const idMatch = (p.mal_id && merged.mal_id && String(p.mal_id) === String(merged.mal_id))
                  || (p.shikimori_id && merged.shikimori_id && String(p.shikimori_id) === String(merged.shikimori_id))
                  || (p.id && merged.mal_id && String(p.id) === String(merged.mal_id));
                if (idMatch) {
                  return { ...p, ...merged };
                }
                return p;
              }));
            } catch (err) {
              // если не удалось получить детали — оставляем минимальный элемент с fallback данными
              console.warn('Failed to fetch detail for', fetchId, err?.message || err);
              
              // Создаем fallback объект с базовыми данными из сохраненного списка
              const fallbackData = {
                title: item.__raw?.title || `Аниме ${fetchId}`,
                images: {
                  jpg: {
                    large_image_url: item.__raw?.poster_url || '/placeholder-anime.jpg'
                  }
                },
                synopsis: 'Описание недоступно',
                score: null,
                episodes: item.__raw?.episodes_total || null,
                detailsLoaded: false,
                loadError: true
              };

              setList(prev => prev.map(p => {
                const idMatch = (p.mal_id && String(p.mal_id) === String(item.mal_id))
                  || (p.shikimori_id && String(p.shikimori_id) === String(item.shikimori_id))
                  || (p.id && String(p.id) === String(item.id));
                if (idMatch) {
                  return { ...p, ...fallbackData, ...item.__raw, status: normalizeStatusKey(item.__raw?.status ?? item.status) };
                }
                return p;
              }));
            }
          }
        };

        // Запускаем загрузку деталей в фоне
        loadDetailsSequentially().catch(e => {
          console.warn('Details loading finished with error', e);
        });

      } catch (error) {
        console.error("Failed to fetch user list:", error);
        setList([]);
      } finally {
        setLoading(false);
      }
    } else {
      setList([]);
      setLoading(false);
    }
  }, [auth?.isAuth, auth?.user]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const updateListItem = (mal_id, status, animeData) => {
    const idStr = String(mal_id);
    const normalizedStatus = normalizeStatusKey(status);

    setList(prevList => {
      const exists = prevList.some(item => String(item.mal_id) === idStr || String(item.shikimori_id) === idStr);
      if (exists) {
        return prevList.map(item => {
          if (String(item.mal_id) === idStr || String(item.shikimori_id) === idStr) {
            return { ...item, status: normalizedStatus, ...animeData };
          }
          return item;
        });
      }

      if (animeData) {
        const newItem = {
          ...animeData,
          mal_id: idStr,
          shikimori_id: idStr,
          status: normalizedStatus,
          detailsLoaded: true
        };
        return [...prevList, newItem];
      }

      return prevList;
    });
  };

  const removeListItem = (mal_id) => {
    const idStr = String(mal_id);
    setList(prevList => prevList.filter(item => !(String(item.mal_id) === idStr || String(item.shikimori_id) === idStr)));
  };

  const value = {
    list,
    loading,
    fetchList,
    updateListItem,
    removeListItem,
  };

  return <ListContext.Provider value={value}>{children}</ListContext.Provider>;
};
