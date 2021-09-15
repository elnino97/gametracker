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
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const { storage } = require('./cloudinary');
const { reviewSchema } = require('./schemas.js')
const upload = multer({ storage });
const games = require('./routes/games');
const homeRoutes = require('./routes/home')
const accountRoutes = require('./routes/account')


const app = express();
const ExpressError = require('./utils/ExpressError');
const User = require('./models/user')

mongoose.connect('mongodb://localhost:27017/playable', {useNewUrlParser: true, useUnifiedTopology: true});

app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());

const secret = process.env.SECRET;

const sessionConfig = {
    name: 'playablesession',
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
app.use(helmet());

app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [],
            connectSrc: ["'self'"],
            scriptSrc: ["'unsafe-inline'", "'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com/"],
            workerSrc: ["'self'", "blob:"],
            objectSrc: [],
            imgSrc: [
                "'self'",
                "blob:",
                "data:",
                "https://media.rawg.io/media/",
                "https://res.cloudinary.com/dkc9btnxn/",
            ],
            fontSrc: ["'self'", "https://fonts.gstatic.com/s/lato/v20/S6uyw4BMUTPHjx4wXg.woff2"],
        },
    })
);

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