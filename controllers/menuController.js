import { StatusCodes } from "http-status-codes"
import HttpError from '../error/HttpError.js'
import { v2 as cloudinary } from "cloudinary"
import pool from "../db/db.js"
import fs from 'fs'
import { get_category_by_id } from "../queries/categoryQueries.js"
import { get_menuitem_by_id, insert_menu_item_cust_group, insert_menu_item_cust_opt,get_menuitems_by_category, insert_menu_items,get_all_menuitems_with_category,update_menuitem_image } from "../queries/menuitemQueries.js"

const getAllMenuItems = async (req, res) => {
    const [rows] = await pool.query(get_all_menuitems_with_category);

    // Nest each menu item with its category
    const menuItems = rows.map(row => ({
        _id: row.menu_item_id.toString(),
        name: row.menu_item_name,
        description: row.menu_item_description,
        price: parseFloat(row.price),
        image_url: row.image_url,
        is_available: !!row.is_available,
        createdAt: row.menu_item_created_at,
        updatedAt: row.menu_item_updated_at,
        __v: 0,
        category: {
            _id: row.category_id.toString(),
            name: row.category_name,
            description: row.category_description,
            display_order: row.display_order,
            thumbnail_url: row.thumbnail_url,
            createdAt: row.category_created_at,
            updatedAt: row.category_updated_at,
            __v: 0
        }
    }));

    res.status(StatusCodes.OK).json({ menuItems, count: menuItems.length });
};


const createMenuItem = async (req, res) => {
    const { name, description, price, category, customization_options,is_available } = req.body

    if (!name || !description || !price || !category) {
        throw new HttpError('Please provide all required values', StatusCodes.BAD_REQUEST)
    }

    const [categoryCheck] = await pool.query('SELECT _id FROM categories WHERE _id = ?',[category]);
    if (categoryCheck.length === 0) {
        throw new HttpError('Invalid category', StatusCodes.BAD_REQUEST)
    }

    //insert into menu_items
    const [menuItemResult] = await pool.query(insert_menu_items, [name, description, price, category, is_available])
    const menuItemId = menuItemResult.insertId;


    // insert customization groups and options
    if (Array.isArray(customization_options)) {
        for (const group of customization_options) {
            const [groupResult] = await pool.query(insert_menu_item_cust_group, [menuItemId, group.name])
            const groupId = groupResult.insertId;

            if (Array.isArray(group.options)) {
                for (const option of group.options) {
                    await pool.query(insert_menu_item_cust_opt, [groupId, option.name, option.price_addition || 0])
                }
            }
        }
    }

    res.status(StatusCodes.CREATED).json({
        menuItem: {
            _id: menuItemId,
            name,
            description,
            price,
            category,
            customization_options,
            is_available,
        }
    });
}

const uploadMenuImage = async (req, res) => {
    const { id: menuId } = req.params
    const image = req.files?.image

    if(!image){
        throw new HttpError("image not sent ",StatusCodes.BAD_REQUEST)
    }

    const [existingMenu] = await pool.query('SELECT _id FROM menu_items WHERE _id = ?',[menuId])
    if (existingMenu.length == 0) {
        throw new HttpError(`No menu item with id: ${menuId}`, StatusCodes.NOT_FOUND)
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
                folder: 'digital_menu/MenuItems'
            })

            // Remove temp file
            fs.unlink(image.tempFilePath, (err) => {
                if (err) console.log('Error removing temp file:', err)
            })

            // Add the new image URL to the update object
            thumbnail_url = uploadedImage.secure_url

            // Delete the old image from Cloudinary if it exists
            const default_url = 'https://res.cloudinary.com/ducxipxkt/image/upload/c_thumb,w_200,g_face/v1738131384/digital_menu/Categories/default.jpg'
            if (existingMenu.image_url && existingMenu.image_url != default_url) {
                try {
                    // Extract the public_id from the existing image URL
                    const urlParts = existingMenu.image_url.split('/')
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

    await pool.query(update_menuitem_image,[thumbnail_url,menuId])
    const [rows] = await pool.query('SELECT * FROM menu_items WHERE _id = ?',[menuId])

    res.status(StatusCodes.OK).json({ menuItem: rows[0] })
}

const getSingleMenuItem = async (req, res) => {
    const { id: menuItemId } = req.params;
    const [rows] = await pool.query(get_menuitem_by_id, [menuItemId]);

    if (rows.length === 0) {
        throw new HttpError(`No menu item with id: ${menuItemId}`, StatusCodes.NOT_FOUND);
    }

    const first = rows[0];

    // Construct category object
    const category = {
        _id: first.category_id.toString(),
        name: first.category_name,
        description: first.category_description,
        display_order: first.category_display_order,
        thumbnail_url: first.category_thumbnail_url,
        createdAt: first.category_created_at,
        updatedAt: first.category_updated_at,
        __v: 0
    };

    // Group customization options
    const groupMap = new Map();

    for (const row of rows) {
        if (!row.group_id) continue;

        const groupId = row.group_id.toString();
        if (!groupMap.has(groupId)) {
            groupMap.set(groupId, {
                _id: groupId,
                name: row.group_name,
                options: []
            });
        }

        if (row.option_id) {
            groupMap.get(groupId).options.push({
                _id: row.option_id.toString(),
                name: row.option_name,
                price_addition: parseFloat(row.price_addition)
            });
        }
    }

    // Construct final menu item
    const menuItem = {
        _id: first.menu_item_id.toString(),
        name: first.menu_item_name,
        description: first.menu_item_description,
        price: parseFloat(first.price),
        category,
        image_url: first.image_url,
        customization_options: Array.from(groupMap.values()),
        is_available: !!first.is_available,
        createdAt: first.menu_item_created_at,
        updatedAt: first.menu_item_updated_at,
        __v: 0
    };

    res.status(StatusCodes.OK).json({ menuItem });
};


const updateMenuItem = async (req, res) => {
    const { id: menuItemId } = req.params;
    const { name, description, price, category, image_url, customization_options, is_available } = req.body;

    // 1) Ensure the menu item exists
    const [existing] = await pool.query('SELECT _id FROM menu_items WHERE _id = ?', [menuItemId]);
    if (existing.length === 0) {
        throw new HttpError(`No menu item with id: ${menuItemId}`, StatusCodes.NOT_FOUND);
    }

    // 2) Validate category if provided
    if (category) {
        const [cat] = await pool.query('SELECT _id FROM categories WHERE _id = ?', [category]);
        if (cat.length === 0) {
            throw new HttpError('Invalid category', StatusCodes.BAD_REQUEST);
        }
    }

    // 3) Transaction: update core fields; if customization_options provided, replace groups/options
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Update core fields (only the ones provided)
        await conn.query(
            `
      UPDATE menu_items
      SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        category_id = COALESCE(?, category_id),
        image_url = COALESCE(?, image_url),
        is_available = COALESCE(?, is_available)
      WHERE _id = ?
      `,
            [
                name ?? null,
                description ?? null,
                price ?? null,
                category ?? null,
                image_url ?? null,
                typeof is_available === 'boolean' ? is_available : null,
                menuItemId,
            ]
        );

        // If client sent customization groups, replace them
        if (Array.isArray(customization_options)) {
            // Delete existing groups (options will cascade-delete)
            await conn.query('DELETE FROM menu_item_customization_groups WHERE menu_item_id = ?', [menuItemId]);

            // Re-insert groups + options
            for (const group of customization_options) {
                const [g] = await conn.query(
                    'INSERT INTO menu_item_customization_groups (menu_item_id, name) VALUES (?, ?)',
                    [menuItemId, group.name]
                );
                const groupId = g.insertId;

                if (Array.isArray(group.options)) {
                    for (const option of group.options) {
                        await conn.query(
                            'INSERT INTO menu_item_customization_options (group_id, name, price_addition) VALUES (?, ?, ?)',
                            [groupId, option.name, option.price_addition ?? 0]
                        );
                    }
                }
            }
        }

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }

    // 4) Return the updated item in the same shape as getSingleMenuItem
    const [rows] = await pool.query(get_menuitem_by_id, [menuItemId]);
    if (rows.length === 0) {
        // Shouldn’t happen, but just in case
        throw new HttpError(`No menu item with id: ${menuItemId}`, StatusCodes.NOT_FOUND);
    }

    const first = rows[0];
    const categoryObj = {
        _id: first.category_id.toString(),
        name: first.category_name,
        description: first.category_description,
        display_order: first.category_display_order,
        thumbnail_url: first.category_thumbnail_url,
        createdAt: first.category_created_at,
        updatedAt: first.category_updated_at,
        __v: 0,
    };

    const groupMap = new Map();
    for (const row of rows) {
        if (!row.group_id) continue;
        const gid = row.group_id.toString();
        if (!groupMap.has(gid)) {
            groupMap.set(gid, { _id: gid, name: row.group_name, options: [] });
        }
        if (row.option_id) {
            groupMap.get(gid).options.push({
                _id: row.option_id.toString(),
                name: row.option_name,
                price_addition: parseFloat(row.price_addition),
            });
        }
    }

    const menuItem = {
        _id: first.menu_item_id.toString(),
        name: first.menu_item_name,
        description: first.menu_item_description,
        price: parseFloat(first.price),
        category: categoryObj,
        image_url: first.image_url,
        customization_options: Array.from(groupMap.values()),
        is_available: !!first.is_available,
        createdAt: first.menu_item_created_at,
        updatedAt: first.menu_item_updated_at,
        __v: 0,
    };

    res.status(StatusCodes.OK).json({ menuItem });
};

const deleteMenuItem = async (req, res) => {
    const { id: menuItemId } = req.params;

    // Ensure exists
    const [existing] = await pool.query('SELECT _id FROM menu_items WHERE _id = ?', [menuItemId]);
    if (existing.length === 0) {
        throw new HttpError(`No menu item with id: ${menuItemId}`, StatusCodes.NOT_FOUND);
    }

    // Delete (customization groups/options will cascade because of FK constraints)
    const [result] = await pool.query('DELETE FROM menu_items WHERE _id = ?', [menuItemId]);

    if (result.affectedRows === 0) {
        throw new HttpError(`Failed to delete menu item: ${menuItemId}`, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    res.status(StatusCodes.OK).json({ msg: 'Menu item removed' });
};


const getItemsByCategory = async (req, res) => {
    const { categoryId } = req.params;

    const [rows] = await pool.query(get_menuitems_by_category, [categoryId]);

    if (!rows.length) {
        throw new HttpError(`No menu items found for category: ${categoryId}`, StatusCodes.NOT_FOUND);
    }

    const menuItems = rows.map(row => ({
        _id: row.menu_item_id.toString(),
        name: row.menu_item_name,
        description: row.menu_item_description,
        price: parseFloat(row.price),
        image_url: row.image_url,
        is_available: !!row.is_available,
        createdAt: row.menu_item_created_at,
        updatedAt: row.menu_item_updated_at,
        __v: 0,
        category: {
            _id: row.category_id.toString(),
            name: row.category_name,
            description: row.category_description,
            display_order: row.display_order,
            thumbnail_url: row.thumbnail_url,
            createdAt: row.category_created_at,
            updatedAt: row.category_updated_at,
            __v: 0
        }
    }));

    res.status(StatusCodes.OK).json({ menuItems, count: menuItems.length });
}

export {
    getAllMenuItems,
    createMenuItem,
    getSingleMenuItem,
    updateMenuItem,
    deleteMenuItem,
    getItemsByCategory,
    uploadMenuImage
}