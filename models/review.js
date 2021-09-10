const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ImageSchema = new Schema({
    url: String,
    filename: String
});

ImageSchema.virtual('smallScreenshot').get(function () {
    return this.url.replace('/upload', '/upload/w_135');
});
ImageSchema.virtual('mediumScreenshot').get(function () {
    return this.url.replace('/upload', '/upload/w_280');
});

const reviewSchema = new Schema({
    title: String,
    rating: Number,
    body: String,
    screenshots: [ImageSchema],
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