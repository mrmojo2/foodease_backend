// Base SELECT with populated current_order (LEFT JOIN orders)
export const get_all_tables_with_current_order = `
  SELECT
    t._id            AS table_id,
    t.table_number   AS table_number,
    t.capacity       AS capacity,
    t.status         AS status,
    t.created_at     AS table_created_at,
    t.updated_at     AS table_updated_at,
    o._id            AS order_id,
    o.order_number   AS order_number,
    o.status         AS order_status,
    o.total_amount   AS order_total_amount,
    o.payment_status AS order_payment_status,
    o.payment_method AS order_payment_method,
    o.created_at     AS order_created_at,
    o.updated_at     AS order_updated_at
  FROM tables t
  LEFT JOIN orders o ON o._id = t.current_order_id
  ORDER BY t._id
`;

export const get_table_by_id_with_current_order = `
  SELECT
    t._id            AS table_id,
    t.table_number   AS table_number,
    t.capacity       AS capacity,
    t.status         AS status,
    t.created_at     AS table_created_at,
    t.updated_at     AS table_updated_at,
    o._id            AS order_id,
    o.order_number   AS order_number,
    o.status         AS order_status,
    o.total_amount   AS order_total_amount,
    o.payment_status AS order_payment_status,
    o.payment_method AS order_payment_method,
    o.created_at     AS order_created_at,
    o.updated_at     AS order_updated_at
  FROM tables t
  LEFT JOIN orders o ON o._id = t.current_order_id
  WHERE t._id = ?
  LIMIT 1
`;

export const get_table_by_number = `
  SELECT _id, table_number FROM tables WHERE table_number = ? LIMIT 1
`;

export const create_table = `
  INSERT INTO tables (table_number, capacity) VALUES (?, ?)
`;

export const update_table_core = `
  UPDATE tables
  SET
    table_number = COALESCE(?, table_number),
    capacity     = COALESCE(?, capacity)
  WHERE _id = ?
`;

export const delete_table_by_id = `
  DELETE FROM tables WHERE _id = ?
`;

export const update_table_status_and_current_order = `
  UPDATE tables
  SET status = ?, current_order_id = ?
  WHERE _id = ?
`;

// validate order exists (for updateTableStatus)
export const order_exists_by_id = `
  SELECT _id FROM orders WHERE _id = ? LIMIT 1
`;
