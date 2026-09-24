/**
 * Storage configuration for Portal Ko+Lab
 * Centralizes file validation rules per feature type.
 */

export const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'KROOMBOX_CDN';

// Dangerous extensions that are always rejected
export const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'com', 'scr', 'msi', 'ps1', 'vbs',
  'sh', 'bash', 'zsh', 'php', 'asp', 'aspx', 'jsp', 'cgi',
  'dll', 'sys', 'reg', 'hta', 'jar'
]);

// Validation config per feature type
export const FILE_VALIDATION = {
  PROFILE_AVATAR: {
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    maxSize: 5 * 1024 * 1024,
    isPrivate: false
  },
  PROFILE_ID_CARD: {
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    maxSize: 10 * 1024 * 1024,
    isPrivate: true
  },
  REPOSITORY_FILE: {
    allowedMimes: null,
    allowedExtensions: null,
    maxSize: null,
    isPrivate: true
  },
  ARTICLE_THUMBNAIL: {
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
    maxSize: 5 * 1024 * 1024,
    isPrivate: false
  },
  ARTICLE_ATTACHMENT: {
    allowedMimes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv',
      'application/zip', 'application/x-zip-compressed'
    ],
    allowedExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip'],
    maxSize: 10 * 1024 * 1024,
    isPrivate: false
  },
  STARTUP_LOGO: {
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
    maxSize: 5 * 1024 * 1024,
    isPrivate: false
  },
  EVENT_IMAGE: {
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
    maxSize: 5 * 1024 * 1024,
    isPrivate: false
  },
  SYSTEM_LOGO: {
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
    maxSize: 5 * 1024 * 1024,
    isPrivate: false
  },
  SYSTEM_BACKGROUND: {
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
    maxSize: 10 * 1024 * 1024,
    isPrivate: false
  },
  OTHER: {
    allowedMimes: null,
    allowedExtensions: null,
    maxSize: 10 * 1024 * 1024,
    isPrivate: false
  }
};

/**
 * Validate a file against a feature type rules.
 * Returns { valid: true } or { valid: false, error: string }
 */
export function validateFile(file, featureType) {
  const rules = FILE_VALIDATION[featureType] || FILE_VALIDATION.OTHER;
  const ext = (file.originalname || file.name || '').split('.').pop()?.toLowerCase() || '';

  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Format file .${ext} tidak diizinkan.` };
  }

  if (rules.allowedExtensions && !rules.allowedExtensions.includes(ext)) {
    return { valid: false, error: `Format file tidak didukung. Diizinkan: ${rules.allowedExtensions.join(', ')}.` };
  }

  if (rules.allowedMimes && !rules.allowedMimes.includes(file.mimetype || file.mime)) {
    return { valid: false, error: `Tipe file tidak valid untuk ${featureType}.` };
  }

  if (rules.maxSize && (file.size || 0) > rules.maxSize) {
    const mbLimit = (rules.maxSize / 1024 / 1024).toFixed(0);
    return { valid: false, error: `Ukuran file melebihi batas ${mbLimit} MB.` };
  }

  return { valid: true };
}
