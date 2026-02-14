// config/cloudinary.js
const cloudinary = require('cloudinary').v2;

let isCloudinaryConfigured = false;

const configureCloudinary = () => {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
        console.log('  ⚠️  Cloudinary credentials not configured — file uploads will use local simulation');
        return false;
    }

    cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
        secure: true
    });

    isCloudinaryConfigured = true;
    console.log('  ✅ Cloudinary configured');
    return true;
};

const getCloudinary = () => cloudinary;
const isConfigured = () => isCloudinaryConfigured;

/**
 * Delete a file from Cloudinary by its public ID
 */
const deleteFile = async (publicId) => {
    if (!isCloudinaryConfigured) {
        console.log(`  [Cloudinary Simulation] Would delete file: ${publicId}`);
        return { result: 'ok' };
    }

    try {
        return await cloudinary.uploader.destroy(publicId);
    } catch (err) {
        console.error(`  ❌ Cloudinary delete error: ${err.message}`);
        throw err;
    }
};

module.exports = { configureCloudinary, getCloudinary, isConfigured, deleteFile };
