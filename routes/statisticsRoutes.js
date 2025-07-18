import express from "express";
const router = express.Router()

import { authenticateUser } from "../middlewares/atuh.js";
import StatisticsController from "../controllers/statisticsController.js"

// Dashboard statistics routes - all protected with authentication
router.get('/dashboard', authenticateUser, StatisticsController.getDashboardStats);
router.get('/daily-revenue', authenticateUser, StatisticsController.getDailyRevenue);
router.get('/weekly-revenue', authenticateUser, StatisticsController.getWeeklyRevenue);
router.get('/monthly-revenue', authenticateUser, StatisticsController.getMonthlyRevenue);
router.get('/most-sold-items', authenticateUser, StatisticsController.getMostSoldItems);
router.get('/revenue-by-category', authenticateUser, StatisticsController.getRevenueByCategory);
router.get('/year-over-year', authenticateUser, StatisticsController.getYearOverYearGrowth);
router.get('/order-status', authenticateUser, StatisticsController.getOrderStatusDistribution);
router.get('/payment-methods', authenticateUser, StatisticsController.getPaymentMethodDistribution);
router.get('/hourly-distribution', authenticateUser, StatisticsController.getHourlyOrderDistribution);

// Get all dashboard stats in one call
router.get('/all', authenticateUser, StatisticsController.getAllDashboardStats);

export default router;