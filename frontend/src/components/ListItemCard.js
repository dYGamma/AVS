import React from 'react';
import { StarIcon } from '@heroicons/react/solid';

const ListItemCard = ({ anime, onClick, isFromList = false }) => {
    // SVG placeholder для случаев, когда изображение недоступно
    const placeholderSvg = `data:image/svg+xml;base64,${btoa(`
        <svg width="200" height="280" viewBox="0 0 200 280" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="280" fill="#374151"/>
            <circle cx="100" cy="120" r="30" fill="#6B7280"/>
            <rect x="60" y="180" width="80" height="8" rx="4" fill="#6B7280"/>
            <rect x="70" y="200" width="60" height="6" rx="3" fill="#4B5563"/>
            <rect x="75" y="220" width="50" height="6" rx="3" fill="#4B5563"/>
        </svg>
    `)}`;

    // Безопасно получаем URL изображения из структуры Jikan API или fallback данных
    const imageUrl = anime?.images?.jpg?.large_image_url || 
                     anime?.images?.jpg?.image_url || 
                     anime?.image_url || 
                     anime?.poster_url || 
                     placeholderSvg;
    
    const title = anime?.title || anime?.name || `Аниме ${anime?.shikimori_id || anime?.mal_id || ''}`;
    const description = anime?.synopsis || anime?.description || 'Описание загружается...';
    const episodes = anime?.episodes || anime?.episodes_total || '?';
    const score = anime?.score || anime?.rating || 'N/A';
    
    // Показываем индикатор загрузки только для элементов из пользовательского списка
    const isLoading = isFromList && !anime?.detailsLoaded && !anime?.loadError;
    const hasError = isFromList && anime?.loadError;
    
    return (
        <div onClick={onClick} className="flex bg-theme space-x-4 cursor-pointer group">
            <div className="relative w-32 h-48 flex-shrink-0">
                <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-full object-cover rounded-xl bg-theme-2"
                    onError={(e) => {
                        e.target.src = placeholderSvg;
                    }}
                />
                {isLoading && (
                    <div className="absolute inset-0 bg-theme bg-opacity-75 rounded-xl flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-purple"></div>
                    </div>
                )}
                {hasError && (
                    <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full" title="Ошибка загрузки данных"></div>
                )}
            </div>
            <div className="flex flex-col justify-between py-1 overflow-hidden">
                <div>
                    <h3 className="font-bold text-base truncate text-theme group-hover:text-brand-purple transition-colors">
                        {title}
                    </h3>
                    <div className="flex items-center text-sm text-muted-theme mt-1">
                        <span>{episodes} эп.</span>
                        <span className="mx-1.5">&bull;</span>
                        <StarIcon className="w-4 h-4 text-yellow-400 mr-1" />
                        <span>{score}</span>
                        {isLoading && (
                            <>
                                <span className="mx-1.5">&bull;</span>
                                <span className="text-xs text-brand-purple">Загрузка...</span>
                            </>
                        )}
                    </div>
                    <p className="text-sm text-muted-theme mt-2 clamp-3">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ListItemCard;
