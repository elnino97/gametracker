const Activity = require('./models/activity');

module.exports.newActivity = async (action, user, game, review, image) => {
    const activity = await new Activity({ action, user, game, review, image})
    await activity.save()
}
