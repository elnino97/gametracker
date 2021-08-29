const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const gameSchema = new Schema({
    id: Number,
    name: String,
    background_image: String,
    released: String,
    favoritedTimes: {
        type: Number,
        default: 0
    }
})

module.exports = mongoose.model("Game", gameSchema);