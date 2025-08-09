// controllers/statisticsController.js
import { StatusCodes } from "http-status-codes";
import HttpError from "../error/HttpError.js";
import pool from "../db/db.js";
import {
  q_total_revenue_since,
  q_total_revenue_between,
  q_total_orders_since,
  q_total_orders_between,
  q_active_tables_count,
  q_daily_revenue_since,
  q_weekly_revenue_since,
  q_monthly_revenue_since,
  q_top_items_30d,
  q_revenue_by_category_30d,
  q_year_revenue_from,
  q_status_distribution_30d,
  q_payment_method_distribution_30d,
  q_hourly_distribution_30d,
} from "../queries/statisticsQueries.js";

const STATUSES_ALL = ['pending', 'preparing', 'served', 'complete', 'cancelled'];
const METHODS_ALL = ['cash', 'online_payment'];

/* --------------------------- utilities --------------------------- */

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function startOfYear(year) {
  return new Date(year, 0, 1, 0, 0, 0, 0);
}

function endOfYear(year) {
  return new Date(year, 11, 31, 23, 59, 59, 999);
}

/* --------------------------- controller --------------------------- */

export const StatisticsController = {
  // Basic dashboard stats (last 30 days + prev 30 days for growth)
  getDashboardStats: async (req, res) => {
    try {
      const today = startOfToday();
      const thirtyDaysAgo = addDays(today, -30);
      const sixtyDaysAgo = addDays(thirtyDaysAgo, -30);

      const [[revNowRow]] = await pool.query(q_total_revenue_since, [thirtyDaysAgo]);
      const totalRevenue = Number(revNowRow?.total ?? 0);

      const [[ordersNowRow]] = await pool.query(q_total_orders_since, [thirtyDaysAgo]);
      const totalOrders = Number(ordersNowRow?.count ?? 0);

      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const [[revPrevRow]] = await pool.query(q_total_revenue_between, [sixtyDaysAgo, thirtyDaysAgo]);
      const prevRevenue = Number(revPrevRow?.total ?? 0);

      const [[ordersPrevRow]] = await pool.query(q_total_orders_between, [sixtyDaysAgo, thirtyDaysAgo]);
      const prevOrders = Number(ordersPrevRow?.count ?? 0);

      const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
      const ordersGrowth = prevOrders > 0 ? ((totalOrders - prevOrders) / prevOrders) * 100 : 0;

      const [[activeTablesRow]] = await pool.query(q_active_tables_count);
      const activeTables = Number(activeTablesRow?.active_tables ?? 0);

      return res.status(StatusCodes.OK).json({
        totalRevenue,
        totalOrders,
        avgOrderValue,
        activeTables,
        revenueGrowth,
        ordersGrowth
      });
    } catch (err) {
      console.error("Error getting dashboard stats:", err);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to get dashboard statistics" });
    }
  },

  // Daily revenue for last 7 days
  getDailyRevenue: async (req, res) => {
    try {
      const today = startOfToday();
      const sevenDaysAgo = addDays(today, -7);

      const [rows] = await pool.query(q_daily_revenue_since, [sevenDaysAgo]);

      // Fill missing days
      const result = [];
      for (let i = 0; i < 7; i++) {
        const d = addDays(today, -(6 - i));
        const dateStr = d.toISOString().slice(0, 10);
        const found = rows.find(r => r.date === dateStr);
        result.push({
          date: dateStr,
          revenue: Number(found?.revenue ?? 0)
        });
      }

      return res.status(StatusCodes.OK).json(result);
    } catch (err) {
      console.error("Error getting daily revenue:", err);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to get daily revenue" });
    }
  },

  // Weekly revenue for last 4 weeks (ISO week)
  getWeeklyRevenue: async (req, res) => {
    try {
      const today = startOfToday();
      const fourWeeksAgo = addDays(today, -28);

      const [rows] = await pool.query(q_weekly_revenue_since, [fourWeeksAgo]);

      const result = rows.map(r => ({
        week: `Week ${r.week_number}`,
        revenue: Number(r.revenue),
        startDate: r.week_start.toISOString().slice(0, 10)
      }));

      return res.status(StatusCodes.OK).json(result);
    } catch (err) {
      console.error("Error getting weekly revenue:", err);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to get weekly revenue" });
    }
  },

  // Monthly revenue for last 12 months
  getMonthlyRevenue: async (req, res) => {
    try {
      const today = startOfToday();
      const twelveMonthsAgo = addMonths(today, -12);

      const [rows] = await pool.query(q_monthly_revenue_since, [twelveMonthsAgo]);

      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      const result = rows.map(r => ({
        month: monthNames[r.month - 1],
        revenue: Number(r.revenue),
        year: r.year
      }));

      return res.status(StatusCodes.OK).json(result);
    } catch (err) {
      console.error("Error getting monthly revenue:", err);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to get monthly revenue" });
    }
  },

  // Most sold items (top 5) last 30 days
  getMostSoldItems: async (req, res) => {
    try {
      const thirtyDaysAgo = addDays(startOfToday(), -30);
      const [rows] = await pool.query(q_top_items_30d, [thirtyDaysAgo]);

      const result = rows.map(r => ({
        id: r.menu_item_id,
        name: r.menu_item_name,
        totalQuantity: Number(r.total_qty),
        totalRevenue: Number(r.total_rev),
        category: r.category_name ?? 'Unknown'
      }));

      return res.status(StatusCodes.OK).json(result);
    } catch (err) {
      console.error("Error getting most sold items:", err);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to get most sold items" });
    }
  },

  // Revenue by category last 30 days
  getRevenueByCategory: async (req, res) => {
    try {
      const thirtyDaysAgo = addDays(startOfToday(), -30);
      const [rows] = await pool.query(q_revenue_by_category_30d, [thirtyDaysAgo]);

      const result = rows.map(r => ({
        _id: r.category_id,
        name: r.category_name,
        revenue: Number(r.revenue)
      }));

      return res.status(StatusCodes.OK).json(result);
    } catch (err) {
      console.error("Error getting revenue by category:", err);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to get revenue by category" });
    }
  },

  // Year-over-year growth
  getYearOverYearGrowth: async (req, res) => {
    try {
      const today = new Date();
      const currentYearStart = startOfYear(today.getFullYear());
      const prevYearStart = startOfYear(today.getFullYear() - 1);
      const prevYearEnd = endOfYear(today.getFullYear() - 1);

      const [[curr]] = await pool.query(q_year_revenue_from, [currentYearStart]);
      const [[prev]] = await pool.query(q_total_revenue_between, [prevYearStart, prevYearEnd]);

      const currentRevenue = Number(curr?.total ?? 0);
      const previousRevenue = Number(prev?.total ?? 0);

      const growthPercentage = previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : (currentRevenue > 0 ? 100 : 0);

      return res.status(StatusCodes.OK).json({
        currentYearRevenue: currentRevenue,
        previousYearRevenue: previousRevenue,
        growthPercentage
      });
    } catch (err) {
      console.error("Error getting year-over-year growth:", err);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to get year-over-year growth" });
    }
  },

  // Order status distribution last 30 days
  getOrderStatusDistribution: async (req, res) => {
    try {
      const thirtyDaysAgo = addDays(startOfToday(), -30);
      const [rows] = await pool.query(q_status_distribution_30d, [thirtyDaysAgo]);

      const map = new Map(rows.map(r => [r.status, Number(r.count)]));
      const result = STATUSES_ALL.map(s => ({ status: s, count: map.get(s) ?? 0 }));

      return res.status(StatusCodes.OK).json(result);
    } catch (err) {
      console.error("Error getting order status distribution:", err);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to get order status distribution" });
    }
  },

  // Payment method distribution (paid only) last 30 days
  getPaymentMethodDistribution: async (req, res) => {
    try {
      const thirtyDaysAgo = addDays(startOfToday(), -30);
      const [rows] = await pool.query(q_payment_method_distribution_30d, [thirtyDaysAgo]);

      const byMethod = new Map(rows.map(r => [r.payment_method, { count: Number(r.count), total: Number(r.total) }]));
      const result = METHODS_ALL.map(m => ({
        method: m,
        count: byMethod.get(m)?.count ?? 0,
        total: byMethod.get(m)?.total ?? 0
      }));

      return res.status(StatusCodes.OK).json(result);
    } catch (err) {
      console.error("Error getting payment method distribution:", err);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to get payment method distribution" });
    }
  },

  // Hourly order distribution last 30 days
  getHourlyOrderDistribution: async (req, res) => {
    try {
      const thirtyDaysAgo = addDays(startOfToday(), -30);
      const [rows] = await pool.query(q_hourly_distribution_30d, [thirtyDaysAgo]);

      const byHour = new Map(rows.map(r => [r.hr, { count: Number(r.count), revenue: Number(r.revenue) }]));
      const result = [];
      for (let h = 0; h < 24; h++) {
        const v = byHour.get(h) || { count: 0, revenue: 0 };
        result.push({ hour: h, count: v.count, revenue: v.revenue });
      }

      return res.status(StatusCodes.OK).json(result);
    } catch (err) {
      console.error("Error getting hourly order distribution:", err);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to get hourly order distribution" });
    }
  },

  // Combine all statistics (sequential to keep it simple)
  getAllDashboardStats: async (req, res) => {
    try {
      const [
        basicStatsRes,
        dailyRevenueRes,
        weeklyRevenueRes,
        monthlyRevenueRes,
        mostSoldItemsRes,
        revenueByCategoryRes,
        yearOverYearGrowthRes,
        orderStatusDistributionRes,
        paymentMethodDistributionRes,
        hourlyOrderDistributionRes,
      ] = await Promise.all([
        StatisticsController.getDashboardStats(req, { status: () => ({ json: (d) => d }), json: (d) => d }),
        StatisticsController.getDailyRevenue(req, { status: () => ({ json: (d) => d }), json: (d) => d }),
        StatisticsController.getWeeklyRevenue(req, { status: () => ({ json: (d) => d }), json: (d) => d }),
        StatisticsController.getMonthlyRevenue(req, { status: () => ({ json: (d) => d }), json: (d) => d }),
        StatisticsController.getMostSoldItems(req, { status: () => ({ json: (d) => d }), json: (d) => d }),
        StatisticsController.getRevenueByCategory(req, { status: () => ({ json: (d) => d }), json: (d) => d }),
        StatisticsController.getYearOverYearGrowth(req, { status: () => ({ json: (d) => d }), json: (d) => d }),
        StatisticsController.getOrderStatusDistribution(req, { status: () => ({ json: (d) => d }), json: (d) => d }),
        StatisticsController.getPaymentMethodDistribution(req, { status: () => ({ json: (d) => d }), json: (d) => d }),
        StatisticsController.getHourlyOrderDistribution(req, { status: () => ({ json: (d) => d }), json: (d) => d }),
      ]);

      return res.status(StatusCodes.OK).json({
        basicStats: basicStatsRes,
        dailyRevenue: dailyRevenueRes,
        weeklyRevenue: weeklyRevenueRes,
        monthlyRevenue: monthlyRevenueRes,
        mostSoldItems: mostSoldItemsRes,
        revenueByCategory: revenueByCategoryRes,
        yearOverYearGrowth: yearOverYearGrowthRes,
        orderStatusDistribution: orderStatusDistributionRes,
        paymentMethodDistribution: paymentMethodDistributionRes,
        hourlyOrderDistribution: hourlyOrderDistributionRes,
      });
    } catch (err) {
      console.error("Error getting all dashboard stats:", err);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to get all dashboard statistics" });
    }
  },
};

export default StatisticsController;
