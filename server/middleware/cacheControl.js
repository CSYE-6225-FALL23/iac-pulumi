// set cache policy
const setNoCachePolicy = async (req, res, next) => {
  res.set("Cache-Control", "no-cache");
  return next();
};

module.exports = {
  setNoCachePolicy,
};
