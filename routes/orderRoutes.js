import express from "express";
const router = express.Router()

import { authenticateUser } from "../middlewares/atuh.js";

import {
    getAllOrders,
    createOrder,
    getSingleOrder,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    getOrdersByTable,
    getOrdersByStatus
} from "../controllers/orderController.js"

router.route("/").get(getAllOrders).post(createOrder)
router.route("/:id").get(getSingleOrder).patch(updateOrder).delete(deleteOrder)
router.route("/:id/status").patch(authenticateUser, updateOrderStatus)
router.route("/table/:tableId").get(authenticateUser, getOrdersByTable)
router.route("/status/:status").get(authenticateUser, getOrdersByStatus)

export default router