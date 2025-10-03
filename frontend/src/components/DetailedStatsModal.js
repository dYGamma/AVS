// frontend/src/components/DetailedStatsModal.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Loader from './Loader';

const DetailedStatsModal = ({ userId, onClose }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('watching');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWithRetry = async (fn, attempts = 3, delayMs = 600) => {
      let lastErr;
      for (let i = 0; i < attempts; i++) {
        try {
          return await fn();
        } catch (e) {
          lastErr = e;
          await new Promise(res => setTimeout(res, delayMs * (i + 1)));
        }
      }
      throw lastErr;
    };

    const fetchAndEnrichStats = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/users/${userId}/detailed-stats`);
        const initialStats = res.data;
        setStats(initialStats); // Показываем начальные данные сразу

        // Асинхронно обогащаем данные
        const enrichCategory = async (category, animeList) => {
          for (let i = 0; i < animeList.length; i++) {
            const anime = animeList[i];
            try {
              if (i > 0) await new Promise(resolve => setTimeout(resolve, 300)); // Задержка

              const animeDetailsRes = await fetchWithRetry(() => api.get(`/anime/${anime.shikimori_id}`));
              const details = animeDetailsRes.data;
              const imageUrl = details?.images?.jpg?.large_image_url;

              setStats(prevStats => {
                const newCategoryList = [...(prevStats[category] || [])];
                const animeIndex = newCategoryList.findIndex(a => a.shikimori_id === anime.shikimori_id);
                if (animeIndex !== -1) {
                  newCategoryList[animeIndex] = {
                    ...newCategoryList[animeIndex],
                    poster_url: imageUrl || newCategoryList[animeIndex].poster_url,
                  };
                }
                return { ...prevStats, [category]: newCategoryList };
              });

            } catch (error) {
              console.error(`Failed to fetch details for anime ${anime.shikimori_id}:`, error);
            }
          }
        };

        for (const key in initialStats) {
          enrichCategory(key, initialStats[key]);
        }

      } catch (err) {
        console.error('Failed to fetch detailed stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndEnrichStats();
  }, [userId]);

  const tabs = [
    { key: 'watching', label: 'Смотрю', color: 'bg-blue-500' },
    { key: 'completed', label: 'Просмотрено', color: 'bg-green-500' },
    { key: 'planned', label: 'В планах', color: 'bg-yellow-500' },
    { key: 'dropped', label: 'Брошено', color: 'bg-red-500' }
  ];

  const currentList = stats?.[activeTab] || [];

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
        <div className="bg-theme rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="p-4 border-b border-theme flex items-center justify-between">
            <h2 className="text-xl font-bold text-theme">Подробная статистика</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-theme-2 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-theme overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-b-2 border-accent text-theme'
                    : 'text-muted-theme hover:text-theme'
                }`}
              >
                {tab.label} ({stats?.[tab.key]?.length || 0})
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            {loading ? (
              <Loader />
            ) : currentList.length === 0 ? (
              <p className="text-center text-muted-theme py-8">Список пуст</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {currentList.map(anime => (
                  <div
                    key={anime.shikimori_id}
                    onClick={() => {
                      navigate(`/anime/${anime.shikimori_id}`);
                      onClose();
                    }}
                    className="cursor-pointer group"
                  >
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-theme-2 mb-2">
                      <img
                        src={anime.poster_url}
                        alt={anime.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `data:image/svg+xml;base64,${btoa(`
                            <svg width="200" height="280" viewBox="0 0 200 280" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="200" height="280" fill="#374151"/>
                                <circle cx="100" cy="120" r="30" fill="#6B7280"/>
                                <rect x="60" y="180" width="80" height="8" rx="4" fill="#6B7280"/>
                                <rect x="70" y="200" width="60" height="6" rx="3" fill="#4B5563"/>
                                <rect x="75" y="220" width="50" height="6" rx="3" fill="#4B5563"/>
                            </svg>
                          `)}`;
                        }}
                      />
                    </div>
                    <h3 className="text-sm font-medium text-theme line-clamp-2 group-hover:text-accent transition-colors">
                      {anime.title || 'Без названия'}
                    </h3>
                    {anime.episodes_total > 0 && (
                      <p className="text-xs text-muted-theme mt-1">
                        {anime.episodes_total} эп.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DetailedStatsModal;
