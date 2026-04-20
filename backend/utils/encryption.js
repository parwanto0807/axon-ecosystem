const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

// Use a fallback for development, but encourage using .env
const SECRET = process.env.ENCRYPTION_KEY || 'axon-ecosystem-default-secret-key-32-chars!!';

function encrypt(text) {
    if (!text) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    // Create key using PBKDF2
    const key = crypto.pbkdf2Sync(SECRET, salt, 100000, 32, 'sha256');
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    
    // Format: iv:salt:tag:encrypted
    return `${iv.toString('hex')}:${salt.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(encryptedData) {
    if (!encryptedData) return null;
    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 4) return encryptedData; // Fallback for legacy plain text

        const iv = Buffer.from(parts[0], 'hex');
        const salt = Buffer.from(parts[1], 'hex');
        const tag = Buffer.from(parts[2], 'hex');
        const encrypted = Buffer.from(parts[3], 'hex');

        const key = crypto.pbkdf2Sync(SECRET, salt, 100000, 32, 'sha256');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        
        return decrypted.toString('utf8');
    } catch (e) {
        console.error('Decryption failed:', e);
        return null;
    }
}

module.exports = { encrypt, decrypt };
