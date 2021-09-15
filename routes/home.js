const express = require('express');
const router = express.Router();
const passport = require('passport');
const LocalStrategy = require('passport-local');
const { isLoggedIn } = require('../middleware');
const Game = require('../models/gameinfo')
const Review = require('../models/review');
const User = require('../models/user')
const Userdata = require('../models/userData')
const { timeDifference } = require('../utils/timeconvert');
const axios = require('axios');
const catchAsync = require('../utils/catchAsync');

async function getGames(name) {
    try {
      const response = await axios.get('https://api.rawg.io/api/games', { params: { search: name, key: process.env.RAWG_KEY}});
      return response;
    } catch (error) {
      console.error(error);
    }
  }

router.get('/', (req, res) => {
    res.render('app/home')
})

router.get('/explore', catchAsync(async (req, res) => {
    const favorites = await Game.find({}, {}, { sort: { favoritedTimes: 'desc' }, limit: 3 })
    res.render('app/explore', { favorites })
}))

router.post('/explore', catchAsync(async (req, res) => {
    const response = await getGames(req.body.name)
    res.render('app/results', { games: response.data.results })
}))

router.get('/community', catchAsync(async (req, res) => {
    const reviews = await Review.find({}, {}, { sort: { 'created_at': 'desc'}, limit: 6 })
        .populate('game')
    const favorites = await Game.find({}, {}, { sort: { favoritedTimes: 'desc' }, limit: 6 })
    const userdata = await Userdata.find({}, {}, { sort: { actionCount: 'desc' }, limit: 3 })
    res.render('app/community', { reviews, favorites, userdata, timeDifference })
}))

router.get('/register', (req, res) => {
    res.render('user/register')
})

router.post('/register', catchAsync(async (req, res) => {
    try {
        const { email, username, password } = req.body;
        if (!/(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/g.test(password)){
            req.flash('error', 'Incorrect password format')
            res.redirect('/register')
        }
        const user = new User({ email, username });
        const image = "/img/profilepicture.jpg"
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
}))

router.get('/login', (req, res) => {
    req.session.backURL=req.header('Referer') || '/';
    res.render('user/login')
})

router.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    req.flash('success', 'Welcome back!');
    const redirectUrl = req.session.backURL || '/';
    delete req.session.req.session.backURL;
    res.redirect(redirectUrl);
})

router.get('/logout', isLoggedIn, (req, res) => {
    const redirectURL = req.session.backURL=req.header('Referer') || '/';
    delete req.session.req.session.backURL;
    req.logout();
    res.redirect(redirectURL);
})

module.exports = router;