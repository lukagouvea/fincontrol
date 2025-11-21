
const db = require('../config/db');

const Category = {
  // Altera para buscar categorias por usuário
  getAllByUserId: async (userId) => {
    const { rows } = await db.query('SELECT * FROM categories WHERE user_id = $1 ORDER BY name', [userId]);
    return rows;
  },

  getById: async (id, userId) => {
    const { rows } = await db.query('SELECT * FROM categories WHERE id = $1 AND user_id = $2', [id, userId]);
    return rows[0];
  },

  // Altera para criar categoria associada a um usuário
  create: async (categoryData, userId) => {
    const { name, color } = categoryData;
    const { rows } = await db.query(
      'INSERT INTO categories (name, color, user_id) VALUES ($1, $2, $3) RETURNING *',
      [name, color, userId]
    );
    return rows[0];
  },

  update: async (id, userId, categoryData) => {
    const fields = [];
    const values = [];
    let fieldIndex = 1;

    // Mapeia as chaves do objeto para os nomes das colunas do banco de dados
    const fieldMapping = {
        name: 'name',
        color: 'color'
    };

    // Constrói a lista de campos a serem atualizados
    for (const [key, value] of Object.entries(categoryData)) {
        if (fieldMapping[key] !== undefined && value !== undefined) {
            fields.push(`${fieldMapping[key]} = $${fieldIndex++}`);
            values.push(value);
        }
    }

    // Se nenhum campo foi fornecido para atualização, retorna a categoria atual
    if (fields.length === 0) {
      const { rows } = await db.query('SELECT * FROM categories WHERE id = $1 AND user_id = $2', [id, userId]);
      return rows[0];
    }
    
    values.push(id, userId);

    const query = `
      UPDATE categories 
      SET ${fields.join(', ')} 
      WHERE id = $${fieldIndex++} AND user_id = $${fieldIndex}
      RETURNING *;
    `;
    
    const { rows } = await db.query(query, values);
    return rows[0];
  },

  // Garante que a exclusão só afete as categorias do usuário
  delete: async (id, userId) => {
    // Opcional: Verificar se a categoria pertence ao usuário antes de deletar
    const { rowCount } = await db.query('DELETE FROM categories WHERE id = $1 AND user_id = $2', [id, userId]);
    return rowCount; // Retorna o número de linhas deletadas (0 ou 1)
  }
};

module.exports = Category;
