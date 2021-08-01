const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
    body: String,
    rating: Number,
    gameId: Number,
    authorId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    author: String
}, { timestamps: { createdAt: 'created_at' } })

module.exports = mongoose.model("Review", reviewSchema);