// controllers/QRCodeController.js
import QRCode from '../models/QRCode.js';
import { v2 as cloudinary } from "cloudinary"
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';

class HttpError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const QRCodeController = {
  // Upload QR code image
  uploadQRCode: async (req, res) => {
    try {
      const image = req.files?.image;
      
      if (!image) {
        throw new HttpError('No image uploaded', StatusCodes.BAD_REQUEST);
      }
      
      // Validate image
      if (!image.mimetype.startsWith('image')) {
        throw new HttpError('Invalid file type', StatusCodes.BAD_REQUEST);
      }
      
      if (image.size > 5000000) { // 5MB limit
        throw new HttpError('Image too large', StatusCodes.BAD_REQUEST);
      }
      
      // Upload new image to Cloudinary
      const uploadedImage = await cloudinary.uploader.upload(image.tempFilePath, {
        use_filename: true,
        filename_override: `qr-code-${Date.now()}`,
        folder: 'digital_menu/QRCodes'
      });
      
      // Remove temp file
      fs.unlink(image.tempFilePath, (err) => {
        if (err) console.log('Error removing temp file:', err);
      });
      
      // Find current active QR code
      const currentActiveQR = await QRCode.findOne({ isActive: true });
      
      // If there's an active QR code, deactivate it and delete the image from Cloudinary
      if (currentActiveQR) {
        // Deactivate current QR code
        currentActiveQR.isActive = false;
        await currentActiveQR.save();
        
        // Delete old image from Cloudinary
        try {
          await cloudinary.uploader.destroy(currentActiveQR.publicId);
        } catch (error) {
          console.log('Error deleting old QR code from Cloudinary:', error);
          // Continue even if deletion fails
        }
      }
      
      // Create new QR code record
      const newQRCode = new QRCode({
        imageUrl: uploadedImage.secure_url,
        publicId: uploadedImage.public_id,
        isActive: true
      });
      
      await newQRCode.save();
      
      res.status(StatusCodes.CREATED).json({
        success: true,
        message: 'QR code uploaded successfully',
        data: {
          imageUrl: newQRCode.imageUrl
        }
      });
    } catch (error) {
      console.error('Error in uploadQRCode:', error);
      const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error uploading QR code'
      });
    }
  },
  
  // Get active QR code
  getQRCode: async (req, res) => {
    try {
      const qrCode = await QRCode.findOne({ isActive: true });
      
      if (!qrCode) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'No active QR code found'
        });
      }
      
      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          imageUrl: qrCode.imageUrl
        }
      });
    } catch (error) {
      console.error('Error in getQRCode:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error retrieving QR code'
      });
    }
  }
};

export default QRCodeController;