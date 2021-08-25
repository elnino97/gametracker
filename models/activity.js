const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const activitySchema = new Schema({
    action: String,
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
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