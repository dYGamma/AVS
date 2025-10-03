// ./frontend/src/components/ProfileEditModal.js
import React, { useEffect, useRef, useState } from 'react';
import api from '../api';
import { XIcon, UploadIcon, GlobeAltIcon, AtSymbolIcon, ChatAlt2Icon, UserGroupIcon } from '@heroicons/react/outline';

const ProfileEditModal = ({ initial = {}, onClose, onSave }) => {
    const [nickname, setNickname] = useState(initial.nickname || '');
    const [bio, setBio] = useState(initial.bio || '');
    const [socialLinks, setSocialLinks] = useState(initial.social_links || { website: '', telegram: '', discord: '' });
    const [selectedSticker, setSelectedSticker] = useState(initial.sticker || null);

    const [avatarFile, setAvatarFile] = useState(null);
    const [coverFile, setCoverFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Ограничения символов
    const NICKNAME_MAX_LENGTH = 30;
    const BIO_MAX_LENGTH = 200;

    const sheetRef = useRef(null);

    useEffect(() => {
        // Блокируем скролл и pull-to-refresh на фоне
        const prevOverflow = document.body.style.overflow;
        const prevOverscroll = document.body.style.overscrollBehavior;
        document.body.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'none';

        const handleTouchMove = (e) => {
            // предотвращаем скролл фона при движении на модалке
            if (!sheetRef.current) return;
            if (!sheetRef.current.contains(e.target)) {
                e.preventDefault();
            }
        };
        document.addEventListener('touchmove', handleTouchMove, { passive: false });

        return () => {
            document.removeEventListener('touchmove', handleTouchMove);
            document.body.style.overflow = prevOverflow;
            document.body.style.overscrollBehavior = prevOverscroll;
        };
    }, []);

    const onAvatarChange = (e) => {
        const f = e.target.files?.[0];
        if (f) setAvatarFile(f);
    };
    const onCoverChange = (e) => {
        const f = e.target.files?.[0];
        if (f) setCoverFile(f);
    };

    const doUploadFile = async (file, endpoint, fieldName) => {
        const form = new FormData();
        form.append(fieldName, file);
        try {
            const res = await api.post(endpoint, form, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return res.data;
        } catch (err) {
            console.error('upload error', err);
            throw err;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);
        try {
            // Сначала загружаем файлы
            if (avatarFile) {
                await doUploadFile(avatarFile, '/users/me/avatar', 'avatar');
            }
            if (coverFile) {
                await doUploadFile(coverFile, '/users/me/cover', 'cover');
            }

            // Затем отправляем остальные обновления
            const updates = { 
                nickname: nickname.trim(), 
                bio: bio.trim(), 
                social_links: socialLinks, 
                sticker: selectedSticker
            };
            await onSave(updates);
        } catch (err) {
            console.error('save profile error', err);
            alert(err.response?.data?.message || 'Ошибка при обновлении профиля');
        } finally {
            setUploading(false);
        }
    };

    const handleSocialChange = (key, value) => {
        setSocialLinks(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 animate-fade-in-fast">
            <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

            <div ref={sheetRef} className="relative w-full max-w-lg bg-theme rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-theme flex items-center justify-between">
                    <h3 className="text-xl font-bold text-theme">Редактировать профиль</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover-theme transition-colors">
                        <XIcon className="w-6 h-6 text-theme" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-muted-theme">Ник</label>
                                <span className="text-xs text-muted-theme">{nickname.length}/{NICKNAME_MAX_LENGTH}</span>
                            </div>
                            <input 
                                value={nickname} 
                                onChange={(e) => {
                                    if (e.target.value.length <= NICKNAME_MAX_LENGTH) {
                                        setNickname(e.target.value);
                                    }
                                }} 
                                placeholder="Ваш никнейм"
                                maxLength={NICKNAME_MAX_LENGTH}
                                className="w-full bg-theme-2 border border-theme rounded-lg px-3 py-2 text-theme focus:ring-2 focus:ring-brand-purple" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-theme mb-1">Стикер (бейдж)</label>
                            <div className="flex items-center gap-3 bg-theme-2 border border-theme rounded-lg px-3 py-2">
                                <button type="button" onClick={() => setSelectedSticker('beta')} className={`px-3 py-1 text-sm rounded-md ${selectedSticker === 'beta' ? 'bg-brand-purple text-white' : 'bg-theme text-muted-theme'}`}>Бета-тестер</button>
                                {selectedSticker && <img src={`/assets/stickers/${selectedSticker}.png`} alt="st" className="w-6 h-6" />}
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-muted-theme">О себе</label>
                            <span className="text-xs text-muted-theme">{bio.length}/{BIO_MAX_LENGTH}</span>
                        </div>
                        <textarea 
                            value={bio} 
                            onChange={(e) => {
                                if (e.target.value.length <= BIO_MAX_LENGTH) {
                                    setBio(e.target.value);
                                }
                            }} 
                            placeholder="Расскажите о себе..."
                            maxLength={BIO_MAX_LENGTH}
                            rows={3} 
                            className="w-full bg-theme-2 border border-theme rounded-lg px-3 py-2 text-theme focus:ring-2 focus:ring-brand-purple"
                        ></textarea>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-theme mb-1">Аватар</label>
                            <label className="w-full flex items-center gap-2 cursor-pointer bg-theme-2 border border-theme rounded-lg px-3 py-2 text-theme">
                                <UploadIcon className="w-5 h-5" />
                                <span className="text-sm truncate">{avatarFile ? avatarFile.name : 'Выбрать файл'}</span>
                                <input onChange={onAvatarChange} accept="image/*" type="file" className="hidden" />
                            </label>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-theme mb-1">Обложка</label>
                            <label className="w-full flex items-center gap-2 cursor-pointer bg-theme-2 border border-theme rounded-lg px-3 py-2 text-theme">
                                <UploadIcon className="w-5 h-5" />
                                <span className="text-sm truncate">{coverFile ? coverFile.name : 'Выбрать файл'}</span>
                                <input onChange={onCoverChange} accept="image/*" type="file" className="hidden" />
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-muted-theme mb-2">Социальные сети</label>
                        <div className="space-y-3">
                            <div className="relative">
                                <GlobeAltIcon className="w-5 h-5 text-muted-theme absolute left-3 top-1/2 -translate-y-1/2" />
                                <input value={socialLinks.website} onChange={(e) => handleSocialChange('website', e.target.value)} placeholder="Ваша ссылка на веб-сайт" className="w-full bg-theme-2 border border-theme rounded-lg pl-10 pr-3 py-2 text-theme focus:ring-2 focus:ring-brand-purple" />
                            </div>
                            <div className="relative">
                                <AtSymbolIcon className="w-5 h-5 text-muted-theme absolute left-3 top-1/2 -translate-y-1/2" />
                                <input value={socialLinks.telegram} onChange={(e) => handleSocialChange('telegram', e.target.value)} placeholder="Ваш ID в Telegram" className="w-full bg-theme-2 border border-theme rounded-lg pl-10 pr-3 py-2 text-theme focus:ring-2 focus:ring-brand-purple" />
                            </div>
                            <div className="relative">
                                <ChatAlt2Icon className="w-5 h-5 text-muted-theme absolute left-3 top-1/2 -translate-y-1/2" />
                                <input value={socialLinks.discord} onChange={(e) => handleSocialChange('discord', e.target.value)} placeholder="Ваш ID в Discord" className="w-full bg-theme-2 border border-theme rounded-lg pl-10 pr-3 py-2 text-theme focus:ring-2 focus:ring-brand-purple" />
                            </div>
                        </div>
                    </div>
                </form>

                <div className="p-6 bg-body rounded-b-2xl flex items-center justify-end gap-4">
                    <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg bg-theme-2 text-theme font-semibold hover-theme transition-colors">Отмена</button>
                    <button type="submit" form="edit-profile-form" disabled={uploading} onClick={handleSubmit} className="px-5 py-2 rounded-lg bg-brand-purple text-white font-semibold hover:bg-brand-purple/80 transition-colors disabled:bg-gray-500">
                        {uploading ? 'Сохранение...' : 'Сохранить'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileEditModal;
