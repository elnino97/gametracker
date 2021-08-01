const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const User = require('./models/user');
const Activity = require('./models/activity');
const Game = require('./models/gameinfo');

module.exports.newActivity = async (action, user, game) => {
    const activity = await new Activity({ action, user, game})
    await activity.save()
}
