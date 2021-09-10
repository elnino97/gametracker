const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ImageSchema = new Schema({
    url: String,
    filename: String
});

ImageSchema.virtual('mediumScreenshot').get(function () {
    return this.url.replace('/upload', '/upload/w_280');
});

const gameSchema = new Schema({
    id: Number,
    name: String,
    background_image: String,
    released: String,
    screenshots: [ImageSchema],
    favoritedTimes: {
        type: Number,
        default: 0
    }
})

module.exports = mongoose.model("Game", gameSchema);