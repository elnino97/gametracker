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
const Joi = require('joi');
const { reviewSchema } = require('./schemas.js')
const upload = multer({ storage });


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
const Userdata = require('./models/userData');
const { newActivity } = require('./schemaInstance');
const { isLoggedIn, loginRedirect } = require('./middleware');
const { timeDifference } = require('./timeconvert');

mongoose.connect('mongodb://localhost:27017/gametracker', {useNewUrlParser: true, useUnifiedTopology: true});

app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ extended: true }));

const validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error){
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    } else {
        next();
    }
}

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
    res.render('app/home')
})

app.get('/explore', async (req, res) => {
    const favorites = await Game.find({}, {}, { sort: { favoritedTimes: 'desc' }, limit: 3 })
    res.render('app/explore', { favorites })
})

app.post('/explore', async (req, res) => {
    // const { name } = req.body;
    // const games = await getGames(name);
    res.render('app/results', { games })
})

app.get('/community', async (req, res) => {
    const reviews = await Review.find({}, {}, { sort: { 'created_at': 'desc'}, limit: 6 })
        .populate('game')
    const favorites = await Game.find({}, {}, { sort: { favoritedTimes: 'desc' }, limit: 6 })
    const userdata = await Userdata.find({}, {}, { sort: { actionCount: 'desc' }, limit: 3 })
    res.render('app/community', { reviews, favorites, userdata, timeDifference })
})

app.get('/games/:id', loginRedirect, async (req, res) => {
    let favorites;
    const reviews = await Review.find({ gameId: req.params.id });
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
    const shortReviews = reviews.slice(0,3);
    const screenshots = games.results
        .filter(i => i.id === parseInt(req.params.id))
        .map(i => i.short_screenshots)
        .flat()
    res.render('app/game', { screenshots, gameDetails, shortReviews, favorites, myReview, averageScore, timeDifference });
})

app.get('/games/:id/review/new', isLoggedIn, async (req, res) => {
    const review = await Review.findOne({ gameId: req.params.id, authorId: req.user._id})
    if (review) {
        return res.redirect(`/games/${req.params.id}`)
    }
    res.render("review/new", { gameDetails })
})

app.post('/games/:id/reviews', validateReview, isLoggedIn, async (req, res) => {
    const { id } = req.params
    const userdata = await Userdata.findOne({'user.id': req.user._id});
    const checkReviews = await Review.findOne({gameId: id, authorId: req.user._id})
    if (checkReviews){
        return res.redirect(`/games/${id}`)
    }
    
    let game = await Game.findOne({ id });
    if (!game){
        const { name, background_image, released} = gameDetails;
        game = await new Game({ id, name, background_image, released });
        await game.save();
    }
    const review = new Review(req.body.review);
    review.author = { name: req.user.username, id: req.user._id }
    review.gameId = id;
    review.game = game._id;
    await review.save();

    const review1 = new Review(req.body.review);
    review1.author = { name: req.user.username, id: req.user._id }
    review1.gameId = id;
    review1.game = game._id;
    await review1.save();

    userdata.review.push(review.id)
    userdata.actionCount += 1;
    await userdata.save();
    newActivity("review", req.user._id, req.user.username, game._id, review._id, game.background_image);

    res.redirect(`/games/${id}/reviews`)
})

app.get('/games/:id/review/:reviewId', async (req, res) => {
    const review = await Review.findOne({ gameId: req.params.id, _id: req.params.reviewId });
    if (!review) {
        res.redirect(`/games/${req.params.id}`)
    }
    res.render('review/myreview', { gameDetails, review });
})

app.delete('/games/:id/reviews/:reviewId', isLoggedIn, async (req, res) => {
    const { id, reviewId } = req.params;
    const userdata = await Userdata.findOne({'user.id': req.user._id});
    await Review.findByIdAndDelete(reviewId);
    userdata.review.pull(reviewId)
    await userdata.save();
    res.redirect(`/games/${id}`)
})

app.get('/games/:id/review/edit', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const review = await Review.findOne({ gameId: id, 'author.id': req.user._id });
    if (!review) {
        res.redirect(`/games/${id}`)
    }
    res.render('review/edit', { gameDetails, review });
})

app.put('/games/:id/review', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    await Review.findOneAndUpdate({ gameId: id, 'author.id': req.user._id }, req.body.review);
    res.redirect(`/games/${id}`)
})

app.get('/games/:id/reviews', async (req, res) => {
    const { id } = req.params;
    const reviews = await Review.find({ gameId: id });
    res.render('review/allreviews', { reviews, gameDetails, timeDifference })
})

app.post('/games/:id/favorite', isLoggedIn, async (req, res) => {
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

app.put('/games/:id/favorite', isLoggedIn, async (req, res) => {
    const userdata = await Userdata.findOne({'user.id': req.user._id});
    if (!userdata.favorite.includes(parseInt(req.params.id))) {
        return res.redirect(`/games/${ req.params.id }`)
    } 
    const filteredFav = userdata.favorite.filter(item => item === req.params.id);
    userdata.favorite = filteredFav;
    userdata.actionCount -= 1;
    await userdata.save()
    req.flash('success', `Removed from favorites!`);
    res.redirect(`/games/${ req.params.id }`)
})

app.get('/register', (req, res) => {
    res.render('user/register')
})

app.post('/register', async (req, res) => {
    try {
        const image = "/img/profilepicture.jpg"
        const { email, username, password } = req.body;
        const user = new User({ email, username });
        const userdata = new Userdata({user: {id: user.id, username}, image})
        await userdata.save();
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
    res.render('user/login')
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
    const userdata = await Userdata.findOne({'user.id': req.user._id});
    const activities = await Activity.find({'user.id': req.user._id}, {}, { sort: { 'created_at': 'desc'}, limit: 6 })
        .populate('game')
        .populate('review')
    res.render('user/dashboard', { userdata, activities, timeDifference })
})

app.get('/account/games', isLoggedIn, async (req, res) => {
    const userdata = await Userdata.findOne({'user.id': req.user._id});
    let games = [];
    for (let game of userdata.favorite){
        const foundGame = await Game.findOne({ id: game })
        games.push(foundGame);
    }
    res.render('user/favorites', { games })
})

app.get('/account/myreviews', isLoggedIn, async (req, res) => {
    const reviews = await Review.find({ 'author.id': req.user._id })
        .populate('game');
    res.render('user/reviews', { reviews, timeDifference })
})

app.get('/account/settings', isLoggedIn, async (req, res) => {
    const userdata = await Userdata.findOne({'user.id': req.user._id});
    res.render('user/settings', { userdata })
})

app.post('/account/settings', isLoggedIn, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    await user.changePassword( oldPassword, newPassword );
    res.redirect('/account/settings')
})

app.put('/account/image', isLoggedIn, upload.single('image'), async (req, res) => {
    const userdata = await Userdata.findOne({'user.id': req.user._id});
    userdata.image = req.file.path;
    await userdata.save();
    res.redirect('/account/settings')
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