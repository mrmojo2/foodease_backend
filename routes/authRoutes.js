import express from "express";
const router = express.Router()

import { login, register,logout, getLoginUser } from "../controllers/authController.js";
import { authenticateUser, authorizePermissions } from "../middlewares/atuh.js";

router.route('/login').post(login)
router.route('/register').post(register)
router.route('/logout').get(logout)
router.route('/me').get(authenticateUser,getLoginUser)

export default router