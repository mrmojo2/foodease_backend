const create_category = `
  INSERT INTO categories (name, description, display_order)
  VALUES (?, ?, ?)
`;
const get_category_by_name = 'SELECT * FROM categories WHERE name = ? LIMIT 1';
const get_category_by_id = 'SELECT * FROM categories WHERE _id = ?';
const get_all_categories = 'SELECT * FROM categories';
const update_category_thumbnail = `
  UPDATE categories
  SET thumbnail_url = ?
  WHERE _id = ?
`;
const update_category = `
  UPDATE categories
  SET name = ?, description = ?, display_order = ?
  WHERE _id = ?
`;

const delete_category_by_id = `
  DELETE FROM categories
  WHERE _id = ?
`;



export {create_category,get_category_by_name,get_category_by_id,get_all_categories,update_category_thumbnail,delete_category_by_id,update_category}
