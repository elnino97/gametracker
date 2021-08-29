const Activity = require('./models/activity');

module.exports.newActivity = async (action, id, username, game, review, image) => {
    const activity = await new Activity({ action, user: { id, username }, game, review, image})
    await activity.save()
}
