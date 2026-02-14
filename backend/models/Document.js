// models/Document.js
const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    publicId: { type: String }, // Cloudinary public ID for deletion
    fileType: {
        type: String,
        enum: ['pdf', 'image', 'document'],
        required: true
    },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true }, // In bytes
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        required: true,
        index: true
    },
    linkedTo: {
        model: {
            type: String,
            enum: ['Booking', 'Customer', 'Itinerary', 'Agent'],
            required: true
        },
        documentId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        }
    },
    category: {
        type: String,
        enum: ['itinerary', 'passport', 'visa', 'ticket', 'receipt', 'profile_photo', 'other'],
        default: 'other'
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
documentSchema.index({ 'linkedTo.model': 1, 'linkedTo.documentId': 1 });
documentSchema.index({ uploadedBy: 1, createdAt: -1 });

/**
 * Helper to determine fileType from mimeType
 */
documentSchema.statics.getFileType = function (mimeType) {
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('image/')) return 'image';
    return 'document';
};

module.exports = mongoose.model('Document', documentSchema);
