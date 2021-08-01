const Activity = require('./models/activity');

module.exports.newActivity = async (action, user, game, review) => {
    const activity = await new Activity({ action, user, game, review})
    await activity.save()
}
