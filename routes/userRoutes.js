import express from "express";
const router = express.Router()

import { getUser,updateProfile } from "../controllers/userController.js";
import { authenticateUser, authorizePermissions } from "../middlewares/atuh.js";

router.route('/:profileId').get(getUser).patch(authenticateUser,updateProfile)
export default router