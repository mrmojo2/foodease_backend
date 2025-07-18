import Table from "../models/Table.js"
import { StatusCodes } from "http-status-codes"
import HttpError from '../error/HttpError.js'

const getAllTables = async (req, res) => {
    const tables = await Table.find({}).populate('current_order')
    res.status(StatusCodes.OK).json({ tables, count: tables.length })
}

const createTable = async (req, res) => {
    const { table_number, capacity } = req.body

    if (!table_number || !capacity) {
        throw new HttpError('Please provide table number and capacity', StatusCodes.BAD_REQUEST)
    }

    const tableExists = await Table.findOne({ table_number })
    if (tableExists) {
        throw new HttpError('Table with this number already exists', StatusCodes.BAD_REQUEST)
    }

    const table = await Table.create({
        table_number,
        capacity
    })

    res.status(StatusCodes.CREATED).json({ table })
}

const getSingleTable = async (req, res) => {
    const { id: tableId } = req.params
    const table = await Table.findOne({ _id: tableId }).populate('current_order')

    if (!table) {
        throw new HttpError(`No table with id: ${tableId}`, StatusCodes.NOT_FOUND)
    }

    res.status(StatusCodes.OK).json({ table })
}

const updateTable = async (req, res) => {
    const { id: tableId } = req.params
    const { table_number, capacity } = req.body


    const table = await Table.findOneAndUpdate(
        { _id: tableId },
        { table_number, capacity },
        { new: true, runValidators: true }
    )

    if (!table) {
        throw new HttpError(`No table with id: ${tableId}`, StatusCodes.NOT_FOUND)
    }

    res.status(StatusCodes.OK).json({ table })
}

const deleteTable = async (req, res) => {
    const { id: tableId } = req.params
    const table = await Table.findOneAndDelete({ _id: tableId })

    if (!table) {
        throw new HttpError(`No table with id: ${tableId}`, StatusCodes.NOT_FOUND)
    }

    res.status(StatusCodes.OK).json({ msg: 'Table removed' })
}

const updateTableStatus = async (req, res) => {
    const { id: tableId } = req.params
    const { status, current_order } = req.body

    if (!status) {
        throw new HttpError('Please provide table status', StatusCodes.BAD_REQUEST)
    }

    const table = await Table.findOneAndUpdate(
        { _id: tableId },
        { status, current_order },
        { new: true, runValidators: true }
    )

    if (!table) {
        throw new HttpError(`No table with id: ${tableId}`, StatusCodes.NOT_FOUND)
    }

    res.status(StatusCodes.OK).json({ table })
}

export {
    getAllTables,
    createTable,
    getSingleTable,
    updateTable,
    deleteTable,
    updateTableStatus
}