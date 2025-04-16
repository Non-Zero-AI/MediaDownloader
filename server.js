import express from 'express';
import cors from 'cors';
import ytDlpWrapModule from 'yt-dlp-wrap';
const YTDlpWrap = ytDlpWrapModule.default;
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { convertVttToDoc } from './utils/vtt-to-doc.js';
import { sendFileToGoogleDrive } from './utils/google-drive-webhook.js';
import { execSync } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';

// Load environment variables
dotenv.config();

// Check and install yt-dlp if not available
try {
  console.log('Checking for yt-dlp...');
  // Use different commands based on the operating system
  if (process.platform === 'win32') {
    // Windows
    try {
      execSync('where yt-dlp', { stdio: 'inherit' });
      console.log('yt-dlp found on Windows');
    } catch (e) {
      console.log('yt-dlp not found on Windows, installing...');
      execSync('pip install -U yt-dlp', { stdio: 'inherit' });
    }
  } else {
    // Unix-like systems (Linux, macOS)
    execSync('which yt-dlp || echo "Not found"', { stdio: 'inherit' });
    console.log('Installing yt-dlp if not found...');
    execSync('pip install -U yt-dlp', { stdio: 'inherit' });
  }
  console.log('yt-dlp installation completed');
} catch (error) {
  console.warn('Could not install yt-dlp automatically:', error.message);
  console.log('Please install yt-dlp manually if needed');
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/downloads', express.static(downloadsDir));

// Serve static files from the dist directory (for production)
if (fs.existsSync(path.join(__dirname, 'dist'))) {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  // For any other routes, serve the index.html file
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/downloads')) {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
  });
  
  console.log('Serving frontend from dist directory');
}

// Initialize yt-dlp with path detection for Replit
let ytDlp;
try {
  // Try to find yt-dlp in PATH
  let ytDlpPath;
  if (process.platform === 'win32') {
    // Windows
    ytDlpPath = execSync('where yt-dlp').toString().trim().split('\r\n')[0];
  } else {
    // Unix-like systems
    ytDlpPath = execSync('which yt-dlp').toString().trim();
  }
  console.log(`Found yt-dlp at: ${ytDlpPath}`);
  ytDlp = new YTDlpWrap(ytDlpPath);
} catch (error) {
  console.log('Could not find yt-dlp in PATH, using default initialization');
  ytDlp = new YTDlpWrap();
}

// Helper function to get video info
async function getVideoInfo(url) {
  try {
    const info = await ytDlp.getVideoInfo(url);
    return {
      title: info.title,
      duration: info.duration,
      thumbnail: info.thumbnail,
      formats: info.formats
    };
  } catch (error) {
    console.error('Error getting video info:', error);
    throw new Error(`Failed to get video info: ${error.message}`);
  }
}

// Helper function to transcribe audio using Whisper
async function transcribeAudio(audioPath) {
  try {
    console.log(`Transcribing audio file: ${audioPath}`);
    
    // Check if OpenAI API key is set
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      console.error('OpenAI API key is not set correctly in .env file');
      throw new Error('OpenAI API key is not set. Please add your API key to the .env file.');
    }
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "whisper-1",
    });
    
    console.log("Transcription completed successfully");
    return transcription.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

// Process video endpoint
app.post('/api/process-media', async (req, res) => {
  try {
    const { url, type, voiceIsolation } = req.body;

    if (!url || !type) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const info = await getVideoInfo(url);
    const sanitizedTitle = info.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    let outputPath;
    let outputUrl;
    let message;

    switch (type) {
      case 'video':
        outputPath = path.join(downloadsDir, `${sanitizedTitle}.mp4`);
        await ytDlp.exec([
          url,
          '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
          '-o', outputPath
        ]);
        outputUrl = `/downloads/${sanitizedTitle}.mp4`;
        message = 'Video downloaded successfully. Click to download.';
        break;
        
      case 'audio':
        outputPath = path.join(downloadsDir, `${sanitizedTitle}.mp3`);
        
        // Download audio using yt-dlp
        await ytDlp.exec([
          url,
          '-x', '--audio-format', 'mp3',
          '-o', outputPath
        ]);
        
        // Apply voice isolation if requested
        if (voiceIsolation) {
          console.log('Applying voice isolation...');
          
          // Create a temporary file path for the processed audio
          const tempOutputPath = path.join(downloadsDir, `${sanitizedTitle}_processed.mp3`);
          
          try {
            // Check if the original file exists
            if (!fs.existsSync(outputPath)) {
              throw new Error(`Original audio file not found: ${outputPath}`);
            }
            
            await new Promise((resolve, reject) => {
              // Use FFmpeg to isolate vocals
              // This filter extracts the center channel where vocals are typically mixed
              ffmpeg(outputPath)
                .audioFilters([
                  // Extract vocals using center channel extraction technique
                  // This works by removing sounds that are common to both left and right channels
                  'pan=stereo|c0=c0|c1=c1',  // Ensure stereo output
                  'stereotools=phasel=1',    // Phase left channel by 180 degrees
                  'pan=mono|c0=0.5*c0+0.5*c1', // Mix left and right channels
                  'loudnorm=I=-16:TP=-1.5:LRA=11', // Normalize audio levels
                  'acompressor=threshold=0.089:ratio=9:attack=200:release=1000' // Compress to enhance vocals
                ])
                .output(tempOutputPath)
                .on('end', () => {
                  console.log('Voice isolation processing completed');
                  resolve();
                })
                .on('error', (err) => {
                  console.error('Error during voice isolation processing:', err);
                  reject(err);
                })
                .run();
            });
            
            // Replace the original file with the processed file
            fs.renameSync(tempOutputPath, outputPath);
            console.log('Voice isolation completed successfully');
            message = 'Audio extracted with voice isolation. Click to download.';
          } catch (error) {
            console.error('Voice isolation failed:', error);
            message = 'Audio extracted successfully (voice isolation failed). Click to download.';
          }
        } else {
          message = 'Audio extracted successfully. Click to download.';
        }
        
        outputUrl = `/downloads/${sanitizedTitle}.mp3`;
        break;
        
      case 'text':
        let transcription;
        let vttPath;
        let textPath;
        let docPath;
        
        try {
          // First try to download the audio and transcribe with Whisper
          const audioPath = path.join(downloadsDir, `${sanitizedTitle}.mp3`);
          await ytDlp.exec([
            url,
            '-x', '--audio-format', 'mp3',
            '-o', audioPath
          ]);
          
          // Transcribe the audio using Whisper
          try {
            transcription = await transcribeAudio(audioPath);
            
            // Save the transcription to a text file
            textPath = path.join(downloadsDir, `${sanitizedTitle}.txt`);
            fs.writeFileSync(textPath, transcription);
            
            // Save the transcription to a VTT file
            vttPath = path.join(downloadsDir, `${sanitizedTitle}.vtt`);
            const vttContent = `WEBVTT

1
00:00:00.000 --> 00:${String(info.duration).padStart(2, '0')}:00.000
${transcription}
`;
            fs.writeFileSync(vttPath, vttContent);
          } catch (whisperError) {
            console.error('Whisper transcription failed, falling back to subtitles:', whisperError);
            
            // If Whisper fails, try to download subtitles as fallback
            console.log('Attempting to download subtitles as fallback...');
            const subtitlePath = path.join(downloadsDir, `${sanitizedTitle}.vtt`);
            try {
              // First try to get manual subtitles
              console.log('Trying to get manual subtitles...');
              await ytDlp.exec([
                url,
                '--write-sub', '--skip-download',
                '--sub-format', 'vtt',
                '-o', subtitlePath,
                '--verbose'
              ]);
              
              // If no manual subtitles, try auto-generated ones
              console.log('Checking if manual subtitles were found...');
              let subtitleFiles = fs.readdirSync(downloadsDir).filter(file => 
                file.startsWith(sanitizedTitle) && file.endsWith('.vtt')
              );
              
              if (subtitleFiles.length === 0) {
                console.log('No manual subtitles found, trying auto-generated subtitles...');
                await ytDlp.exec([
                  url,
                  '--write-auto-sub', '--skip-download',
                  '--sub-format', 'vtt',
                  '-o', subtitlePath,
                  '--verbose'
                ]);
              }
              
              console.log('Subtitle download command completed');
              
              // List all files in downloads directory
              console.log('Files in downloads directory:');
              const allFiles = fs.readdirSync(downloadsDir);
              console.log(allFiles);
              
              // Find the subtitle file
              subtitleFiles = allFiles.filter(file => 
                file.startsWith(sanitizedTitle) && file.endsWith('.vtt')
              );
              
              console.log(`Found ${subtitleFiles.length} subtitle files:`, subtitleFiles);
              
              if (subtitleFiles.length === 0) {
                throw new Error('No subtitles found and Whisper transcription failed. Please set your OpenAI API key in the .env file or use a video with subtitles.');
              }
              
              vttPath = path.join(downloadsDir, subtitleFiles[0]);
              
              // Read the VTT file content
              const vttContent = fs.readFileSync(vttPath, 'utf8');
              
              // Extract text from VTT
              const textLines = vttContent.split('\n')
                .filter(line => !line.match(/^\d+:\d+:\d+/)) // Filter out timestamp lines
                .filter(line => line.trim() !== '' && !line.startsWith('WEBVTT')); // Filter out empty lines and WEBVTT header
              
              transcription = textLines.join('\n');
              
              // Save the extracted text to a file
              textPath = path.join(downloadsDir, `${sanitizedTitle}.txt`);
              fs.writeFileSync(textPath, transcription);
            } catch (subtitleError) {
              console.error('Error downloading subtitles:', subtitleError);
              throw new Error(`Failed to download subtitles: ${subtitleError.message}. Please set your OpenAI API key in the .env file or use a video with subtitles.`);
            }
          }
          
          // Convert VTT to DOC
          docPath = path.join(downloadsDir, `${sanitizedTitle}.docx`);
          await convertVttToDoc(vttPath, docPath);
          
        } catch (error) {
          console.error('All text extraction methods failed:', error);
          throw new Error('Failed to extract text: ' + error.message);
        }
        
        // Send to Google Drive if webhook URL is provided
        if (process.env.GOOGLE_DRIVE_WEBHOOK_URL && process.env.GOOGLE_DRIVE_WEBHOOK_URL !== 'your_google_drive_webhook_url_here') {
          try {
            await sendFileToGoogleDrive(docPath, process.env.GOOGLE_DRIVE_WEBHOOK_URL, {
              title: info.title,
              duration: info.duration,
              source: url
            });
            console.log(`File sent to Google Drive: ${path.basename(docPath)}`);
          } catch (error) {
            console.error('Error sending to Google Drive:', error);
            // Continue even if Google Drive upload fails
          }
        }
        
        outputUrl = `/downloads/${sanitizedTitle}.docx`;
        message = 'Audio transcribed successfully. Click to download the document.';
        break;
        
      default:
        throw new Error('Invalid media type');
    }

    // Get the host from the request or use localhost as fallback
    const host = req.get('host') || `localhost:${port}`;
    const protocol = req.protocol || 'http';
    
    return res.json({
      success: true,
      message,
      fileUrl: `${protocol}://${host}${outputUrl}`,
      mediaInfo: {
        title: info.title,
        duration: String(info.duration),
        thumbnail: info.thumbnail
      }
    });
  } catch (error) {
    console.error('Error processing media:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to process media'
    });
  }
});

// Clip media endpoint
app.post('/api/clip-media', async (req, res) => {
  try {
    const { mediaUrl, mediaType, startTime, endTime } = req.body;
    
    if (!mediaUrl || !mediaType || startTime === undefined || endTime === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    // Extract the file path from the URL
    let filePath;
    if (mediaUrl.startsWith('http')) {
      // For external URLs, we need to download the file first
      const fileName = `temp_${Date.now()}.${mediaType === 'video' ? 'mp4' : 'mp3'}`;
      filePath = path.join(downloadsDir, fileName);
      
      // Download the file
      await new Promise((resolve, reject) => {
        ffmpeg(mediaUrl)
          .output(filePath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
    } else {
      // For local URLs, extract the path
      const urlPath = new URL(mediaUrl, 'http://localhost').pathname;
      filePath = path.join(__dirname, urlPath);
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Media file not found' });
    }
    
    // Generate output file name
    const fileExt = mediaType === 'video' ? 'mp4' : 'mp3';
    const outputFileName = `clip_${Date.now()}.${fileExt}`;
    const outputPath = path.join(downloadsDir, outputFileName);
    
    // Create the clip using FFmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .setStartTime(startTime)
        .setDuration(endTime - startTime)
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
    
    // Generate URL for the clip
    const host = req.get('host') || `localhost:${port}`;
    const protocol = req.protocol || 'http';
    const clipUrl = `${protocol}://${host}/downloads/${outputFileName}`;
    
    return res.json({
      success: true,
      message: 'Clip created successfully',
      fileUrl: clipUrl
    });
  } catch (error) {
    console.error('Error creating clip:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create clip'
    });
  }
});

// Webhook endpoint for Google Drive integration
app.post('/api/webhook/google-drive', async (req, res) => {
  try {
    const { filePath, metadata } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ success: false, message: 'Missing file path' });
    }
    
    if (!process.env.GOOGLE_DRIVE_WEBHOOK_URL || process.env.GOOGLE_DRIVE_WEBHOOK_URL === 'your_google_drive_webhook_url_here') {
      return res.status(400).json({ success: false, message: 'Google Drive webhook URL not configured' });
    }
    
    const fullPath = path.join(__dirname, filePath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    
    // Send the file to Google Drive
    const result = await sendFileToGoogleDrive(fullPath, process.env.GOOGLE_DRIVE_WEBHOOK_URL, metadata);
    
    return res.json({
      success: true,
      message: 'File sent to Google Drive successfully',
      result
    });
  } catch (error) {
    console.error('Error in Google Drive webhook:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send file to Google Drive'
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Media downloader server running at http://localhost:${port}`);
});
