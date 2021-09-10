const express = require('express');
const router = express.Router();
const { isLoggedIn, loginRedirect } = require('../middleware');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage })
const Userdata = require('../models/userData');
const Activity = require('../models/activity');
const { timeDifference } = require('../timeconvert');
const Review = require('../models/review');
const User = require('../models/user')

router.get('/dashboard', isLoggedIn, async (req, res) => {
    const userdata = await Userdata.findOne({'user.id': req.user._id});
    const activities = await Activity.find({'user.id': req.user._id}, {}, { sort: { 'created_at': 'desc'}, limit: 6 })
        .populate('game')
        .populate('review')
    res.render('user/dashboard', { userdata, activities, timeDifference })
})

router.put('/dashboard', isLoggedIn, async (req, res) => {
    const userdata = await Userdata.findOne({'user.id': req.user._id});
    userdata.about = req.body.about;
    userdata.save();
    res.redirect('/account/dashboard')
})

router.get('/games', isLoggedIn, async (req, res) => {
    const userdata = await Userdata.findOne({'user.id': req.user._id});
    let games = [];
    for (let game of userdata.favorite){
        const foundGame = await Game.findOne({ id: game })
        games.push(foundGame);
    }
    res.render('user/favorites', { games })
})

router.get('/myreviews', isLoggedIn, async (req, res) => {
    const reviews = await Review.find({ 'author.id': req.user._id })
        .populate('game');
    res.render('user/reviews', { reviews, timeDifference })
})

router.get('/settings', isLoggedIn, async (req, res) => {
    const userdata = await Userdata.findOne({'user.id': req.user._id});
    res.render('user/settings', { userdata })
})

router.post('/settings', isLoggedIn, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    await user.changePassword( oldPassword, newPassword );
    res.redirect('/account/settings')
})

router.put('/image', isLoggedIn, upload.single('image'), async (req, res) => {
    const userdata = await Userdata.findOne({'user.id': req.user._id});
    userdata.image = req.file.path;
    await userdata.save();
    res.redirect('/account/settings')
})

module.exports = router;