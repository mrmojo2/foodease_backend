import { StatusCodes } from "http-status-codes";
import HttpError from "../error/HttpError.js";
import pool from "../db/db.js";

/* ----------------------------- helpers ----------------------------- */

const VALID_STATUSES = ['pending', 'preparing', 'served', 'complete', 'cancelled'];
const VALID_PAYMENT_METHODS = ['cash', 'online_payment'];
const VALID_PAYMENT_STATUS = ['pending', 'paid'];

function toOrderResponse(rows) {
    // rows = result of JOIN query that returns 1..N rows per order
    // We’ll group into 1 order object with nested items and customizations (like Mongoose populate)
    if (!rows.length) return null;

    const base = rows[0];

    const tableObj = base.table_id
        ? {
            _id: String(base.table_id),
            table_number: base.table_number,
            capacity: base.table_capacity,
            status: base.table_status,
            current_order: base.table_current_order_id ? String(base.table_current_order_id) : null,
            createdAt: base.table_created_at,
            updatedAt: base.table_updated_at,
            __v: 0,
        }
        : null;

    const itemsMap = new Map();

    for (const r of rows) {
        if (!r.order_item_id) continue;

        const key = String(r.order_item_id);
        if (!itemsMap.has(key)) {
            itemsMap.set(key, {
                // Mongoose shape: each item has `item` populated as MenuItem, plus qty/price/etc.
                item: r.menu_item_id
                    ? {
                        _id: String(r.menu_item_id),
                        name: r.menu_item_name,
                        description: r.menu_item_description,
                        price: parseFloat(r.menu_item_price),
                        image_url: r.menu_item_image_url,
                        is_available: !!r.menu_item_is_available,
                        // category isn't strictly needed for order, so we skip for brevity
                    }
                    : null,
                quantity: r.order_item_quantity,
                price: parseFloat(r.order_item_price),
                notes: r.order_item_notes || null,
                customizations: [],
            });
        }

        // push customization if present
        if (r.customization_id) {
            itemsMap.get(key).customizations.push({
                _id: String(r.customization_id),
                option_name: r.customization_option_name || '',
                selection: r.customization_selection || '',
                price_addition: r.customization_price_addition != null
                    ? parseFloat(r.customization_price_addition)
                    : 0,
            });
        }
    }

    const items = Array.from(itemsMap.values());

    return {
        _id: String(base.order_id),
        order_number: base.order_number,
        table: tableObj,
        items,
        status: base.order_status,
        total_amount: parseFloat(base.total_amount),
        payment_status: base.payment_status,
        payment_method: base.payment_method,
        createdAt: base.order_created_at,
        updatedAt: base.order_updated_at,
        __v: 0,
    };
}

async function fetchOrderById(orderId) {
    const [rows] = await pool.query(
        `
    SELECT
      o._id AS order_id,
      o.order_number,
      o.table_id,
      o.status AS order_status,
      o.total_amount,
      o.payment_status,
      o.payment_method,
      o.created_at AS order_created_at,
      o.updated_at AS order_updated_at,

      t._id AS table_id,
      t.table_number,
      t.capacity AS table_capacity,
      t.status AS table_status,
      t.current_order_id AS table_current_order_id,
      t.created_at AS table_created_at,
      t.updated_at AS table_updated_at,

      oi._id AS order_item_id,
      oi.quantity AS order_item_quantity,
      oi.price AS order_item_price,
      oi.notes AS order_item_notes,

      mi._id AS menu_item_id,
      mi.name AS menu_item_name,
      mi.description AS menu_item_description,
      mi.price AS menu_item_price,
      mi.image_url AS menu_item_image_url,
      mi.is_available AS menu_item_is_available,

      oic._id AS customization_id,
      oic.option_name AS customization_option_name,
      oic.selection AS customization_selection,
      oic.price_addition AS customization_price_addition

    FROM orders o
    LEFT JOIN tables t ON o.table_id = t._id
    LEFT JOIN order_items oi ON oi.order_id = o._id
    LEFT JOIN menu_items mi ON oi.menu_item_id = mi._id
    LEFT JOIN order_item_customizations oic ON oic.order_item_id = oi._id
    WHERE o._id = ?
    ORDER BY oi._id, oic._id
    `,
        [orderId]
    );

    return toOrderResponse(rows);
}

async function fetchOrders(whereSql = '', params = []) {
    const [rows] = await pool.query(
        `
    SELECT
      o._id AS order_id,
      o.order_number,
      o.table_id,
      o.status AS order_status,
      o.total_amount,
      o.payment_status,
      o.payment_method,
      o.created_at AS order_created_at,
      o.updated_at AS order_updated_at,

      t._id AS table_id,
      t.table_number,
      t.capacity AS table_capacity,
      t.status AS table_status,
      t.current_order_id AS table_current_order_id,
      t.created_at AS table_created_at,
      t.updated_at AS table_updated_at,

      oi._id AS order_item_id,
      oi.quantity AS order_item_quantity,
      oi.price AS order_item_price,
      oi.notes AS order_item_notes,

      mi._id AS menu_item_id,
      mi.name AS menu_item_name,
      mi.description AS menu_item_description,
      mi.price AS menu_item_price,
      mi.image_url AS menu_item_image_url,
      mi.is_available AS menu_item_is_available,

      oic._id AS customization_id,
      oic.option_name AS customization_option_name,
      oic.selection AS customization_selection,
      oic.price_addition AS customization_price_addition

    FROM orders o
    LEFT JOIN tables t ON o.table_id = t._id
    LEFT JOIN order_items oi ON oi.order_id = o._id
    LEFT JOIN menu_items mi ON oi.menu_item_id = mi._id
    LEFT JOIN order_item_customizations oic ON oic.order_item_id = oi._id
    ${whereSql}
    ORDER BY o._id, oi._id, oic._id
    `,
        params
    );

    // Group by order_id
    const byOrder = new Map();
    for (const row of rows) {
        if (!byOrder.has(row.order_id)) byOrder.set(row.order_id, []);
        byOrder.get(row.order_id).push(row);
    }

    const orders = [];
    for (const [, group] of byOrder) {
        orders.push(toOrderResponse(group));
    }
    return orders;
}

/* ----------------------------- controllers ----------------------------- */

const getAllOrders = async (req, res) => {
    const orders = await fetchOrders();
    res.status(StatusCodes.OK).json({ orders, count: orders.length });
};

const createOrder = async (req, res) => {
    const { table, items, total_amount, payment_method } = req.body;

    if (!table || !items || items.length === 0 || !total_amount) {
        throw new HttpError('Please provide all required values', StatusCodes.BAD_REQUEST);
    }

    // Validate items have price and normalize customizations
    for (const it of items) {
        if (!it.price || it.price <= 0) {
            throw new HttpError('Each item must have a valid price', StatusCodes.BAD_REQUEST);
        }
        if (it.customizations) {
            it.customizations = it.customizations.map(c => ({
                option_name: c.option_name || '',
                selection: c.selection || '',
                price_addition: c.price_addition || 0,
            }));
        }
    }

    // Validate table exists
    const [trows] = await pool.query('SELECT _id FROM tables WHERE _id = ?', [table]);
    if (trows.length === 0) {
        throw new HttpError('Invalid table', StatusCodes.BAD_REQUEST);
    }

    // Validate payment method or default
    const pm = payment_method && VALID_PAYMENT_METHODS.includes(payment_method)
        ? payment_method
        : 'cash';

    const conn = await pool.getConnection();
    let orderId;
    try {
        await conn.beginTransaction();

        const orderNumber = `ORD-${Date.now()}`;
        const [orderRes] = await conn.query(
            `
      INSERT INTO orders (order_number, table_id, status, total_amount, payment_status, payment_method)
      VALUES (?, ?, 'pending', ?, 'pending', ?)
      `,
            [orderNumber, table, total_amount, pm]
        );
        orderId = orderRes.insertId;

        // Insert items + customizations
        for (const it of items) {
            const [oiRes] = await conn.query(
                `
        INSERT INTO order_items (order_id, menu_item_id, quantity, price, notes)
        VALUES (?, ?, ?, ?, ?)
        `,
                [orderId, it.item, it.quantity, it.price, it.notes || null]
            );
            const orderItemId = oiRes.insertId;

            if (Array.isArray(it.customizations)) {
                for (const c of it.customizations) {
                    await conn.query(
                        `
            INSERT INTO order_item_customizations (order_item_id, option_name, selection, price_addition)
            VALUES (?, ?, ?, ?)
            `,
                        [orderItemId, c.option_name, c.selection, c.price_addition ?? 0]
                    );
                }
            }
        }

        // Mark table occupied + link current_order (if you added FK)
        await conn.query(
            `UPDATE tables SET status = 'occupied', current_order_id = ? WHERE _id = ?`,
            [orderId, table]
        );

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        conn.release();
        throw err;
    } finally {
        conn.release();
    }

    const order = await fetchOrderById(orderId);
    res.status(StatusCodes.CREATED).json({ order });
};

const getSingleOrder = async (req, res) => {
    const { id: orderId } = req.params;
    const order = await fetchOrderById(orderId);

    if (!order) {
        throw new HttpError(`No order with id: ${orderId}`, StatusCodes.NOT_FOUND);
    }

    res.status(StatusCodes.OK).json({ order });
};

const updateOrder = async (req, res) => {
    const { id: orderId } = req.params;
    const { items, total_amount, payment_status } = req.body;

    // Does order exist?
    const [exists] = await pool.query('SELECT _id, table_id FROM orders WHERE _id = ?', [orderId]);
    if (exists.length === 0) {
        throw new HttpError(`No order with id: ${orderId}`, StatusCodes.NOT_FOUND);
    }

    // Validate items if provided
    if (items) {
        for (const it of items) {
            if (!it.price || it.price <= 0) {
                throw new HttpError('Each item must have a valid price', StatusCodes.BAD_REQUEST);
            }
            if (it.customizations) {
                it.customizations = it.customizations.map(c => ({
                    option_name: c.option_name || '',
                    selection: c.selection || '',
                    price_addition: c.price_addition || 0,
                }));
            }
        }
    }

    if (payment_status && !VALID_PAYMENT_STATUS.includes(payment_status)) {
        throw new HttpError('Invalid payment status', StatusCodes.BAD_REQUEST);
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Update core fields
        await conn.query(
            `
      UPDATE orders
      SET
        total_amount = COALESCE(?, total_amount),
        payment_status = COALESCE(?, payment_status)
      WHERE _id = ?
      `,
            [
                total_amount ?? null,
                payment_status ?? null,
                orderId,
            ]
        );

        // If items provided: replace all items + customizations
        if (Array.isArray(items)) {
            // Delete old items (customizations cascade)
            await conn.query(`DELETE FROM order_items WHERE order_id = ?`, [orderId]);

            for (const it of items) {
                const [oiRes] = await conn.query(
                    `
          INSERT INTO order_items (order_id, menu_item_id, quantity, price, notes)
          VALUES (?, ?, ?, ?, ?)
          `,
                    [orderId, it.item, it.quantity, it.price, it.notes || null]
                );
                const orderItemId = oiRes.insertId;

                if (Array.isArray(it.customizations)) {
                    for (const c of it.customizations) {
                        await conn.query(
                            `
              INSERT INTO order_item_customizations (order_item_id, option_name, selection, price_addition)
              VALUES (?, ?, ?, ?)
              `,
                            [orderItemId, c.option_name, c.selection, c.price_addition ?? 0]
                        );
                    }
                }
            }
        }

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        conn.release();
        throw err;
    } finally {
        conn.release();
    }

    const order = await fetchOrderById(orderId);
    res.status(StatusCodes.OK).json({ order });
};

const deleteOrder = async (req, res) => {
    const { id: orderId } = req.params;

    // Find the table linked to this order
    const [rows] = await pool.query(`SELECT table_id FROM orders WHERE _id = ?`, [orderId]);
    if (rows.length === 0) {
        throw new HttpError(`No order with id: ${orderId}`, StatusCodes.NOT_FOUND);
    }
    const tableId = rows[0].table_id;

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Delete order (items + customizations cascade)
        const [del] = await conn.query(`DELETE FROM orders WHERE _id = ?`, [orderId]);
        if (del.affectedRows === 0) {
            throw new HttpError(`Failed to delete order ${orderId}`, StatusCodes.INTERNAL_SERVER_ERROR);
        }

        // Free table if it was pointing to this order
        await conn.query(
            `UPDATE tables SET status = 'available', current_order_id = NULL WHERE _id = ? AND current_order_id = ?`,
            [tableId, orderId]
        );

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        conn.release();
        throw err;
    } finally {
        conn.release();
    }

    res.status(StatusCodes.OK).json({ msg: 'Order removed' });
};

const updateOrderStatus = async (req, res) => {
    const { id: orderId } = req.params;
    const { status } = req.body;

    if (!status) {
        throw new HttpError('Please provide order status', StatusCodes.BAD_REQUEST);
    }
    if (!VALID_STATUSES.includes(status)) {
        throw new HttpError('Invalid order status', StatusCodes.BAD_REQUEST);
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Update status
        const [u] = await conn.query(
            `UPDATE orders SET status = ? WHERE _id = ?`,
            [status, orderId]
        );
        if (u.affectedRows === 0) {
            throw new HttpError(`No order with id: ${orderId}`, StatusCodes.NOT_FOUND);
        }

        // If complete → free table
        if (status === 'complete') {
            // find table
            const [r] = await conn.query(`SELECT table_id FROM orders WHERE _id = ?`, [orderId]);
            if (r.length) {
                const tableId = r[0].table_id;
                await conn.query(
                    `UPDATE tables SET status = 'available', current_order_id = NULL WHERE _id = ? AND current_order_id = ?`,
                    [tableId, orderId]
                );
            }
        }

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        conn.release();
        throw err;
    } finally {
        conn.release();
    }

    const order = await fetchOrderById(orderId);
    res.status(StatusCodes.OK).json({ order });
};

const getOrdersByTable = async (req, res) => {
    const { tableId } = req.params;
    const orders = await fetchOrders(`WHERE o.table_id = ?`, [tableId]);
    res.status(StatusCodes.OK).json({ orders, count: orders.length });
};

const getOrdersByStatus = async (req, res) => {
    const { status } = req.params;
    if (!VALID_STATUSES.includes(status)) {
        throw new HttpError('Invalid order status', StatusCodes.BAD_REQUEST);
    }
    const orders = await fetchOrders(`WHERE o.status = ?`, [status]);
    res.status(StatusCodes.OK).json({ orders, count: orders.length });
};

export {
    getAllOrders,
    createOrder,
    getSingleOrder,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    getOrdersByTable,
    getOrdersByStatus,
};
