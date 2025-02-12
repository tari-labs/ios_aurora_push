function create_env(req, _res, next) {
    req.env = req.env || {};
    next();
}

module.exports = {
    create_env
};
