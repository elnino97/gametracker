module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()){
        res.redirect('/login')
    }
    next();
}

module.exports.loginRedirect = (req, res, next) => {
    req.session.returnTo = req.originalUrl;
    next();
}