const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const activitySchema = new Schema({
    action: String,
    user: {
        id: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        username: String
    },
    game: {
        type: Schema.Types.ObjectId,
        ref: 'Game'
    },
    review: {
        type: Schema.Types.ObjectId,
        ref: 'Review'
    },
    image: String
}, { timestamps: { createdAt: 'created_at' } })

module.exports = mongoose.model("Activity", activitySchema);