/**
 * Google Apps Script to receive files from the Media Downloader app and save them to Google Drive
 * 
 * Instructions:
 * 1. Go to https://script.google.com/ and create a new project
 * 2. Copy and paste this code into the editor
 * 3. Save the project
 * 4. Deploy as a web app:
 *    - Click "Deploy" > "New deployment"
 *    - Select "Web app" as the deployment type
 *    - Set "Execute as" to "Me"
 *    - Set "Who has access" to "Anyone" (or "Anyone with Google account" for more security)
 *    - Click "Deploy"
 * 5. Copy the web app URL and add it to your .env file as GOOGLE_DRIVE_WEBHOOK_URL
 */

// Folder where files will be saved (create this folder in your Google Drive)
const FOLDER_NAME = "Media Downloader";

/**
 * Process POST requests
 */
function doPost(e) {
  try {
    // Parse the request body
    const data = JSON.parse(e.postData.contents);
    
    // Extract file information
    const fileName = data.fileName;
    const fileExtension = data.fileExtension;
    const fileContent = Utilities.base64Decode(data.fileContent);
    const metadata = data.metadata || {};
    
    // Get or create the destination folder
    const folder = getOrCreateFolder(FOLDER_NAME);
    
    // Create the file in Google Drive
    const blob = Utilities.newBlob(fileContent, getMimeType(fileExtension), fileName);
    const file = folder.createFile(blob);
    
    // Add metadata as file description
    file.setDescription(JSON.stringify(metadata, null, 2));
    
    // Return success response
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "File saved to Google Drive successfully",
      fileId: file.getId(),
      fileUrl: file.getUrl()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // Return error response
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Error: " + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Process GET requests (for testing)
 */
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "Google Drive webhook is running. Send POST requests to this URL."
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Get or create a folder in Google Drive
 */
function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(folderName);
  }
}

/**
 * Get MIME type based on file extension
 */
function getMimeType(extension) {
  const mimeTypes = {
    'txt': 'text/plain',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'xml': 'application/xml',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'mp3': 'audio/mpeg',
    'mp4': 'video/mp4',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'webm': 'video/webm',
    'zip': 'application/zip',
    'vtt': 'text/vtt'
  };
  
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}
