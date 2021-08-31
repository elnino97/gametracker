const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
    title: String,
    rating: Number,
    body: String,
    recommend: Boolean,
    gameId: Number,
    game: {
        type: Schema.Types.ObjectId,
        ref: 'Game'
    },
    author: {
        name: String,
        id: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    }
}, { timestamps: { createdAt: 'created_at' } })

module.exports = mongoose.model("Review", reviewSchema);