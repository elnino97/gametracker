module.exports.isLoggedIn = (req, res, next) => {
    console.log("REEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE")
    if (!req.isAuthenticated()){
        return res.redirect('/login')
    }
    next();
}

module.exports.loginRedirect = (req, res, next) => {
    req.session.returnTo = req.originalUrl;
    next();
}