// ./backend/models/user.model.js
const { Schema, model } = require('mongoose');

const AnimeEntrySchema = new Schema({
    shikimori_id: { type: String, required: true },
    title: { type: String },
    poster_url: { type: String },
    episodes_total: { type: Number },
    status: {
        type: String,
        enum: ['watching', 'completed', 'dropped', 'planned'],
        required: true,
    },
    last_watched_at: { type: Date }
}, { _id: false });

const WatchHistorySchema = new Schema({
    mal_id: { type: String, required: true },
    shikimori_id: { type: String },
    title: { type: String },
    episode: { type: Number, required: true },
    watched_at: { type: Date, default: Date.now }
}, { _id: false });

const SocialLinksSchema = new Schema({
    website: { type: String },
    telegram: { type: String },
    twitter: { type: String },
    vk: { type: String },
    discord: { type: String }
}, { _id: false });

const UserSchema = new Schema({
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    password: { type: String, required: true },

    // profile fields
    nickname: { type: String, default: '' },
    avatar_url: { type: String, default: '' },
    cover_url: { type: String, default: '' },
    bio: { type: String, default: '' },
    social_links: { type: SocialLinksSchema, default: {} },
    sticker: { type: String, default: null },

    // friend list: store references to other users' ObjectId
    friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    friendRequestsSent: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    friendRequestsReceived: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    anime_list: { type: [AnimeEntrySchema], default: [] },
    watch_history: { type: [WatchHistorySchema], default: [] }
}, { timestamps: true });


module.exports = model('User', UserSchema);
