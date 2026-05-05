const fs = require('fs');

const MAGIC_BYTES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
  'application/msword': [0xD0, 0xCF, 0x11, 0xE0],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50, 0x4B, 0x03, 0x04],
  'text/plain': null
};

function validateFileContent(req, res, next) {
  if (!req.file) return next();
  
  try {
    const buffer = Buffer.alloc(4);
    const fd = fs.openSync(req.file.path, 'r');
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);
    
    const detectedType = Object.entries(MAGIC_BYTES).find(([_, magic]) => 
      magic && magic.every((byte, i) => buffer[i] === byte)
    );
    
    if (detectedType && detectedType[0] !== req.file.mimetype) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        success: false, 
        message: 'File content does not match its extension' 
      });
    }
  } catch (error) {
    console.error('File content validation error:', error.message);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({ 
      success: false, 
      message: 'File validation failed' 
    });
  }
  
  next();
}

module.exports = { validateFileContent };