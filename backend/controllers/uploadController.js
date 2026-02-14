// controllers/uploadController.js
const Document = require('../models/Document');
const ApiResponse = require('../utils/apiResponse');
const { isConfigured, deleteFile } = require('../config/cloudinary');
const AuditService = require('../services/auditService');

/**
 * Upload a single file
 * POST /api/uploads/single
 * Body: file (multipart), linkedModel, linkedId, category
 */
exports.uploadSingle = async (req, res, next) => {
    try {
        if (!req.file) {
            return ApiResponse.error(res, 'No file uploaded', 400);
        }

        const { linkedModel, linkedId, category } = req.body;

        if (!linkedModel || !linkedId) {
            return ApiResponse.error(res, 'linkedModel and linkedId are required', 400);
        }

        const validModels = ['Booking', 'Customer', 'Itinerary', 'Agent'];
        if (!validModels.includes(linkedModel)) {
            return ApiResponse.error(res, `linkedModel must be one of: ${validModels.join(', ')}`, 400);
        }

        // Build document data
        let fileUrl, publicId, fileSize, originalName;

        if (isConfigured() && req.file.path) {
            // Cloudinary upload — multer-storage-cloudinary populates these
            fileUrl = req.file.path;
            publicId = req.file.filename;
            fileSize = req.file.size || 0;
            originalName = req.file.originalname;
        } else {
            // Simulation mode — generate a fake URL
            const simId = `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            fileUrl = `https://simulated-cdn.example.com/uploads/${simId}`;
            publicId = simId;
            fileSize = req.file.size || req.file.buffer?.length || 0;
            originalName = req.file.originalname;

            console.log(`  📎 [Upload Simulation] File "${originalName}" (${fileSize} bytes) → ${fileUrl}`);
        }

        const document = await Document.create({
            fileName: publicId || originalName,
            originalName,
            fileUrl,
            publicId,
            fileType: Document.getFileType(req.file.mimetype),
            mimeType: req.file.mimetype,
            fileSize,
            uploadedBy: req.agent._id,
            linkedTo: { model: linkedModel, documentId: linkedId },
            category: category || 'other'
        });

        // Audit log
        AuditService.logCreate(req, 'Document', document._id, `Uploaded "${originalName}" for ${linkedModel} ${linkedId}`);

        ApiResponse.created(res, { document }, 'File uploaded successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Upload multiple files (max 5)
 * POST /api/uploads/multiple
 * Body: files (multipart), linkedModel, linkedId, category
 */
exports.uploadMultiple = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return ApiResponse.error(res, 'No files uploaded', 400);
        }

        const { linkedModel, linkedId, category } = req.body;

        if (!linkedModel || !linkedId) {
            return ApiResponse.error(res, 'linkedModel and linkedId are required', 400);
        }

        const documents = [];

        for (const file of req.files) {
            let fileUrl, publicId, fileSize;

            if (isConfigured() && file.path) {
                fileUrl = file.path;
                publicId = file.filename;
                fileSize = file.size || 0;
            } else {
                const simId = `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                fileUrl = `https://simulated-cdn.example.com/uploads/${simId}`;
                publicId = simId;
                fileSize = file.size || file.buffer?.length || 0;

                console.log(`  📎 [Upload Simulation] File "${file.originalname}" (${fileSize} bytes) → ${fileUrl}`);
            }

            const doc = await Document.create({
                fileName: publicId || file.originalname,
                originalName: file.originalname,
                fileUrl,
                publicId,
                fileType: Document.getFileType(file.mimetype),
                mimeType: file.mimetype,
                fileSize,
                uploadedBy: req.agent._id,
                linkedTo: { model: linkedModel, documentId: linkedId },
                category: category || 'other'
            });

            documents.push(doc);
        }

        AuditService.logCreate(req, 'Document', documents[0]._id, `Uploaded ${documents.length} files for ${linkedModel} ${linkedId}`);

        ApiResponse.created(res, { documents, count: documents.length }, `${documents.length} files uploaded`);
    } catch (error) {
        next(error);
    }
};

/**
 * Delete an uploaded file
 * DELETE /api/uploads/:id
 */
exports.deleteUpload = async (req, res, next) => {
    try {
        const document = await Document.findById(req.params.id);

        if (!document) {
            return ApiResponse.error(res, 'Document not found', 404);
        }

        // Only uploader or admin can delete
        if (document.uploadedBy.toString() !== req.agent._id.toString() &&
            !['admin', 'super_admin'].includes(req.agent.role)) {
            return ApiResponse.error(res, 'Not authorized to delete this file', 403);
        }

        // Delete from Cloudinary if configured
        if (document.publicId) {
            try {
                await deleteFile(document.publicId);
            } catch (err) {
                console.error(`  ⚠️  Cloudinary delete failed: ${err.message}`);
            }
        }

        await Document.findByIdAndDelete(req.params.id);

        AuditService.logDelete(req, 'Document', req.params.id, `Deleted file "${document.originalName}"`);

        ApiResponse.success(res, null, 'File deleted successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Get files linked to a booking
 * GET /api/uploads/booking/:bookingId
 */
exports.getBookingFiles = async (req, res, next) => {
    try {
        const documents = await Document.find({
            'linkedTo.model': 'Booking',
            'linkedTo.documentId': req.params.bookingId
        }).sort('-createdAt').populate('uploadedBy', 'firstName lastName');

        ApiResponse.success(res, { documents, count: documents.length });
    } catch (error) {
        next(error);
    }
};

/**
 * Get files linked to a customer
 * GET /api/uploads/customer/:customerId
 */
exports.getCustomerFiles = async (req, res, next) => {
    try {
        const documents = await Document.find({
            'linkedTo.model': 'Customer',
            'linkedTo.documentId': req.params.customerId
        }).sort('-createdAt').populate('uploadedBy', 'firstName lastName');

        ApiResponse.success(res, { documents, count: documents.length });
    } catch (error) {
        next(error);
    }
};
