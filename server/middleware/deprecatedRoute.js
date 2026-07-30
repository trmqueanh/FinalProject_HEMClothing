const deprecatedRoute = replacementPath => (req, res, next) => {
  res.setHeader('Deprecation', 'true');
  res.setHeader('Link', `<${replacementPath}>; rel="successor-version"`);
  return next();
};

module.exports = deprecatedRoute;
