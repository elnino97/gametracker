const Joi = require('joi');

module.exports.reviewSchema = new Joi.object({
    review: Joi.object({
        title: Joi.string().min(5).max(100).required(),
        body: Joi.string().min(5).max(2000).required(),
        rating: Joi.number().required().min(1).max(5),
        recommend: Joi.string().valid('true', 'false').required()
    }).required()
})