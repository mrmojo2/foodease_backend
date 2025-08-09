// controllers/tableController.js
import { StatusCodes } from "http-status-codes";
import HttpError from "../error/HttpError.js";
import pool from "../db/db.js";
import {
    get_all_tables_with_current_order,
    get_table_by_id_with_current_order,
    get_table_by_number,
    create_table,
    update_table_core,
    delete_table_by_id,
    update_table_status_and_current_order,
    order_exists_by_id,
} from "../queries/tableQueries.js";

// helper: map a single SQL row to the response shape (table + populated current_order)
function rowToTable(row) {
    const current_order = row.order_id
        ? {
            _id: String(row.order_id),
            order_number: row.order_number,
            status: row.order_status,
            total_amount: parseFloat(row.order_total_amount),
            payment_status: row.order_payment_status,
            payment_method: row.order_payment_method,
            createdAt: row.order_created_at,
            updatedAt: row.order_updated_at,
            __v: 0,
        }
        : null;

    return {
        _id: String(row.table_id),
        table_number: row.table_number,
        capacity: row.capacity,
        status: row.status,
        current_order,
        createdAt: row.table_created_at,
        updatedAt: row.table_updated_at,
        __v: 0,
    };
}

const getAllTables = async (req, res) => {
    const [rows] = await pool.query(get_all_tables_with_current_order);
    const tables = rows.map(rowToTable);
    res.status(StatusCodes.OK).json({ tables, count: tables.length });
};

const createTable = async (req, res) => {
    const { table_number, capacity } = req.body;

    if (!table_number || !capacity) {
        throw new HttpError("Please provide table number and capacity", StatusCodes.BAD_REQUEST);
    }

    // unique check
    const [exists] = await pool.query(get_table_by_number, [table_number]);
    if (exists.length) {
        throw new HttpError("Table with this number already exists", StatusCodes.BAD_REQUEST);
    }

    const [ins] = await pool.query(create_table, [table_number, capacity]);
    const [rows] = await pool.query(get_table_by_id_with_current_order, [ins.insertId]);

    res.status(StatusCodes.CREATED).json({ table: rowToTable(rows[0]) });
};

const getSingleTable = async (req, res) => {
    const { id: tableId } = req.params;
    const [rows] = await pool.query(get_table_by_id_with_current_order, [tableId]);

    if (!rows.length) {
        throw new HttpError(`No table with id: ${tableId}`, StatusCodes.NOT_FOUND);
    }

    res.status(StatusCodes.OK).json({ table: rowToTable(rows[0]) });
};

const updateTable = async (req, res) => {
    const { id: tableId } = req.params;
    const { table_number, capacity } = req.body;

    // ensure exists
    const [existing] = await pool.query(get_table_by_id_with_current_order, [tableId]);
    if (!existing.length) {
        throw new HttpError(`No table with id: ${tableId}`, StatusCodes.NOT_FOUND);
    }

    // if changing table_number, keep it unique
    if (table_number) {
        const [dup] = await pool.query(get_table_by_number, [table_number]);
        if (dup.length && String(dup[0]._id) !== String(tableId)) {
            throw new HttpError("Table with this number already exists", StatusCodes.BAD_REQUEST);
        }
    }

    await pool.query(update_table_core, [
        table_number ?? null,
        capacity ?? null,
        tableId,
    ]);

    const [rows] = await pool.query(get_table_by_id_with_current_order, [tableId]);
    res.status(StatusCodes.OK).json({ table: rowToTable(rows[0]) });
};

const deleteTable = async (req, res) => {
    const { id: tableId } = req.params;

    // ensure exists
    const [existing] = await pool.query(get_table_by_id_with_current_order, [tableId]);
    if (!existing.length) {
        throw new HttpError(`No table with id: ${tableId}`, StatusCodes.NOT_FOUND);
    }

    const [del] = await pool.query(delete_table_by_id, [tableId]);
    if (del.affectedRows === 0) {
        throw new HttpError(`Failed to delete table ${tableId}`, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    res.status(StatusCodes.OK).json({ msg: "Table removed" });
};

const updateTableStatus = async (req, res) => {
    const { id: tableId } = req.params;
    const { status, current_order } = req.body; // current_order is order id, or null

    if (!status) {
        throw new HttpError("Please provide table status", StatusCodes.BAD_REQUEST);
    }

    // ensure table exists
    const [existing] = await pool.query(get_table_by_id_with_current_order, [tableId]);
    if (!existing.length) {
        throw new HttpError(`No table with id: ${tableId}`, StatusCodes.NOT_FOUND);
    }

    // if linking to an order, ensure the order exists
    if (current_order) {
        const [ok] = await pool.query(order_exists_by_id, [current_order]);
        if (!ok.length) {
            throw new HttpError("Invalid order id for current_order", StatusCodes.BAD_REQUEST);
        }
    }

    await pool.query(update_table_status_and_current_order, [
        status,
        current_order ?? null,
        tableId,
    ]);

    const [rows] = await pool.query(get_table_by_id_with_current_order, [tableId]);
    res.status(StatusCodes.OK).json({ table: rowToTable(rows[0]) });
};

export {
    getAllTables,
    createTable,
    getSingleTable,
    updateTable,
    deleteTable,
    updateTableStatus,
};
