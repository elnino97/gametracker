const express = require('express');
const router = express.Router();
const { isLoggedIn, loginRedirect } = require('../middleware');
const methodOverride = require('method-override');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });
const Game = require('../models/gameinfo')
const Joi = require('joi');
const Review = require('../models/review');
const Userdata = require('../models/userData');
const gameDetails = require('../wolfenstein');
const { timeDifference } = require('../timeconvert');
const { newActivity } = require('../schemaInstance');
const { reviewSchema } = require('../schemas.js')
const axios = require('axios');
const catchAsync = require('../utils/catchAsync');
const ExpressError = require('../utils/ExpressError');

async function getGame(id) {
    try {
      const response = await axios.get(`https://api.rawg.io/api/games/${id}`, { params: { key: process.env.RAWG_KEY}});
      return response;
    } catch (error) {
        throw new ExpressError(error.response.statusText, error.response.status)
    }
  }
const validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error){
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    } else {
        next();
    }
}

router.get('/:id', catchAsync(async (req, res) => {
    const response = await getGame(req.params.id);
    const game = await Game.findOne({ id: req.params.id });
    const reviews = await Review.find({ gameId: req.params.id }, {}, { sort: { 'created_at': 'desc'}});
    let favorites = false;
    let findMyReview = [];
    let screenshots;
    if (req.user) {
        const userdata = await Userdata.findOne({'user.id': req.user._id});
        favorites = userdata.favorite.includes(parseInt(req.params.id));
        findMyReview = reviews.filter(item => String(item.author.id) === String(req.user._id));
    }
    const averageScore = (Math.round(reviews.reduce((acc, current) => acc + current.rating, 0) / reviews.length * 10) / 10).toFixed(1);
    if (game && game.screenshots) screenshots = game.screenshots.reverse().slice(0, 9);
    res.render('app/game', { screenshots, game: response.data, reviews: reviews.slice(0, 3), favorites, findMyReview, averageScore, timeDifference });
}))

router.get('/:id/review/new', isLoggedIn, catchAsync(async (req, res) => {
    const review = await Review.findOne({ gameId: req.params.id, authorId: req.user._id})
    if (review) {
        return res.redirect(`/games/${req.params.id}`)
    }
    res.render("review/new", { id: req.params.id })
}))

router.post('/:id/reviews', isLoggedIn, upload.array('screenshot'), validateReview, catchAsync(async (req, res) => {
    const { id } = req.params
    const userdata = await Userdata.findOne({'user.id': req.user._id});
    const checkReview = await Review.findOne({gameId: id, 'author.id': req.user._id})
    if (checkReview){
        return res.redirect(`/games/${id}`)
    }
    let game = await Game.findOne({ id });
    if (!game){
        const response = await getGame(req.params.id)
        const { name, background_image, released} = response.data;
        game = await new Game({ id, name, background_image, released, favoritedTimes: 0 });
    }
    const review = new Review(req.body.review);
    const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
    review.screenshots = imgs;
    review.author = { name: req.user.username, id: req.user._id }
    review.gameId = id;
    review.game = game._id;
    userdata.review.push(review.id)
    userdata.actionCount += 1;
    game.screenshots.push(...imgs)
    await review.save();
    await userdata.save();
    await game.save();
    newActivity("review", req.user._id, req.user.username, game._id, review._id, game.background_image);
    res.redirect(`/games/${id}/reviews`)
}))

router.get('/:id/reviews/edit', isLoggedIn, catchAsync(async (req, res) => {
    const review = await Review.findOne({ gameId: req.params.id, 'author.id': req.user._id });
    if (!review) {
        return res.redirect(`/games/${req.params.id}`)
    }
    res.render('review/edit', { id: req.params.id, review });
}))

router.get('/:id/reviews/:reviewId', catchAsync(async (req, res) => {
    const review = await Review.findOne({ gameId: req.params.id, _id: req.params.reviewId });
    if (!review) {
        return res.redirect(`/games/${req.params.id}`)
    }
    res.render('review/myreview', { gameDetails, review, timeDifference });
}))

router.delete('/:id/reviews/:reviewId', isLoggedIn, catchAsync(async (req, res) => {
    const { id, reviewId } = req.params;
    const userdata = await Userdata.findOne({'user.id': req.user._id});
    await Review.findByIdAndDelete(reviewId);
    userdata.review.pull(reviewId)
    await userdata.save();
    res.redirect(`/games/${id}`)
}))

router.put('/:id/review', validateReview, isLoggedIn, catchAsync(async (req, res) => {
    await Review.findOneAndUpdate({ gameId: req.params.id, 'author.id': req.user._id }, req.body.review);
    res.redirect(`/games/${req.params.id}`)
}))

router.get('/:id/reviews', catchAsync(async (req, res) => {
    const reviews = await Review.find({ gameId: req.params.id }, {}, { sort: { 'created_at': 'desc'} });
    res.render('review/allreviews', { reviews, timeDifference })
}))

router.post('/:id/favorite', isLoggedIn, catchAsync(async (req, res) => {
    const { id } = req.params;
    const userdata = await Userdata.findOne({'user.id': req.user._id});
    if (userdata.favorite.includes(parseInt(id))) {
        return res.redirect(`/games/${ id }`)
    } 
    userdata.favorite.push(id);
    userdata.actionCount += 1;
    let game = await Game.findOne({ id });
    if (!game){
        const response = await getGame(req.params.id)
        const { name, background_image, released} = response.data;
        game = await new Game({ id, name, background_image, released, favoritedTimes: 0 });
    }
    game.favoritedTimes += 1;
    await userdata.save()
    await game.save();
    newActivity("favorite", req.user._id, req.user.username, game._id, null, game.background_image);
    req.flash('success', `Added to favorites!`);
    res.redirect(`/games/${ id }`)
}))

router.put('/:id/favorite', isLoggedIn, catchAsync(async (req, res) => {
    const userdata = await Userdata.findOne({'user.id': req.user._id});
    if (!userdata.favorite.includes(parseInt(req.params.id))) {
        return res.redirect(`/games/${ req.params.id }`)
    } 
    const filteredFav = userdata.favorite.filter(item => item === req.params.id);
    userdata.favorite = filteredFav;
    userdata.actionCount -= 1;
    await userdata.save()
    const game = await Game.findOne({ id: req.params.id });
    newActivity("unfavorite", req.user._id, req.user.username, game._id, null, game.background_image);
    req.flash('success', `Removed from favorites!`);
    res.redirect(`/games/${ req.params.id }`)
}))

module.exports = router;