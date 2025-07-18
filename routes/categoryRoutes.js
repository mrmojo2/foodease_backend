import express from "express";
const router = express.Router()

import { authenticateUser } from "../middlewares/atuh.js";
import {
    getAllCategories,
    createCategory,
    getSingleCategory,
    updateCategory,
    deleteCategory,
    uploadCategoryImage
} from "../controllers/categoryController.js"

router.route("/").get(getAllCategories).post(authenticateUser, createCategory)
router.route("/:id").get(getSingleCategory).patch(authenticateUser, updateCategory).delete(authenticateUser, deleteCategory)
router.route("/image/:id").patch(uploadCategoryImage)
export default router