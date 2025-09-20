import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../App';
import { PlusIcon, CheckIcon, XIcon } from '@heroicons/react/solid';

/**
 * AddToListButton
 *
 * Props:
 *  - anime: объект аниме (как возвращает Jikan)
 *  - currentStatus: строка текущего статуса пользователя для этого аниме
 *  - onChange: function(newList) -> вызывается после успешного обновления списка на бэке
 *
 * Поведение:
 *  - Если не авторизован -> перенаправляет на /login
 *  - Открывает dropdown с возможностью выбрать статус
 *  - Если выбран тот же статус -> удаляет из списка (toggle)
 *  - Вызывает POST /api/list или DELETE /api/list/:mal_id и затем получает обновлённый список /api/list
 */
const STATUSES = [
  { key: 'watching', label: 'Смотрю' },
  { key: 'planned', label: 'В планах' },
  { key: 'completed', label: 'Завершено' },
  { key: 'dropped', label: 'Брошено' },
];

const AddToListButton = ({ anime = {}, currentStatus = null, onChange = () => {} }) => {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  // Закрытие при клике вне меню
  useEffect(() => {
    const handleDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, []);

  // Подготовка данных аниме для отправки на сервер
  const animeData = {
    title: anime?.title || anime?.name || '',
    image_url: anime?.images?.jpg?.large_image_url || anime?.images?.jpg?.image_url || anime?.image_url || '',
    episodes: anime?.episodes || anime?.episodes_total || 0,
    mal_id: anime?.mal_id || anime?.id || '',
  };

  const idForDelete = animeData.mal_id || animeData.title || '';

  const ensureAuthOrRedirect = () => {
    if (!auth?.isAuth) {
      navigate('/login');
      return false;
    }
    return true;
  };

  // Нормализация статуса — приводим к ключам: watching/planned/completed/dropped
  const normalizeStatusKey = (status) => {
    if (!status && status !== 0) return null;
    if (typeof status !== 'string') status = String(status);

    const raw = status.trim();
    const lower = raw.toLowerCase();

    const map = {
      // watching variants
      watching: 'watching',
      'watching ': 'watching',
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
      'plan to watch ': 'planned',
      'plan': 'planned',
      'в планах': 'planned',
      'planned ': 'planned',
      // completed variants
      completed: 'completed',
      'finished': 'completed',
      'завершено': 'completed',
      'completed ': 'completed',
      // dropped variants
      dropped: 'dropped',
      'брошено': 'dropped',
      'dropped ': 'dropped'
    };

    if (map[lower]) return map[lower];

    // допускаем, что бек уже отдал правильный ключ
    const validKeys = STATUSES.map(s => s.key);
    if (validKeys.includes(lower)) return lower;

    // попробовать найти по русской метке (точное совпадение)
    const foundByLabel = STATUSES.find(s => s.label === raw);
    if (foundByLabel) return foundByLabel.key;

    // fallback: вернуть trimmed (неизвестное)
    return raw;
  };

  const normalizedCurrentKey = normalizeStatusKey(currentStatus);

  // Отображаемая метка для кнопки — всегда русская, если можно
  const displayLabel = (() => {
    if (!normalizedCurrentKey) return 'Добавить в список';
    const found = STATUSES.find(s => s.key === normalizedCurrentKey);
    if (found) return found.label;
    // возможно пришла русская метка
    const byLabel = STATUSES.find(s => s.label === normalizedCurrentKey);
    if (byLabel) return byLabel.label;
    // fallback: показать сырое значение (на всякий случай)
    return String(currentStatus);
  })();

  const handlePick = async (statusKey) => {
    if (!ensureAuthOrRedirect()) return;
    setLoading(true);
    try {
      // если текущий статус (нормализованный) совпадает с выбранным — удаляем
      if (normalizedCurrentKey === statusKey) {
        await api.delete(`/list/${encodeURIComponent(idForDelete)}`);
        const listRes = await api.get('/list');
        onChange(listRes.data);
      } else {
        const payload = {
          shikimori_id: String(animeData.mal_id || ''),
          mal_id: String(animeData.mal_id || ''),
          status: statusKey,
          animeData,
        };
        const res = await api.post('/list', payload);
        if (Array.isArray(res.data)) {
          onChange(res.data);
        } else {
          const listRes = await api.get('/list');
          onChange(listRes.data);
        }
      }
      setOpen(false);
    } catch (err) {
      console.error('AddToListButton error', err);
      alert(err?.response?.data?.message || 'Не удалось обновить список');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!ensureAuthOrRedirect()) return;
    if (!confirm('Удалить аниме из списка?')) return;
    setLoading(true);
    try {
      await api.delete(`/list/${encodeURIComponent(idForDelete)}`);
      const listRes = await api.get('/list');
      onChange(listRes.data);
      setOpen(false);
    } catch (err) {
      console.error('Remove error', err);
      alert('Не удалось удалить из списка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block w-full md:w-auto" ref={menuRef}>
      <button
        onClick={() => {
          if (!ensureAuthOrRedirect()) return;
          setOpen(prev => !prev);
        }}
        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-shadow w-full ${
          normalizedCurrentKey ? 'bg-gray-700 text-white' : 'bg-dark-card text-gray-100'
        } hover:shadow-md`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {normalizedCurrentKey ? <CheckIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
        <span>{displayLabel}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-dark-card border border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-2">
            {STATUSES.map(s => (
              <button
                key={s.key}
                onClick={() => handlePick(s.key)}
                disabled={loading}
                className={`w-full text-left px-3 py-2 rounded-md mb-1 transition-colors flex items-center justify-between ${
                  normalizedCurrentKey === s.key ? 'bg-brand-purple text-white' : 'text-gray-200 hover:bg-gray-700'
                }`}
              >
                <span>{s.label}</span>
                {normalizedCurrentKey === s.key ? <CheckIcon className="w-4 h-4" /> : null}
              </button>
            ))}

            <div className="mt-2 border-t border-gray-700 pt-2">
              <button
                onClick={handleRemove}
                className="w-full text-left px-3 py-2 rounded-md text-sm text-red-400 hover:bg-gray-700"
                disabled={loading}
              >
                <div className="flex items-center justify-between">
                  <span>Удалить из списка</span>
                  <XIcon className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddToListButton;
