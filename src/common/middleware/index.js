function noopMiddleware(req, res, next) {
  next();
}

module.exports = {
  noopMiddleware,
};
