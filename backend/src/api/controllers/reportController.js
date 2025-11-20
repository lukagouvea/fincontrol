const Report = require('../../models/report');

exports.getMonthlyReport = async (req, res) => {
  const userId = req.user.id;
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ error: 'Mês e ano são obrigatórios.' });
  }

  try {
    const report = await Report.getMonthlyReport(userId, month, year);
    res.status(200).json(report);
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ error: 'Ocorreu um erro interno.' });
  }
};