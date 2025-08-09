// queries/statisticsQueries.js

// Total revenue since date (paid + complete)
export const q_total_revenue_since = `
  SELECT COALESCE(SUM(total_amount), 0) AS total
  FROM orders
  WHERE status = 'complete'
    AND payment_status = 'paid'
    AND created_at >= ?
`;

// Total revenue between dates
export const q_total_revenue_between = `
  SELECT COALESCE(SUM(total_amount), 0) AS total
  FROM orders
  WHERE status = 'complete'
    AND payment_status = 'paid'
    AND created_at >= ? AND created_at < ?
`;

// Total orders since (served or complete)
export const q_total_orders_since = `
  SELECT COUNT(*) AS count
  FROM orders
  WHERE created_at >= ?
    AND status IN ('complete','served')
`;

// Total orders between (served or complete)
export const q_total_orders_between = `
  SELECT COUNT(*) AS count
  FROM orders
  WHERE created_at >= ? AND created_at < ?
    AND status IN ('complete','served')
`;

// Active tables = distinct tables with non-finished orders
export const q_active_tables_count = `
  SELECT COUNT(DISTINCT table_id) AS active_tables
  FROM orders
  WHERE status IN ('pending','preparing','served')
`;

// Daily revenue since date (7 days caller-side)
export const q_daily_revenue_since = `
  SELECT DATE(created_at) AS date, COALESCE(SUM(total_amount),0) AS revenue
  FROM orders
  WHERE status = 'complete'
    AND payment_status = 'paid'
    AND created_at >= ?
  GROUP BY DATE(created_at)
  ORDER BY DATE(created_at)
`;

// Weekly revenue since date (ISO week)
export const q_weekly_revenue_since = `
  SELECT
    YEARWEEK(created_at, 1) AS yw,
    YEAR(created_at) AS year,
    WEEK(created_at, 1) AS week_number,
    MIN(DATE(created_at)) AS week_start,
    COALESCE(SUM(total_amount),0) AS revenue
  FROM orders
  WHERE status = 'complete'
    AND payment_status = 'paid'
    AND created_at >= ?
  GROUP BY YEARWEEK(created_at, 1)
  ORDER BY YEARWEEK(created_at, 1)
`;

// Monthly revenue since date (12 months caller-side)
export const q_monthly_revenue_since = `
  SELECT
    YEAR(created_at) AS year,
    MONTH(created_at) AS month,
    COALESCE(SUM(total_amount),0) AS revenue
  FROM orders
  WHERE status = 'complete'
    AND payment_status = 'paid'
    AND created_at >= ?
  GROUP BY YEAR(created_at), MONTH(created_at)
  ORDER BY YEAR(created_at), MONTH(created_at)
`;

// Top 5 most sold items in last 30 days (served/complete)
export const q_top_items_30d = `
  SELECT
    mi._id AS menu_item_id,
    mi.name AS menu_item_name,
    c.name  AS category_name,
    SUM(oi.quantity) AS total_qty,
    SUM(oi.quantity * oi.price) AS total_rev
  FROM orders o
  JOIN order_items oi ON oi.order_id = o._id
  JOIN menu_items mi ON mi._id = oi.menu_item_id
  LEFT JOIN categories c ON c._id = mi.category_id
  WHERE o.created_at >= ?
    AND o.status IN ('complete','served')
  GROUP BY mi._id, mi.name, c.name
  ORDER BY total_qty DESC
  LIMIT 5
`;

// Revenue by category in last 30 days
export const q_revenue_by_category_30d = `
  SELECT
    c._id AS category_id,
    c.name AS category_name,
    SUM(oi.quantity * oi.price) AS revenue
  FROM orders o
  JOIN order_items oi ON oi.order_id = o._id
  JOIN menu_items mi ON mi._id = oi.menu_item_id
  JOIN categories c ON c._id = mi.category_id
  WHERE o.created_at >= ?
    AND o.status = 'complete'
    AND o.payment_status = 'paid'
  GROUP BY c._id, c.name
  ORDER BY revenue DESC
`;

// Current year revenue since a date (usually Jan 1)
export const q_year_revenue_from = `
  SELECT COALESCE(SUM(total_amount), 0) AS total
  FROM orders
  WHERE status = 'complete'
    AND payment_status = 'paid'
    AND created_at >= ?
`;

// Status distribution last 30 days
export const q_status_distribution_30d = `
  SELECT status, COUNT(*) AS count
  FROM orders
  WHERE created_at >= ?
  GROUP BY status
`;

// Payment method distribution (paid only) last 30 days
export const q_payment_method_distribution_30d = `
  SELECT payment_method, COUNT(*) AS count, SUM(total_amount) AS total
  FROM orders
  WHERE created_at >= ?
    AND payment_status = 'paid'
  GROUP BY payment_method
`;

// Hourly distribution last 30 days
export const q_hourly_distribution_30d = `
  SELECT HOUR(created_at) AS hr,
         COUNT(*) AS count,
         SUM(total_amount) AS revenue
  FROM orders
  WHERE created_at >= ?
  GROUP BY HOUR(created_at)
  ORDER BY hr
`;
