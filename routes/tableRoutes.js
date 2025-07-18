import express from "express";
const router = express.Router()

import { authenticateUser } from "../middlewares/atuh.js";

import {
    getAllTables,
    createTable,
    getSingleTable,
    updateTable,
    deleteTable,
    updateTableStatus
} from "../controllers/tableController.js"

router.route("/").get(getAllTables).post(authenticateUser, createTable)
router.route("/:id").get(getSingleTable).patch(authenticateUser, updateTable).delete(authenticateUser, deleteTable)
router.route("/:id/status").patch(authenticateUser, updateTableStatus)

export default router