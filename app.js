require('dotenv').config();

const express = require('express');
const ejsMate = require('ejs-mate');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');

// const fetch = require('node-fetch');

const app = express();

const Schema = mongoose.Schema;
const ExpressError = require('./utils/ExpressError');
const User = require('./models/user')
const games = require('./games');
const gameDetails = require('./wolfenstein');
const Activity = require('./models/activity');
const Game = require('./models/gameinfo')
const Review = require('./models/review');
const { newActivity } = require('./schemaInstance');
const { isLoggedIn, loginRedirect } = require('./middleware');

mongoose.connect('mongodb://localhost:27017/gametracker', {useNewUrlParser: true, useUnifiedTopology: true});

app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(methodOverride('_method'));
app.use(express.urlencoded({ extended: true }));
// app.use(express.static(path.join(__dirname, 'public')))

const secret = process.env.SECRET || 'thisshouldbeabettersecret!';

const sessionConfig = {
    name: 'session',
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        // secure: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}

app.use(session(sessionConfig));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

const apiKey = process.env.RAWG_KEY

// const getGames = async (name) => {
//     const response = await fetch(`https://api.rawg.io/api/games?key=${apiKey}&search=${name}`);
//     const gamesData = await response.json();
//     return gamesData
// }

app.get('/', async (req, res) => {
    res.render('home')
})

app.get('/games', (req, res) => {
    res.render('games')
})

app.post('/games', async (req, res) => {
    // const { name } = req.body;
    // const games = await getGames(name);
    res.render('searchResult', { games })
})

app.get('/games/:id', loginRedirect, async (req, res) => {
    let favorites;
    const { id } = req.params;
    const reviews = await Review.find({ gameId: id });
    if (req.user) {
        for (let i of req.user.favorite){
            if (i.id === parseInt(id)) {
                favorites = true;
            } 
        }
    }
    const shortReviews = reviews.slice(0,3);
    const screenshots = games.results
        .filter(i => i.id === parseInt(id))
        .map(i => i.short_screenshots)
        .flat()
    res.render('details', { screenshots, gameDetails, shortReviews, favorites });
})

app.get('/games/:id/reviews', async (req, res) => {
    const { id } = req.params;
    const reviews = await Review.find({ gameId: id });
    res.render('reviews', { reviews, gameDetails })
})

app.post('/games/:id/reviews', isLoggedIn, async (req, res) => {
    const { id } = req.params
    const review = new Review(req.body.review);
    review.authorId = req.user._id;
    review.author = req.user.username;
    review.gameId = id;
    review.date = Date.now();
    await review.save();
    
    let game = await Game.findOne({ id });
    if (!game){
        const { name, background_image, released} = gameDetails;
        game = await new Game({ id, name, background_image, released });
        await game.save();
    }
    newActivity("review", req.user._id, game._id);

    res.redirect(`/games/${id}/reviews`)
})

app.delete('/games/:id/reviews/:reviewId', isLoggedIn, async (req, res) => {
    const { id, reviewId } = req.params;
    await Review.findByIdAndDelete(reviewId);
    res.redirect(`/games/${id}`)
})

app.post('/games/:id/favorite', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    //---------------------SAVE GAME ID TO USER SCHEMA FOR FURTHER USE
    const user = await User.findById(req.user._id);
    for (let i of user.favorite){
        if (i.id === parseInt(id)) {
            return res.redirect(`/games/${ id }`)
        } 
    }
    const favoriteGame = { id, date: Date.now() }
    user.favorite.push(favoriteGame);
    await user.save()
    //-------------------IF NO GAME DATA IN DB CREATE NEW INSTANCE, ELSE FETCH DATA
    let game = await Game.findOne({ id });
    if (!game){
        const { name, background_image, released} = gameDetails;
        game = await new Game({ id, name, background_image, released });
        await game.save();
    }
    //------------------------------------------------
    newActivity("favorite", req.user._id, game._id);
    req.flash('success', `Added to favorites!`);
    res.redirect(`/games/${ id }`)
})

app.get('/register', (req, res) => {
    res.render('users/register')
})

app.post('/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const user = new User({ email, username });
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {
            if (err) return next(err);
            req.flash('success', `Hey ${username}`);
            res.redirect('/');
        })
    } catch(e) {
        req.flash('error', e.message);
        res.redirect('register');
    }
})

app.get('/login', (req, res) => {
    res.render('users/login')
})

app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    req.flash('success', 'Welcome back!');
    const redirectUrl = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
})

app.get('/logout', isLoggedIn, (req, res) => {
    req.logout();
    res.redirect('/');
})

app.get('/account/dashboard', isLoggedIn, async (req, res) => {
    console.log(req.user)
    res.render('users/account')
})

app.get('/account/games', isLoggedIn, async (req, res) => {
    let i = [];
    for (let game of req.user.favorite){
        const foundGame = await Game.find({ id: game.id })
        i.push(foundGame);
    }
    const games = i.flat()
    res.render('users/games', { games })
})

app.get('/account/myreviews', isLoggedIn, async (req, res) => {
    const reviews = await Review.find({ authorId: req.user._id })
    res.render('users/myReviews', { reviews })
})

app.get('/account/settings', isLoggedIn, async (req, res) => {
    res.render('users/settings')
})

app.post('/account/settings', isLoggedIn, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    await user.changePassword( oldPassword, newPassword );
    res.send('aight')
})

app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404))
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Oh No, Something Went Wrong!'
    res.status(statusCode).render('error', { err })
})

app.listen(3000, () => {
    console.log("Listening on port 3000")
})