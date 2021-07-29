require('dotenv').config();

const express = require('express');
const ejsMate = require('ejs-mate');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const session = require('express-session');
const methodOverride = require('method-override');

const Schema = mongoose.Schema;

// const fetch = require('node-fetch');

const app = express();

const ExpressError = require('./utils/ExpressError');
const User = require('./models/user')
const games = require('./games');
const gameDetails = require('./wolfenstein');
const Review = require('./models/review');
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

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
})

const apiKey = process.env.RAWG_KEY

// const getGames = async (name) => {
//     const response = await fetch(`https://api.rawg.io/api/games?key=${apiKey}&search=${name}`);
//     const gamesData = await response.json();
//     return gamesData
// }

app.get('/', (req, res) => {
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
    console.log(res.locals.currentUser)
    const { id } = req.params;
    const reviews = await Review.find({ gameId: id });
    const shortReviews = reviews.slice(0,3);
    const screenshots = games.results
        .filter(i => i.id === parseInt(id))
        .map(i => i.short_screenshots)
        .flat()
    res.render('details', { screenshots, gameDetails, shortReviews });
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
    await review.save();
    res.redirect(`/games/${id}/reviews`)
})

app.delete('/games/:id/reviews/:reviewId', isLoggedIn, async (req, res) => {
    const { id, reviewId } = req.params;
    await Review.findByIdAndDelete(reviewId);
    res.redirect(`/games/${id}`)
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
            res.redirect('/');
        })
    } catch {
        res.redirect('register');
    }
})

app.get('/login', (req, res) => {
    res.render('users/login')
})

app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), (req, res) => {
    const redirectUrl = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
})

app.get('/logout', isLoggedIn, (req, res) => {
    req.logout();
    res.redirect('/');
})

app.get('/account/dashboard', isLoggedIn, (req, res) => {
    res.render('users/account')
})

app.get('/account/myreviews', isLoggedIn, async (req, res) => {
    const reviews = await Review.find({ authorId: req.user._id })
    console.log(reviews)
    res.render('users/myReviews', { reviews })
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