const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const gameSchema = new Schema({
    id: Number,
    name: String,
    background_image: String,
    released: String
})

module.exports = mongoose.model("Game", gameSchema);