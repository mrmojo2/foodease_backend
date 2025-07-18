import mongoose from 'mongoose';
import Order from '../models/Order.js';
import MenuItem from '../models/MenuItem.js';
import Category from '../models/Category.js';
import Table from '../models/Table.js';

export const StatisticsController = {
  // Get basic dashboard statistics
  getDashboardStats: async (req, res) => {
    try {
      // Get current date and date for 30 days ago
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Get previous period for comparison
      const sixtyDaysAgo = new Date(thirtyDaysAgo);
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 30);
      
      // Basic stats for current period
      const totalRevenue = await Order.aggregate([
        { $match: { 
          status: 'complete', 
          payment_status: 'paid',
          createdAt: { $gte: thirtyDaysAgo }
        }},
        { $group: { _id: null, total: { $sum: '$total_amount' } }}
      ]);
      
      const totalOrders = await Order.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
        status: { $in: ['complete', 'served'] }
      });
      
      const avgOrderValue = totalOrders > 0 ? 
        (totalRevenue.length > 0 ? totalRevenue[0].total / totalOrders : 0) : 0;
      
      // Basic stats for previous period (for growth calculation)
      const prevTotalRevenue = await Order.aggregate([
        { $match: { 
          status: 'complete', 
          payment_status: 'paid',
          createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
        }},
        { $group: { _id: null, total: { $sum: '$total_amount' } }}
      ]);
      
      const prevTotalOrders = await Order.countDocuments({
        createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
        status: { $in: ['complete', 'served'] }
      });
      
      // Calculate growth percentages
      const revenueGrowth = prevTotalRevenue.length > 0 && prevTotalRevenue[0].total > 0 ?
        ((totalRevenue.length > 0 ? totalRevenue[0].total : 0) - prevTotalRevenue[0].total) / prevTotalRevenue[0].total * 100 : 0;
      
      const ordersGrowth = prevTotalOrders > 0 ?
        (totalOrders - prevTotalOrders) / prevTotalOrders * 100 : 0;
      
      // Get active tables
      const activeTables = await Order.distinct('table', { 
        status: { $in: ['pending', 'preparing', 'served'] }
      }).then(tableIds => tableIds.length);
      
      return res.status(200).json({
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
        totalOrders,
        avgOrderValue,
        activeTables,
        revenueGrowth,
        ordersGrowth
      });
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return res.status(500).json({ error: 'Failed to get dashboard statistics' });
    }
  },
  
  // Get daily revenue for the past 7 days
  getDailyRevenue: async (req, res) => {
    try {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const dailyRevenue = await Order.aggregate([
        { 
          $match: { 
            status: 'complete', 
            payment_status: 'paid',
            createdAt: { $gte: sevenDaysAgo }
          }
        },
        {
          $group: {
            _id: { 
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } 
            },
            revenue: { $sum: "$total_amount" }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      
      // Fill in missing days with zero revenue
      const result = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (6 - i));
        const dateString = date.toISOString().split('T')[0];
        
        const existingDay = dailyRevenue.find(day => day._id === dateString);
        result.push({
          date: dateString,
          revenue: existingDay ? existingDay.revenue : 0
        });
      }
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error getting daily revenue:', error);
      return res.status(500).json({ error: 'Failed to get daily revenue' });
    }
  },
  
  // Get weekly revenue for the past 4 weeks
  getWeeklyRevenue: async (req, res) => {
    try {
      const today = new Date();
      const fourWeeksAgo = new Date(today);
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      
      const weeklyRevenue = await Order.aggregate([
        { 
          $match: { 
            status: 'complete', 
            payment_status: 'paid',
            createdAt: { $gte: fourWeeksAgo }
          }
        },
        {
          $group: {
            _id: { 
              year: { $year: "$createdAt" },
              week: { $week: "$createdAt" }
            },
            revenue: { $sum: "$total_amount" },
            startDate: { $min: "$createdAt" }
          }
        },
        { $sort: { "_id.year": 1, "_id.week": 1 } }
      ]);
      
      // Format the result
      const result = weeklyRevenue.map(week => ({
        week: `Week ${week._id.week}`,
        revenue: week.revenue,
        startDate: week.startDate.toISOString().split('T')[0]
      }));
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error getting weekly revenue:', error);
      return res.status(500).json({ error: 'Failed to get weekly revenue' });
    }
  },
  
  // Get monthly revenue for the past 12 months
  getMonthlyRevenue: async (req, res) => {
    try {
      const today = new Date();
      const twelveMonthsAgo = new Date(today);
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      
      const monthlyRevenue = await Order.aggregate([
        { 
          $match: { 
            status: 'complete', 
            payment_status: 'paid',
            createdAt: { $gte: twelveMonthsAgo }
          }
        },
        {
          $group: {
            _id: { 
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" }
            },
            revenue: { $sum: "$total_amount" }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]);
      
      // Format the result with month names
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      const result = monthlyRevenue.map(month => ({
        month: monthNames[month._id.month - 1],
        revenue: month.revenue,
        year: month._id.year
      }));
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error getting monthly revenue:', error);
      return res.status(500).json({ error: 'Failed to get monthly revenue' });
    }
  },
  
  // Get most sold items (top 5)
  getMostSoldItems: async (req, res) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const mostSoldItems = await Order.aggregate([
        { 
          $match: { 
            createdAt: { $gte: thirtyDaysAgo },
            status: { $in: ['complete', 'served'] }
          }
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.item",
            totalQuantity: { $sum: "$items.quantity" },
            totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
          }
        },
        {
          $lookup: {
            from: "menuitems",
            localField: "_id",
            foreignField: "_id",
            as: "menuItem"
          }
        },
        { $unwind: "$menuItem" },
        {
          $project: {
            _id: 1,
            name: "$menuItem.name",
            totalQuantity: 1,
            totalRevenue: 1,
            category: "$menuItem.category"
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 }
      ]);
      
      // Lookup category names
      const categoryIds = [...new Set(mostSoldItems.map(item => item.category))];
      const categories = await Category.find({ _id: { $in: categoryIds } });
      
      const result = mostSoldItems.map(item => {
        const category = categories.find(cat => cat._id.toString() === item.category.toString());
        return {
          id: item._id,
          name: item.name,
          totalQuantity: item.totalQuantity,
          totalRevenue: item.totalRevenue,
          category: category ? category.name : 'Unknown'
        };
      });
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error getting most sold items:', error);
      return res.status(500).json({ error: 'Failed to get most sold items' });
    }
  },
  
  // Get revenue by category
  getRevenueByCategory: async (req, res) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const revenueByCategory = await Order.aggregate([
        { 
          $match: { 
            createdAt: { $gte: thirtyDaysAgo },
            status: 'complete',
            payment_status: 'paid'
          }
        },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "menuitems",
            localField: "items.item",
            foreignField: "_id",
            as: "menuItem"
          }
        },
        { $unwind: "$menuItem" },
        {
          $group: {
            _id: "$menuItem.category",
            revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
          }
        },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "category"
          }
        },
        { $unwind: "$category" },
        {
          $project: {
            _id: 1,
            name: "$category.name",
            revenue: 1
          }
        },
        { $sort: { revenue: -1 } }
      ]);
      
      return res.status(200).json(revenueByCategory);
    } catch (error) {
      console.error('Error getting revenue by category:', error);
      return res.status(500).json({ error: 'Failed to get revenue by category' });
    }
  },
  
  // Get year-over-year growth
  getYearOverYearGrowth: async (req, res) => {
    try {
      const today = new Date();
      
      // Current year
      const currentYearStart = new Date(today.getFullYear(), 0, 1);
      
      // Previous year
      const prevYearStart = new Date(today.getFullYear() - 1, 0, 1);
      const prevYearEnd = new Date(today.getFullYear(), 0, 0);
      
      // Get current year revenue
      const currentYearRevenue = await Order.aggregate([
        { 
          $match: { 
            status: 'complete', 
            payment_status: 'paid',
            createdAt: { $gte: currentYearStart }
          }
        },
        { $group: { _id: null, total: { $sum: '$total_amount' } }}
      ]);
      
      // Get previous year revenue
      const prevYearRevenue = await Order.aggregate([
        { 
          $match: { 
            status: 'complete', 
            payment_status: 'paid',
            createdAt: { $gte: prevYearStart, $lte: prevYearEnd }
          }
        },
        { $group: { _id: null, total: { $sum: '$total_amount' } }}
      ]);
      
      // Calculate growth
      const currentRevenue = currentYearRevenue.length > 0 ? currentYearRevenue[0].total : 0;
      const prevRevenue = prevYearRevenue.length > 0 ? prevYearRevenue[0].total : 0;
      
      const growth = prevRevenue > 0 ? 
        ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 
        (currentRevenue > 0 ? 100 : 0);
      
      return res.status(200).json({
        currentYearRevenue: currentRevenue,
        previousYearRevenue: prevRevenue,
        growthPercentage: growth
      });
    } catch (error) {
      console.error('Error getting year-over-year growth:', error);
      return res.status(500).json({ error: 'Failed to get year-over-year growth' });
    }
  },
  
  // Get order status distribution
  getOrderStatusDistribution: async (req, res) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const statusDistribution = await Order.aggregate([
        { 
          $match: { 
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]);
      
      // Format the result
      const statuses = ['pending', 'preparing', 'served', 'complete', 'cancelled'];
      const result = statuses.map(status => {
        const found = statusDistribution.find(item => item._id === status);
        return {
          status,
          count: found ? found.count : 0
        };
      });
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error getting order status distribution:', error);
      return res.status(500).json({ error: 'Failed to get order status distribution' });
    }
  },
  
  // Get payment method distribution
  getPaymentMethodDistribution: async (req, res) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const paymentDistribution = await Order.aggregate([
        { 
          $match: { 
            createdAt: { $gte: thirtyDaysAgo },
            payment_status: 'paid'
          }
        },
        {
          $group: {
            _id: "$payment_method",
            count: { $sum: 1 },
            total: { $sum: "$total_amount" }
          }
        }
      ]);
      
      // Format the result
      const methods = ['cash', 'online_payment'];
      const result = methods.map(method => {
        const found = paymentDistribution.find(item => item._id === method);
        return {
          method,
          count: found ? found.count : 0,
          total: found ? found.total : 0
        };
      });
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error getting payment method distribution:', error);
      return res.status(500).json({ error: 'Failed to get payment method distribution' });
    }
  },
  
  // Get hourly order distribution
  getHourlyOrderDistribution: async (req, res) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const hourlyDistribution = await Order.aggregate([
        { 
          $match: { 
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: { $hour: "$createdAt" },
            count: { $sum: 1 },
            revenue: { $sum: "$total_amount" }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      
      // Fill in missing hours with zero
      const result = [];
      for (let i = 0; i < 24; i++) {
        const existingHour = hourlyDistribution.find(hour => hour._id === i);
        result.push({
          hour: i,
          count: existingHour ? existingHour.count : 0,
          revenue: existingHour ? existingHour.revenue : 0
        });
      }
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error getting hourly order distribution:', error);
      return res.status(500).json({ error: 'Failed to get hourly order distribution' });
    }
  },
  
  // Get all dashboard statistics in one call
  getAllDashboardStats: async (req, res) => {
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Basic stats
      const basicStats = await OrderController.getDashboardStats(req, {
        status: (code, data) => data,
        json: (data) => data
      });
      
      // Daily revenue
      const dailyRevenue = await OrderController.getDailyRevenue(req, {
        status: (code, data) => data,
        json: (data) => data
      });
      
      // Weekly revenue
      const weeklyRevenue = await OrderController.getWeeklyRevenue(req, {
        status: (code, data) => data,
        json: (data) => data
      });
      
      // Monthly revenue
      const monthlyRevenue = await OrderController.getMonthlyRevenue(req, {
        status: (code, data) => data,
        json: (data) => data
      });
      
      // Most sold items
      const mostSoldItems = await OrderController.getMostSoldItems(req, {
        status: (code, data) => data,
        json: (data) => data
      });
      
      // Revenue by category
      const revenueByCategory = await OrderController.getRevenueByCategory(req, {
        status: (code, data) => data,
        json: (data) => data
      });
      
      // Year-over-year growth
      const yearOverYearGrowth = await OrderController.getYearOverYearGrowth(req, {
        status: (code, data) => data,
        json: (data) => data
      });
      
      // Order status distribution
      const orderStatusDistribution = await OrderController.getOrderStatusDistribution(req, {
        status: (code, data) => data,
        json: (data) => data
      });
      
      // Payment method distribution
      const paymentMethodDistribution = await OrderController.getPaymentMethodDistribution(req, {
        status: (code, data) => data,
        json: (data) => data
      });
      
      // Hourly order distribution
      const hourlyOrderDistribution = await OrderController.getHourlyOrderDistribution(req, {
        status: (code, data) => data,
        json: (data) => data
      });
      
      return res.status(200).json({
        basicStats,
        dailyRevenue,
        weeklyRevenue,
        monthlyRevenue,
        mostSoldItems,
        revenueByCategory,
        yearOverYearGrowth,
        orderStatusDistribution,
        paymentMethodDistribution,
        hourlyOrderDistribution
      });
    } catch (error) {
      console.error('Error getting all dashboard stats:', error);
      return res.status(500).json({ error: 'Failed to get all dashboard statistics' });
    }
  }
};

export default StatisticsController;