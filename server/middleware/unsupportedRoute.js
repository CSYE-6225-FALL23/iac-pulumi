// Custom middleware to handle unsupported methods
const handleUnsupportedMethods = (req, res, next) => {
  const allowedMethods = ["POST", "PUT", "GET", "OPTIONS", "HEAD", "DELETE"];
  if (!allowedMethods.includes(req.method)) return res.status(405).send();
  return next();
};

module.exports = handleUnsupportedMethods;
