/**
 * Google Apps Script for Portal Finder Contact Form
 * 
 * Instructions:
 * 1. Create a Google Sheet named "Portal Finder Contact Forms"
 * 2. Add headers in row 1: Timestamp | Name | Email | Subject | Message
 * 3. Go to Extensions > Apps Script
 * 4. Replace the default code with this script
 * 5. Save and deploy as Web App
 * 6. Set Execute as: Me, Access: Anyone
 * 7. Copy the Web App URL to config.js
 */

function doPost(e) {
  try {
    // Get the active spreadsheet
    const sheet = SpreadsheetApp.getActiveSheet();
    
    // Check if postData exists
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          success: false, 
          error: 'No POST data received',
          info: 'This endpoint expects POST requests with JSON data'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Parse the JSON data from the request
    const data = JSON.parse(e.postData.contents);
    
    // Validate required fields
    if (!data.name || !data.email || !data.subject || !data.message) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'Missing required fields' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'Invalid email format' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Get current timestamp
    const timestamp = new Date();
    
    // Prepare row data
    const rowData = [
      timestamp,
      data.name,
      data.email,
      data.subject,
      data.message
    ];
    
    // Append the data to the sheet
    sheet.appendRow(rowData);
    
    // Optional: Send email notification to admin
    // Uncomment and modify the email address below if you want email notifications
    /*
    const adminEmail = 'your-email@example.com';
    const subject = `New Contact Form Submission: ${data.subject}`;
    const body = `
      New contact form submission from Portal Finder:
      
      Name: ${data.name}
      Email: ${data.email}
      Subject: ${data.subject}
      Message: ${data.message}
      
      Submitted at: ${timestamp}
    `;
    
    GmailApp.sendEmail(adminEmail, subject, body);
    */
    
    // Return success response with CORS headers
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        message: 'Contact form submitted successfully',
        timestamp: timestamp
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Log error for debugging
    console.error('Error processing contact form:', error);
    console.log('Request object:', JSON.stringify(e));
    
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: 'Failed to process form submission',
        details: error.toString(),
        requestInfo: e ? {
          method: e.method || 'unknown',
          contentLength: e.contentLength || 0,
          hasPostData: !!(e && e.postData)
        } : 'No request object'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // Handle GET requests (for testing)
  return ContentService
    .createTextOutput(JSON.stringify({ 
      success: true, 
      message: 'Portal Finder Contact Form Handler is running',
      timestamp: new Date()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Optional: Function to get recent submissions (for admin dashboard)
function getRecentSubmissions(limit = 10) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return { success: true, data: [] };
    }
    
    const startRow = Math.max(2, lastRow - limit + 1);
    const range = sheet.getRange(startRow, 1, lastRow - startRow + 1, 5);
    const values = range.getValues();
    
    const submissions = values.map(row => ({
      timestamp: row[0],
      name: row[1],
      email: row[2],
      subject: row[3],
      message: row[4]
    }));
    
    return { success: true, data: submissions.reverse() };
    
  } catch (error) {
    console.error('Error getting submissions:', error);
    return { success: false, error: error.toString() };
  }
}