const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userDataSchema = new Schema({
    user: {
        id: String,
        username: String
    },
    image: String,
    about: String,
    favorite: [ Number ],
    review: [{
        type: Schema.Types.ObjectId,
        ref: 'Review'
    }],
    actionCount: {
        type: Number,
        default: 0
    }
}, { timestamps: { createdAt: 'created_at' } })

module.exports = mongoose.model("Userdata", userDataSchema);