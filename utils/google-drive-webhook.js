import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import fetch from 'node-fetch';

const readFileAsync = promisify(fs.readFile);

/**
 * Send a file to Google Drive via webhook
 * @param {string} filePath - Path to the file to send
 * @param {string} webhookUrl - URL of the webhook (e.g., Google Apps Script Web App URL)
 * @param {Object} metadata - Additional metadata for the file
 * @returns {Promise<Object>} - Response from the webhook
 */
export async function sendFileToGoogleDrive(filePath, webhookUrl, metadata = {}) {
  try {
    if (!webhookUrl) {
      throw new Error('Webhook URL is required');
    }

    // Read the file
    const fileContent = await readFileAsync(filePath);
    const fileName = path.basename(filePath);
    const fileExtension = path.extname(filePath).substring(1);
    
    // Prepare the payload
    const payload = {
      fileName,
      fileExtension,
      fileContent: fileContent.toString('base64'),
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        source: 'media-downloader-app'
      }
    };
    
    // Send the file to Google Drive via webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`Webhook request failed with status ${response.status}`);
    }
    
    const result = await response.json();
    console.log(`File sent to Google Drive: ${fileName}`);
    return result;
  } catch (error) {
    console.error('Error sending file to Google Drive:', error);
    throw new Error(`Failed to send file to Google Drive: ${error.message}`);
  }
}
