// middleware/upload.js
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { getCloudinary, isConfigured } = require('../config/cloudinary');
const path = require('path');

// File type configurations
const UPLOAD_CONFIGS = {
    itinerary: {
        allowedTypes: ['application/pdf'],
        maxSize: 10 * 1024 * 1024, // 10 MB
        folder: 'travel-platform/itineraries'
    },
    customerDoc: {
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSize: 5 * 1024 * 1024, // 5 MB
        folder: 'travel-platform/customer-documents'
    },
    bookingAttachment: {
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        maxSize: 10 * 1024 * 1024, // 10 MB
        folder: 'travel-platform/booking-attachments'
    },
    profilePhoto: {
        allowedTypes: ['image/jpeg', 'image/png'],
        maxSize: 2 * 1024 * 1024, // 2 MB
        folder: 'travel-platform/profile-photos'
    },
    general: {
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        maxSize: 10 * 1024 * 1024, // 10 MB
        folder: 'travel-platform/general'
    }
};

/**
 * Create a multer upload middleware for the given config type
 * Uses Cloudinary storage if configured, otherwise memory storage (simulation)
 */
const createUploader = (configType = 'general') => {
    const config = UPLOAD_CONFIGS[configType] || UPLOAD_CONFIGS.general;

    let storage;

    if (isConfigured()) {
        // Cloudinary cloud storage
        storage = new CloudinaryStorage({
            cloudinary: getCloudinary(),
            params: {
                folder: config.folder,
                allowed_formats: config.allowedTypes.map(type => {
                    const ext = type.split('/')[1];
                    if (ext === 'vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
                    if (ext === 'msword') return 'doc';
                    return ext;
                }),
                resource_type: 'auto'
            }
        });
    } else {
        // Memory storage for simulation (file data available in req.file.buffer)
        storage = multer.memoryStorage();
    }

    const fileFilter = (req, file, cb) => {
        if (config.allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${config.allowedTypes.join(', ')}`), false);
        }
    };

    return multer({
        storage,
        limits: { fileSize: config.maxSize },
        fileFilter
    });
};

/**
 * Single file upload middleware
 */
const uploadSingle = (fieldName = 'file', configType = 'general') => {
    return createUploader(configType).single(fieldName);
};

/**
 * Multiple file upload middleware (max 5 files)
 */
const uploadMultiple = (fieldName = 'files', maxCount = 5, configType = 'general') => {
    return createUploader(configType).array(fieldName, maxCount);
};

/**
 * Error handler for multer errors
 */
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: 'File too large. Check size limits.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ success: false, message: 'Too many files. Maximum 5 files per upload.' });
        }
        return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    }
    if (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
    next();
};

module.exports = { createUploader, uploadSingle, uploadMultiple, handleUploadError, UPLOAD_CONFIGS };
