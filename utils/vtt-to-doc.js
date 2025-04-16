import fs from 'fs';
import path from 'path';
import { Document, Paragraph, TextRun, Packer } from 'docx';
import vttToJson from 'vtt-to-json';
import { promisify } from 'util';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

/**
 * Convert VTT file to DOC format
 * @param {string} vttPath - Path to the VTT file
 * @param {string} docPath - Path to save the DOC file
 * @returns {Promise<string>} - Path to the created DOC file
 */
export async function convertVttToDoc(vttPath, docPath) {
  try {
    console.log(`Starting VTT to DOC conversion: ${vttPath} -> ${docPath}`);
    
    // Read the VTT file
    console.log(`Reading VTT file: ${vttPath}`);
    const vttContent = await readFileAsync(vttPath, 'utf8');
    console.log(`VTT file content (first 100 chars): ${vttContent.substring(0, 100)}...`);
    
    // Parse VTT to JSON
    console.log('Parsing VTT to JSON');
    const jsonData = await vttToJson(vttContent);
    console.log(`Parsed ${jsonData.length} subtitle entries`);
    
    // Create a new Document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Transcript",
                  bold: true,
                  size: 28,
                }),
              ],
            }),
            new Paragraph({
              text: "",
            }),
            ...jsonData.map(item => {
              return new Paragraph({
                children: [
                  new TextRun({
                    text: `[${formatTime(item.start)} - ${formatTime(item.end)}] `,
                    bold: true,
                    size: 20,
                  }),
                  new TextRun({
                    text: item.content,
                    size: 24,
                  }),
                ],
              });
            }),
          ],
        },
      ],
    });
    
    // Create directory if it doesn't exist
    const dir = path.dirname(docPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Save the document
    const buffer = await Packer.toBuffer(doc);
    await writeFileAsync(docPath, buffer);
    
    console.log(`DOC file created at: ${docPath}`);
    return docPath;
  } catch (error) {
    console.error('Error converting VTT to DOC:', error);
    throw new Error(`Failed to convert VTT to DOC: ${error.message}`);
  }
}

/**
 * Format time in seconds to HH:MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time
 */
function formatTime(seconds) {
  const date = new Date(seconds * 1000);
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const secs = date.getUTCSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${secs}`;
}
