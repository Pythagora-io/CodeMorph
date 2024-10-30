const CryptoJS = require('crypto-js');

const secretKey = process.env.ENCRYPTION_KEY;

if (!secretKey) {
  console.error('ENCRYPTION_KEY is not set in the environment variables');
  process.exit(1);
}

function encrypt(text) {
  try {
    const encryptedText = CryptoJS.AES.encrypt(text, secretKey).toString();
    console.log('Encryption successful');
    return encryptedText;
  } catch (error) {
    console.error('Error during encryption:', error.message);
    console.error(error.stack);
    throw error;
  }
}

function decrypt(ciphertext) {
  if (!ciphertext) {
    return ''; // Return an empty string for undefined or null input
  }
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    console.log('Decryption successful');
    return decryptedText;
  } catch (error) {
    console.error('Error during decryption:', error.message);
    console.error(error.stack);
    throw error;
  }
}

module.exports = { encrypt, decrypt };