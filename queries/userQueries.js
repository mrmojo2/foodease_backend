const create_user = `
  INSERT INTO users (username, password, user_type)
  VALUES (?, ?, ?)
`;

const get_user_by_username = 'SELECT * FROM users WHERE username = ? LIMIT 1';
const get_user_by_id = 'SELECT * FROM users WHERE id = ?';

export {get_user_by_username,create_user,get_user_by_id}