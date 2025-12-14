import express from 'express';
import cors from 'cors';
import ytDlpWrapModule from 'yt-dlp-wrap';
const YTDlpWrap = ytDlpWrapModule.default;
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
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

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
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
      formats: info.formats,
      description: info.description || null,
      uploader: info.uploader || info.channel || null,
      view_count: info.view_count || null,
      upload_date: info.upload_date || null,
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

// Helper function to verify JWT token and get user
async function verifyUser(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) return null;
    return user;
  } catch (error) {
    return null;
  }
}

// Get video metadata endpoint (without downloading)
app.post('/api/video-metadata', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required' });
    }

    const info = await getVideoInfo(url);
    
    // Format upload_date from YYYYMMDD to ISO string if available
    let uploadDate = null;
    if (info.upload_date) {
      // yt-dlp returns upload_date as YYYYMMDD string
      const year = info.upload_date.substring(0, 4);
      const month = info.upload_date.substring(4, 6);
      const day = info.upload_date.substring(6, 8);
      uploadDate = new Date(`${year}-${month}-${day}`).toISOString();
    }
    
    res.json({
      title: info.title,
      duration: info.duration,
      thumbnail: info.thumbnail,
      description: info.description || null,
      uploader: info.uploader || null,
      viewCount: info.view_count || null,
      uploadDate: uploadDate,
    });
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch video metadata' 
    });
  }
});

// Process video endpoint
app.post('/api/process-media', async (req, res) => {
  try {
    const { url, type, voiceIsolation, userId } = req.body;
    const authHeader = req.headers.authorization;
    const user = userId ? await verifyUser(authHeader) : null;

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
    const fullFileUrl = `${protocol}://${host}${outputUrl}`;
    
    // Save to knowledge base if user is authenticated
    let mediaItemId = null;
    let transcriptId = null;
    
    if (user && userId) {
      try {
        // Get file stats
        const fileStats = fs.statSync(outputPath);
        
        // Save media item
        const { data: mediaItem, error: mediaError } = await supabase
          .from('media_items')
          .insert({
            user_id: userId,
            title: info.title,
            source_url: url,
            media_type: type,
            file_url: fullFileUrl,
            file_path: outputPath,
            thumbnail_url: info.thumbnail,
            duration: info.duration,
            file_size: fileStats.size,
            metadata: { formats: info.formats }
          })
          .select()
          .single();
        
        if (!mediaError && mediaItem) {
          mediaItemId = mediaItem.id;
          
          // If text type, also save transcript
          if (type === 'text') {
            let transcriptContent = '';
            let vttContent = null;
            let transcriptionMethod = 'subtitles';
            
            // Get transcription content if available
            if (typeof transcription !== 'undefined' && transcription) {
              transcriptContent = transcription;
              transcriptionMethod = 'whisper';
            } else if (vttPath && fs.existsSync(vttPath)) {
              vttContent = fs.readFileSync(vttPath, 'utf8');
              // Extract text from VTT
              const textLines = vttContent.split('\n')
                .filter(line => !line.match(/^\d+:\d+:\d+/))
                .filter(line => line.trim() !== '' && !line.startsWith('WEBVTT'));
              transcriptContent = textLines.join('\n');
            }
            
            if (transcriptContent) {
              const docxUrl = docPath ? fullFileUrl : null;
              const { data: transcript, error: transcriptError } = await supabase
                .from('transcripts')
                .insert({
                  user_id: userId,
                  media_item_id: mediaItemId,
                  content: transcriptContent,
                  vtt_content: vttContent,
                  docx_file_url: docxUrl,
                  transcription_method: transcriptionMethod
                })
                .select()
                .single();
              
              if (!transcriptError && transcript) {
                transcriptId = transcript.id;
              }
            }
          }
        }
      } catch (dbError) {
        console.error('Error saving to knowledge base:', dbError);
        // Continue even if database save fails
      }
    }
    
    return res.json({
      success: true,
      message,
      fileUrl: fullFileUrl,
      mediaInfo: {
        title: info.title,
        duration: String(info.duration),
        thumbnail: info.thumbnail
      },
      savedToKnowledgeBase: !!mediaItemId,
      mediaItemId,
      transcriptId
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

// Chat API endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { conversationId, message, contextMediaIds, contextTranscriptIds } = req.body;
    const authHeader = req.headers.authorization;
    const user = await verifyUser(authHeader);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!message || !conversationId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Get user's API key preference
    let apiKey = process.env.OPENAI_API_KEY;
    let model = 'gpt-4o-mini';
    
    try {
      const { data: userApiKeys } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'openai')
        .eq('is_active', true)
        .single();
      
      if (userApiKeys) {
        // In production, decrypt the API key
        apiKey = userApiKeys.api_key_encrypted;
      }
    } catch (error) {
      console.log('Using default API key');
    }

    if (!apiKey) {
      return res.status(400).json({ success: false, message: 'No API key available' });
    }

    // Build context from transcripts if provided
    let contextMessages = [];
    if (contextTranscriptIds && contextTranscriptIds.length > 0) {
      const { data: transcripts } = await supabase
        .from('transcripts')
        .select('content')
        .in('id', contextTranscriptIds)
        .eq('user_id', user.id);
      
      if (transcripts && transcripts.length > 0) {
        const contextText = transcripts.map(t => t.content).join('\n\n');
        contextMessages.push({
          role: 'system',
          content: `You are a helpful AI assistant. Here is context from the user's knowledge base:\n\n${contextText.substring(0, 8000)}`
        });
      }
    }

    // Create OpenAI client with user's API key
    const userOpenAI = new OpenAI({ apiKey });

    // Get conversation history
    const { data: history } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    const messages = [
      ...contextMessages,
      ...(history || []).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Call OpenAI
    const completion = await userOpenAI.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
    });

    const assistantMessage = completion.choices[0].message.content;

    return res.json({
      success: true,
      message: assistantMessage,
      metadata: {
        model,
        tokens: completion.usage?.total_tokens,
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens
      }
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process chat message'
    });
  }
});

// Stripe: Create checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { userId, tier } = req.body;
    const authHeader = req.headers.authorization;
    const user = await verifyUser(authHeader);

    if (!user || user.id !== userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ success: false, message: 'Stripe not configured' });
    }

    const priceMap = {
      pro: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
      enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_monthly'
    };

    const priceId = priceMap[tier];
    if (!priceId) {
      return res.status(400).json({ success: false, message: 'Invalid tier' });
    }

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin || 'http://localhost:3000'}/settings?success=true`,
      cancel_url: `${req.headers.origin || 'http://localhost:3000'}/settings?canceled=true`,
      metadata: {
        userId: userId,
        tier: tier
      }
    });

    return res.json({ success: true, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create checkout session'
    });
  }
});

// Stripe: Webhook handler
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(400).send('Webhook secret not configured');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const tier = session.metadata?.tier;

    if (userId && tier) {
      await supabase
        .from('user_profiles')
        .update({
          subscription_tier: tier,
          subscription_status: 'active',
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription
        })
        .eq('id', userId);
    }
  } else if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    
    await supabase
      .from('user_profiles')
      .update({
        subscription_status: 'canceled',
        subscription_tier: 'free'
      })
      .eq('stripe_subscription_id', subscription.id);
  }

  res.json({ received: true });
});

// Start server
app.listen(port, () => {
  console.log(`Media downloader server running at http://localhost:${port}`);
});
