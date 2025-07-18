import User from "../models/User.js"
import { StatusCodes } from "http-status-codes"
import HttpError from '../error/HttpError.js'
import { attachCookieToResponse } from "../utils/jwt.js"
import checkPermission from "../utils/checkPermissions.js"

import { v2 as cloudinary } from "cloudinary"
import fs from 'fs'

const getUser = async (req,res)=>{
    const {profileId} = req.params
    const profile = await User.findOne({_id:profileId}).select('-password')
    
    if(!profile){
        throw new HttpError('not found',404)
    }
    res.status(200).json({profile})
}

const updateProfile = async (req,res)=>{
    const {profileId} = req.params
    const img = req.files?.img

    const user = await User.findOne({_id:profileId}).select('+password')
    if(!user){
        res.status(404).json({msg:'user not found!'})
    }
    checkPermission(req.user,profileId)

    //change pfp
    let uploadedImage
    if(img){
        if(!img.mimetype.startsWith('image')){
            throw new HttpError('invalid file type',StatusCodes.BAD_REQUEST)
        }
        if (img.size > 10000000){
            throw new HttpError('file too big',StatusCodes.BAD_REQUEST)
        }

        uploadedImage = await cloudinary.uploader.upload(req.files.img.tempFilePath,{
            use_filename: true,
            filename_override: req.files.img.name,
            folder:'rent_app/profile_pics'
        })

        fs.unlink(req.files.img.tempFilePath,(e)=>{
            if(e) throw e
        })

        //delete previous profile pic from cloudinary
        let public_id = user.pfp_url.split('/').slice(7).join('/').split('.').slice(0,-1).join('.')
        if (!(public_id === 'rent_app/profile_pics/default_profile_400x400_zkc1hd')){
            try {
                await cloudinary.uploader.destroy(public_id)
            } catch (error) {
                console.log(error)
            }
        }
    }

    //change password
    const { old_password, new_password } = req.body;

    if(old_password && new_password){
        const isPasswordCorrect = await user.comparePassword(old_password);
        if (!isPasswordCorrect) {
            throw new HttpError('Invalid password', StatusCodes.UNAUTHORIZED);
        }

        user.password = new_password;
        await user.save();
    }

    const updateObject = {}
    req.body?.name && (updateObject['name'] = req.body.name)
    req.body?.user_type && (updateObject['user_type'] = req.body.user_type)
    uploadedImage && (updateObject['pfp_url'] = uploadedImage.secure_url)

    const updatedUser = await User.findOneAndUpdate({_id:req.user.userId},updateObject,{
        runValidators:true,
        new:true,
    })
    

    const tokenUser = {name:updatedUser.name,role:updatedUser.role,userId:updatedUser._id,pfp_url:updatedUser.pfp_url,user_type:updatedUser.user_type}
    attachCookieToResponse({res,user:tokenUser})
    res.status(StatusCodes.OK).json({tokenUser})
}





export {getUser,updateProfile}