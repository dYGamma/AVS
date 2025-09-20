const { Schema, model } = require('mongoose');

const NotificationSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['friend_request'], required: true },
    from: { type: Schema.Types.ObjectId, ref: 'User' },
    read: { type: Boolean, default: false },
    message: { type: String }
}, { timestamps: true });

module.exports = model('Notification', NotificationSchema);
