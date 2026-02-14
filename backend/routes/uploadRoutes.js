// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { uploadSingle, uploadMultiple, handleUploadError } = require('../middleware/upload');
const uploadController = require('../controllers/uploadController');

// All upload routes require authentication
router.use(protect);

// Single file upload
router.post('/single',
    uploadSingle('file', 'general'),
    handleUploadError,
    uploadController.uploadSingle
);

// Multiple file upload (max 5)
router.post('/multiple',
    uploadMultiple('files', 5, 'general'),
    handleUploadError,
    uploadController.uploadMultiple
);

// Delete a file
router.delete('/:id', uploadController.deleteUpload);

// Get files for a booking
router.get('/booking/:bookingId', uploadController.getBookingFiles);

// Get files for a customer
router.get('/customer/:customerId', uploadController.getCustomerFiles);

module.exports = router;
