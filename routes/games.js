const express = require('express');
const router = express.Router();
const { isLoggedIn, loginRedirect } = require('../middleware');
const methodOverride = require('method-override');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });
const game = require('../games');
const Game = require('../models/gameinfo')
const Joi = require('joi');
const Review = require('../models/review');
const Userdata = require('../models/userData');
const gameDetails = require('../wolfenstein');
const { timeDifference } = require('../timeconvert');
const { newActivity } = require('../schemaInstance');
const { reviewSchema } = require('../schemas.js')

const validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error){
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    } else {
        next();
    }
}

router.get('/:id', loginRedirect, async (req, res) => {
    let favorites;
    const reviews = await Review.find({ gameId: req.params.id }, {}, { sort: { 'created_at': 'desc'}, limit: 3 });
    const game = await Game.findOne({ id: req.params.id });
    let myReview;
    if (req.user) {
        const userdata = await Userdata.findOne({'user.id': req.user._id});
        if (userdata.favorite.includes(parseInt(req.params.id))) {
            favorites = true;
        } 
        const findreview = await Review.findOne({ 'author.id': req.user._id })
        if (findreview) myReview = findreview._id;
    }
    let averageScore = 0;
    if (reviews.length){
        for (let review of reviews){
            averageScore += review.rating ;
        }
        averageScore = (Math.round(averageScore / reviews.length * 10) / 10).toFixed(1)
    }
    let screenshots;
    if (game && game.screenshots) screenshots = game.screenshots.reverse().slice(0, 9);
    res.render('app/game', { screenshots, gameDetails, reviews, favorites, myReview, averageScore, timeDifference });
})

router.get('/:id/review/new', isLoggedIn, async (req, res) => {
    const review = await Review.findOne({ gameId: req.params.id, authorId: req.user._id})
    if (review) {
        return res.redirect(`/games/${req.params.id}`)
    }
    res.render("review/new", { gameDetails })
})

router.post('/:id/reviews', isLoggedIn, upload.array('screenshot'), validateReview, async (req, res) => {
    const { id } = req.params
    const userdata = await Userdata.findOne({'user.id': req.user._id});
    const checkReviews = await Review.findOne({gameId: id, 'author.id': req.user._id})
    if (checkReviews){
        return res.redirect(`/games/${id}`)
    }
    
    let game = await Game.findOne({ id });
    if (!game){
        const { name, background_image, released} = gameDetails;
        game = await new Game({ id, name, background_image, released });
    }
    const review = new Review(req.body.review);
    const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
    review.screenshots = imgs;
    review.author = { name: req.user.username, id: req.user._id }
    review.gameId = id;
    review.game = game._id;
    await review.save();

    const review1 = new Review(req.body.review);
    review1.screenshots = req.files.map(f => ({ url: f.path, filename: f.filename }));
    review1.author = { name: req.user.username, id: req.user._id }
    review1.gameId = id;
    review1.game = game._id;
    await review1.save();

    userdata.review.push(review.id)
    userdata.actionCount += 1;
    await userdata.save();
    game.screenshots.push(...imgs)
    await game.save();
    newActivity("review", req.user._id, req.user.username, game._id, review._id, game.background_image);
    res.redirect(`/games/${id}/reviews`)
})

router.get('/:id/reviews/edit', isLoggedIn, async (req, res) => {
    const review = await Review.findOne({ gameId: req.params.id, 'author.id': req.user._id });
    if (!review) {
        res.redirect(`/games/${req.params.id}`)
    }
    res.render('review/edit', { gameDetails, review });
})

router.get('/:id/reviews/:reviewId', async (req, res) => {
    const review = await Review.findOne({ gameId: req.params.id, _id: req.params.reviewId });
    if (!review) {
        res.redirect(`/games/${req.params.id}`)
    }
    res.render('review/myreview', { gameDetails, review, timeDifference });
})

router.delete('/:id/reviews/:reviewId', isLoggedIn, async (req, res) => {
    const { id, reviewId } = req.params;
    const userdata = await Userdata.findOne({'user.id': req.user._id});
    await Review.findByIdAndDelete(reviewId);
    userdata.review.pull(reviewId)
    await userdata.save();
    res.redirect(`/games/${id}`)
})

router.put('/:id/review', validateReview, isLoggedIn, async (req, res) => {
    const { id } = req.params;
    await Review.findOneAndUpdate({ gameId: id, 'author.id': req.user._id }, req.body.review);
    res.redirect(`/games/${id}`)
})

router.get('/:id/reviews', async (req, res) => {
    const { id } = req.params;
    const reviews = await Review.find({ gameId: id }, {}, { sort: { 'created_at': 'desc'} });
    res.render('review/allreviews', { reviews, gameDetails, timeDifference })
})

router.post('/:id/favorite', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    //---------------------SAVE GAME ID TO USER SCHEMA FOR FURTHER USE
    const userdata = await Userdata.findOne({'user.id': req.user._id});
    if (userdata.favorite.includes(parseInt(id))) {
        return res.redirect(`/games/${ id }`)
    } 
    userdata.favorite.push(id);
    userdata.actionCount += 1;
    await userdata.save()
    //-------------------IF NO GAME DATA IN DB CREATE NEW INSTANCE, ELSE FETCH DATA
    let game = await Game.findOne({ id });
    if (!game){
        const { name, background_image, released} = gameDetails;
        game = await new Game({ id, name, background_image, released, favoritedTimes: 0 });
    }
    game.favoritedTimes += 1;
    await game.save();
    //------------------------------------------------
    newActivity("favorite", req.user._id, req.user.username, game._id, null, game.background_image);
    req.flash('success', `Added to favorites!`);
    res.redirect(`/games/${ id }`)
})

router.put('/:id/favorite', isLoggedIn, async (req, res) => {
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
})

module.exports = router;