const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../../models/user'); // Importar o modelo de usuário

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  const [, token] = authHeader.split(' ');

  try {
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // Buscar o usuário no banco de dados com o ID do token
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado.' });
    }

    // Anexar o objeto de usuário completo à requisição
    req.user = user;

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido.' });
  }
};
