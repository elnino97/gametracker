const express = require('express');
const router = express.Router();
const { isLoggedIn, loginRedirect } = require('../middleware');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage })
const Userdata = require('../models/userData');
const Activity = require('../models/activity');
const Game = require('../models/gameinfo')
const { timeDifference } = require('../utils/timeconvert');
const Review = require('../models/review');
const User = require('../models/user')
const catchAsync = require('../utils/catchAsync');

router.get('/dashboard', isLoggedIn, catchAsync(async (req, res) => {
    const userdata = await Userdata.findOne({'user.id': req.user._id});
    const activities = await Activity.find({'user.id': req.user._id}, {}, { sort: { 'created_at': 'desc'}, limit: 6 })
        .populate('game')
        .populate('review')
    res.render('user/dashboard', { userdata, activities, timeDifference })
}))

router.put('/dashboard', isLoggedIn, catchAsync(async (req, res) => {
    await Userdata.findOneAndUpdate({'user.id': req.user._id}, { about: req.body.about });
    res.redirect('/account/dashboard')
}))

router.get('/games', isLoggedIn, catchAsync(async (req, res) => {
    const userdata = await Userdata.findOne({'user.id': req.user._id});
    const games = [];
    for (let game of userdata.favorite){
        const foundGame = await Game.findOne({ id: game })
        games.push(foundGame);
    }
    res.render('user/favorites', { games })
}))

router.get('/myreviews', isLoggedIn, catchAsync(async (req, res) => {
    const reviews = await Review.find({ 'author.id': req.user._id })
        .populate('game');
    res.render('user/reviews', { reviews, timeDifference })
}))

router.get('/settings', isLoggedIn, catchAsync(async (req, res) => {
    const userdata = await Userdata.findOne({'user.id': req.user._id});
    res.render('user/settings', { userdata })
}))

router.post('/settings', isLoggedIn, catchAsync(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    await user.changePassword( oldPassword, newPassword );
    res.redirect('/account/settings')
}))

router.put('/image', isLoggedIn, upload.single('image'), catchAsync(async (req, res) => {
    await Userdata.findOneAndUpdate({'user.id': req.user._id}, { image: req.file.path });
    res.redirect('/account/settings')
}))

module.exports = router;