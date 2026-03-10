import Report from '../models/Report.js';
import User from '../models/User.js';

// @desc    Create a new report
// @route   POST /api/reports
// @access  Private/User
export const createReport = async (req, res, next) => {
  try {
    const { type, description } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!type || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide report type and description'
      });
    }

    // Create report
    const report = await Report.create({
      userId,
      userName: req.user.name,
      userEmail: req.user.email,
      type,
      description
    });

    res.status(201).json({
      success: true,
      data: report,
      message: 'Report submitted successfully'
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    next(error);
  }
};

// @desc    Get all reports (Admin)
// @route   GET /api/reports
// @access  Private/Admin
export const getAllReports = async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 10 } = req.query;

    // Build query
    let query = {};

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Type filter
    if (type && type !== 'all') {
      query.type = type;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const reports = await Report.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Report.countDocuments(query);

    res.status(200).json({
      success: true,
      data: reports,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's own reports
// @route   GET /api/reports/my-reports
// @access  Private/User
export const getMyReports = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const reports = await Report.find({ userId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: reports,
      count: reports.length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update report status (Admin)
// @route   PUT /api/reports/:id/status
// @access  Private/Admin
export const updateReportStatus = async (req, res, next) => {
  try {
    const { status, adminResponse } = req.body;
    const reportId = req.params.id;

    // Validate required fields
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Please provide status'
      });
    }

    // Find report
    const report = await Report.findById(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Update report
    report.status = status;
    if (adminResponse) {
      report.adminResponse = adminResponse;
    }
    if (status === 'resolved' || status === 'rejected') {
      report.resolvedAt = new Date();
    }

    await report.save();

    res.status(200).json({
      success: true,
      data: report,
      message: 'Report updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a report
// @route   DELETE /api/reports/:id
// @access  Private/Admin
export const deleteReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    await report.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
