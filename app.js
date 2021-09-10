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
const multer = require('multer');
const { storage } = require('./cloudinary');
const { reviewSchema } = require('./schemas.js')
const upload = multer({ storage });
const games = require('./routes/games');
const homeRoutes = require('./routes/home')
const accountRoutes = require('./routes/account')


// const fetch = require('node-fetch');

const app = express();
const ExpressError = require('./utils/ExpressError');
const User = require('./models/user')

mongoose.connect('mongodb://localhost:27017/gametracker', {useNewUrlParser: true, useUnifiedTopology: true});

app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ extended: true }));

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

app.use('/', homeRoutes)
app.use('/games', games)
app.use('/account', accountRoutes)

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