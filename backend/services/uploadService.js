const fs = require('fs');
const path = require('path');

function createUploadService({ paths, constants }) {
  const { MENU_UPLOAD_DIR } = paths;
  const { MENU_IMAGE_MIME_EXT, MAX_MENU_IMAGE_BYTES } = constants;

  function sanitizeUploadBaseName(name = '') {
    const withoutExt = String(name || '').replace(/\.[^.]+$/, '');
    const safe = withoutExt
      .normalize('NFKD')
      .replace(/[^\w.-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    return safe || 'menu-image';
  }

  function saveMenuImageUpload({ fileName = '', dataUrl = '' } = {}) {
    const match = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=\s]+)$/);
    if (!match) {
      const err = new Error('图片数据格式无效');
      err.statusCode = 400;
      throw err;
    }
    const mime = match[1].toLowerCase();
    const ext = MENU_IMAGE_MIME_EXT[mime];
    if (!ext) {
      const err = new Error('仅支持 JPG、PNG、WEBP、GIF 图片');
      err.statusCode = 400;
      throw err;
    }
    const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
    if (!buffer.length) {
      const err = new Error('图片内容为空');
      err.statusCode = 400;
      throw err;
    }
    if (buffer.length > MAX_MENU_IMAGE_BYTES) {
      const err = new Error('图片不能超过 5MB');
      err.statusCode = 413;
      throw err;
    }
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizeUploadBaseName(fileName)}.${ext}`;
    fs.writeFileSync(path.join(MENU_UPLOAD_DIR, filename), buffer);
    return `/uploads/menu/${filename}`;
  }

  return { saveMenuImageUpload, sanitizeUploadBaseName };
}

module.exports = { createUploadService };
