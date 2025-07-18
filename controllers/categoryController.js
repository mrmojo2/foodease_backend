import { StatusCodes } from "http-status-codes"
import HttpError from '../error/HttpError.js'
import pool from "../db/db.js"
import { v2 as cloudinary } from "cloudinary"
import fs from 'fs'
import { create_category, get_category_by_name,get_category_by_id,get_all_categories, update_category_thumbnail, delete_category_by_id, update_category } from "../queries/categoryQueries.js"

const getAllCategories = async (req, res) => {
    const [categories] = await pool.query(get_all_categories);
    res.status(StatusCodes.OK).json({ categories, count: categories.length })
}

const createCategory = async (req, res) => {
    const { name, description, display_order } = req.body

    if (!name) {
        throw new HttpError('Please provide category name', StatusCodes.BAD_REQUEST)
    }

    const [check] = await pool.query(get_category_by_name,[name])
    if (check.length != 0) {
        throw new HttpError('Category with this name already exists', StatusCodes.BAD_REQUEST)
    }

    const [created] = await pool.query(create_category,[name,description,display_order])
    const [rows] = await pool.query(get_category_by_id,[created.insertId]);
    console.log(rows[0])
    res.status(StatusCodes.CREATED).json({ category:rows[0] })
}

const uploadCategoryImage = async (req, res) => {
    const { id: categoryId } = req.params
    const image = req.files?.image

    if(!image){
        throw new HttpError("image not sent ",StatusCodes.BAD_REQUEST)
    }

    const [existingCategory] = await pool.query(get_category_by_id,[categoryId])
    if (existingCategory.length == 0) {
        throw new HttpError(`No menu item with id: ${categoryId}`, StatusCodes.NOT_FOUND)
    }

    let thumbnail_url;

    if (image) {
        // Validate image
        if (!image.mimetype.startsWith('image')) {
            throw new HttpError('Invalid file type', StatusCodes.BAD_REQUEST)
        }
        if (image.size > 10000000) { // 10MB limit
            throw new HttpError('Image too large', StatusCodes.BAD_REQUEST)
        }

        try {
            // Upload new image to Cloudinary
            const uploadedImage = await cloudinary.uploader.upload(image.tempFilePath, {
                use_filename: true,
                filename_override: image.name,
                folder: 'digital_menu/Categories'
            })

            // Remove temp file
            fs.unlink(image.tempFilePath, (err) => {
                if (err) console.log('Error removing temp file:', err)
            })

            // Add the new image URL to the update object
            thumbnail_url = uploadedImage.secure_url

            // Delete the old image from Cloudinary if it exists
            const default_url = 'https://res.cloudinary.com/ducxipxkt/image/upload/c_thumb,w_200,g_face/v1738131384/digital_menu/Categories/default.jpg'
            if (existingCategory.thumbnail_url && existingCategory.thumbnail_url != default_url) {
                try {
                    // Extract the public_id from the existing image URL
                    const urlParts = existingCategory.thumbnail_url.split('/')
                    const publicIdWithExtension = urlParts.slice(urlParts.indexOf('digital_menu')).join('/')
                    const publicId = publicIdWithExtension.split('.')[0] // Remove file extension

                    // Delete the image from Cloudinary
                    await cloudinary.uploader.destroy(publicId)
                } catch (error) {
                    console.log('Error deleting old image from Cloudinary:', error)
                    // Continue with the update even if deleting the old image fails
                }
            }
        } catch (error) {
            console.log(error)
            throw new HttpError('Error uploading image', StatusCodes.INTERNAL_SERVER_ERROR)
        }
    }

    await pool.query(update_category_thumbnail,[thumbnail_url,categoryId])
    const [rows] = await pool.query(get_category_by_id,[categoryId])

    res.status(StatusCodes.OK).json({ cat:rows[0] })
}

const getSingleCategory = async (req, res) => {
    const { id: categoryId } = req.params
    const [category] = await pool.query(get_category_by_id,[categoryId])
    console.log(category)
    if (category.length == 0) {
        throw new HttpError(`No category with id: ${categoryId}`, StatusCodes.NOT_FOUND)
    }
    res.status(StatusCodes.OK).json({ category:category[0] })
}

const updateCategory = async (req, res) => {
    const { id: categoryId } = req.params
    const { name, description, display_order } = req.body

    // if (name) {
    //     const categoryExists = await Category.findOne({ name, _id: { $ne: categoryId } })
    //     if (categoryExists) {
    //         throw new HttpError('Category with this name already exists', StatusCodes.BAD_REQUEST)
    //     }
    // }

    // const category = await Category.findOneAndUpdate(
    //     { _id: categoryId },
    //     { name, description, display_order },
    //     { new: true, runValidators: true }
    // )

    // if (!category) {
    //     throw new HttpError(`No category with id: ${categoryId}`, StatusCodes.NOT_FOUND)
    // }

    // res.status(StatusCodes.OK).json({ category })

    let [check] = await pool.query(get_category_by_id,[categoryId])
    if(check.length == 0){
        throw new HttpError('Category doesnt exist',StatusCodes.NOT_FOUND)
    }
    let update_object = {}
    update_object.name = name || check[0].name;
    update_object.description = description || check[0].description;
    update_object.display_order = display_order || check[0].display_order


    await pool.query(update_category,[update_object.name,update_object.description,update_object.display_order,categoryId])
    const [cat] = await pool.query(get_category_by_id,[categoryId])

    res.status(StatusCodes.OK).json({ category: cat[0] })
}

const deleteCategory = async (req, res) => {
    const { id: categoryId } = req.params
    await pool.query(delete_category_by_id,[categoryId])
    res.status(StatusCodes.OK).json({ msg: 'Category removed' })
}

export {
    getAllCategories,
    createCategory,
    getSingleCategory,
    updateCategory,
    deleteCategory,
    uploadCategoryImage
}