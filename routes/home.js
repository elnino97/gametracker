const express = require('express');
const router = express.Router();
const passport = require('passport');
const LocalStrategy = require('passport-local');
const { isLoggedIn, loginRedirect } = require('../middleware');
const Game = require('../models/gameinfo')
const Review = require('../models/review');
const User = require('../models/user')
const Userdata = require('../models/userData')
const games = require('../games');
const { timeDifference } = require('../timeconvert');

router.get('/', async (req, res) => {
    res.render('app/home')
})

router.get('/explore', async (req, res) => {
    const favorites = await Game.find({}, {}, { sort: { favoritedTimes: 'desc' }, limit: 3 })
    res.render('app/explore', { favorites })
})

router.post('/explore', async (req, res) => {
    // const { name } = req.body;
    // const games = await getGames(name);
    res.render('app/results', { games })
})

router.get('/community', async (req, res) => {
    const reviews = await Review.find({}, {}, { sort: { 'created_at': 'desc'}, limit: 6 })
        .populate('game')
    const favorites = await Game.find({}, {}, { sort: { favoritedTimes: 'desc' }, limit: 6 })
    const userdata = await Userdata.find({}, {}, { sort: { actionCount: 'desc' }, limit: 3 })
    res.render('app/community', { reviews, favorites, userdata, timeDifference })
})

router.get('/register', (req, res) => {
    res.render('user/register')
})

router.post('/register', async (req, res) => {
    try {
        const image = "/img/profilepicture.jpg"
        const { email, username, password } = req.body;
        const user = new User({ email, username });
        const userdata = new Userdata({user: {id: user.id, username}, image})
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, async (err) => {
            if (err) return next(err);
            await userdata.save();
            req.flash('success', `Hey ${username}`);
            res.redirect('/');
        })
    } catch(e) {
        req.flash('error', e.message);
        res.redirect('register');
    }
})

router.get('/login', (req, res) => {
    res.render('user/login')
})

router.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    req.flash('success', 'Welcome back!');
    const redirectUrl = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
})

router.get('/logout', isLoggedIn, (req, res) => {
    req.logout();
    res.redirect('/');
})

module.exports = router;