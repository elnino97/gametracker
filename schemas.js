const Activity = require('./models/activity');
const BaseJoi = require('joi');
const sanitizeHtml = require('sanitize-html');

const extension = (joi) => ({
    type: 'string',
    base: joi.string(),
    messages: {
        'string.escapeHTML': '{{#label}} must not include HTML!'
    },
    rules: {
        escapeHTML: {
            validate(value, helpers) {
                const clean = sanitizeHtml(value, {
                    allowedTags: [],
                    allowedAttributes: {},
                });
                if (clean !== value) return helpers.error('string.escapeHTML', { value })
                return clean;
            }
        }
    }
});

const Joi = BaseJoi.extend(extension);

module.exports.reviewSchema = new Joi.object({
    review: Joi.object({
        title: Joi.string().min(5).max(100).required().escapeHTML(),
        body: Joi.string().min(5).max(2000).required().escapeHTML(),
        rating: Joi.number().required().min(1).max(5),
        recommend: Joi.string().valid('true', 'false').required()
    }).required()
})

module.exports.newActivity = async (action, id, username, game, review, image) => {
    const activity = await new Activity({ action, user: { id, username }, game, review, image})
    await activity.save()
}
