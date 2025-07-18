const insert_menu_items = `
INSERT INTO menu_items (name, description, price, category_id, is_available)
VALUES (?, ?, ?, ?, ?)
`;

const insert_menu_item_cust_group = `
INSERT INTO menu_item_customization_groups (menu_item_id, name)
VALUES (?, ?)
`;

const insert_menu_item_cust_opt =`
INSERT INTO menu_item_customization_options (group_id, name, price_addition)   
VALUES (?, ?, ?)
`;

const update_menuitem_image = `
  UPDATE menu_items
  SET image_url = ?
  WHERE _id = ?
`;
const get_menuitem_by_id = `
  SELECT 
    mi._id AS menu_item_id,
    mi.name AS menu_item_name,
    mi.description AS menu_item_description,
    mi.price,
    mi.image_url,
    mi.is_available,
    mi.created_at AS menu_item_created_at,
    mi.updated_at AS menu_item_updated_at,

    c._id AS category_id,
    c.name AS category_name,
    c.description AS category_description,
    c.display_order AS category_display_order,
    c.thumbnail_url AS category_thumbnail_url,
    c.created_at AS category_created_at,
    c.updated_at AS category_updated_at,

    cg._id AS group_id,
    cg.name AS group_name,

    co._id AS option_id,
    co.name AS option_name,
    co.price_addition

  FROM menu_items mi
  JOIN categories c ON mi.category_id = c._id
  LEFT JOIN menu_item_customization_groups cg ON cg.menu_item_id = mi._id
  LEFT JOIN menu_item_customization_options co ON co.group_id = cg._id
  WHERE mi._id = ?
`;

const get_all_menuitems_with_category = `
  SELECT 
    mi._id AS menu_item_id,
    mi.name AS menu_item_name,
    mi.description AS menu_item_description,
    mi.price,
    mi.image_url,
    mi.is_available,
    mi.created_at AS menu_item_created_at,
    mi.updated_at AS menu_item_updated_at,

    c._id AS category_id,
    c.name AS category_name,
    c.description AS category_description,
    c.display_order,
    c.thumbnail_url,
    c.created_at AS category_created_at,
    c.updated_at AS category_updated_at

  FROM menu_items mi
  JOIN categories c ON mi.category_id = c._id
`;

const get_menuitems_by_category = `
  SELECT 
    mi._id AS menu_item_id,
    mi.name AS menu_item_name,
    mi.description AS menu_item_description,
    mi.price,
    mi.image_url,
    mi.is_available,
    mi.created_at AS menu_item_created_at,
    mi.updated_at AS menu_item_updated_at,

    c._id AS category_id,
    c.name AS category_name,
    c.description AS category_description,
    c.display_order,
    c.thumbnail_url,
    c.created_at AS category_created_at,
    c.updated_at AS category_updated_at

  FROM menu_items mi
  JOIN categories c ON mi.category_id = c._id
  WHERE c._id = ?
`;



export {insert_menu_items,insert_menu_item_cust_group,update_menuitem_image,insert_menu_item_cust_opt,get_menuitems_by_category,get_menuitem_by_id,get_all_menuitems_with_category}
