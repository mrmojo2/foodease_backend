// routes/qrRoutes.js
import express from 'express';
import QRCodeController from '../controllers/qrController.js';
import { authenticateUser, authorizePermissions } from "../middlewares/atuh.js";

const router = express.Router();

// Routes
router.post('/upload', authenticateUser, QRCodeController.uploadQRCode);
router.get('/', QRCodeController.getQRCode);

export default router;