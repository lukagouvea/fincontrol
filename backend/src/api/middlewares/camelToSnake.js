
const _ = require('lodash');

const toSnakeCase = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(v => toSnakeCase(v));
  }
  if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((acc, key) => {
      acc[_.snakeCase(key)] = toSnakeCase(obj[key]);
      return acc;
    }, {});
  }
  return obj;
};

const camelToSnakeMiddleware = (req, res, next) => {
  if (req.body) {
    req.body = toSnakeCase(req.body);
  }
  next();
};

module.exports = camelToSnakeMiddleware;
