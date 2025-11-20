const User = require('../../models/user');
const jwt = require('jsonwebtoken');

exports.signup = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Por favor, preencha todos os campos.' });
  }

  try {
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
    }

    const user = await User.createUser(name, email, password);

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({ user, token });

  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ error: 'Ocorreu um erro interno. Tente novamente.' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Por favor, preencha e-mail e senha.' });
  }

  try {
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    }

    const passwordMatch = await User.comparePasswords(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    // Remove o hash da senha da resposta
    delete user.password_hash;

    res.status(200).json({ user, token });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Ocorreu um erro interno. Tente novamente.' });
  }
};
