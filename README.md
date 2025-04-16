# Media Downloader

A web application that allows you to download videos, extract audio, and transcribe content from various platforms like YouTube and Vimeo.

## Features

- **Video Download**: Download videos in the best available quality
- **Audio Extraction**: Extract high-quality audio from videos
- **Text Transcription**: Convert video to text using OpenAI Whisper or subtitles
- **Clip Editor**: Create short clips from videos and audio files with an intuitive timeline interface

## Local Development Setup

You can run this application locally on your machine. Follow these steps to set it up:

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp#installation) (the server will attempt to install this automatically, but you may need to install it manually)
- [Python](https://www.python.org/downloads/) (required for yt-dlp)

### 2. Clone and Install Dependencies

```bash
# Clone the repository (or download and extract the ZIP file)
git clone <repository-url>
cd Media_Downloader

# Install dependencies
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory with the following variables:

```
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_DRIVE_WEBHOOK_URL=your_google_drive_webhook_url_here
```

The OpenAI API key is optional but required for Whisper transcription. The Google Drive webhook URL is optional.

### 4. Run the Application

You can run the application in development mode with:

```bash
# Start the frontend development server
npm run dev

# In a separate terminal, start the backend server
npm run server
```

Or build and run the production version:

```bash
# Build and start the server
npm run start
```

The application will be available at:
- Frontend (dev mode): http://localhost:5173
- Backend server: http://localhost:3000

### 5. Debugging the Application

If you encounter issues while running the application, here are some debugging steps:

#### Windows-specific Issues

- **yt-dlp Installation**: The application attempts to install yt-dlp automatically, but you may need to install it manually:
  ```bash
  pip install -U yt-dlp
  ```
  Make sure Python and pip are installed and added to your PATH.

- **Command Not Found Errors**: If you see errors like `'which' is not recognized as an internal or external command`, this is expected on Windows systems and can be ignored as the application includes fallbacks.

#### Port Already in Use

If you see an error like `Error: listen EADDRINUSE: address already in use :::3000`:
1. Find and terminate the process using port 3000:
   ```bash
   # On Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # On macOS/Linux
   lsof -i :3000
   kill -9 <PID>
   ```
2. Or change the port in the .env file:
   ```
   PORT=3001
   ```

#### API Key Issues

- For text transcription using Whisper, you need a valid OpenAI API key in the .env file.
- Without a valid API key, the application will fall back to using subtitles if available.

#### Testing the Application

To verify the application is working correctly:
1. Open the application in your browser (http://localhost:3000)
2. Enter a YouTube URL (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ)
3. Select a format (Video, Audio, or Text)
4. Click Download
5. Once processing is complete, you should see the download link

## Replit Deployment Guide

This project has also been configured to work on Replit. Follow these steps to get it running:

### 1. Import the Project

1. Go to [Replit](https://replit.com)
2. Click "Create" or "+" to create a new repl
3. Select "Import from GitHub"
4. Paste the repository URL
5. Click "Import"

### 2. Set Up Environment Variables

1. In your Replit project, click on the lock icon (🔒) in the left sidebar to access the Secrets/Environment Variables panel
2. Add the following environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key (optional, but required for Whisper transcription)
   - `GOOGLE_DRIVE_WEBHOOK_URL`: Your Google Drive webhook URL (optional)

### 3. Run the Project

1. Click the "Run" button at the top of the Replit interface
2. The project will automatically:
   - Install dependencies
   - Build the frontend
   - Start the server

### 4. Access the Application

Once the server is running, you can access the application through the Replit webview or by clicking on the URL in the webview header.

## Using the Application

1. Enter a YouTube or Vimeo URL in the input field
2. Select the desired format (Video, Audio, or Text)
3. Click "Download" or "Transcribe"
4. Once processing is complete, click the download link to get your file
5. For video and audio files, you can click "Edit and Create Clip" to open the clip editor
6. In the clip editor:
   - Use the timeline to select start and end points
   - Use the playback controls to preview your selection
   - Click "Create Clip" to generate your clip
   - Download the resulting clip

## Troubleshooting

### Text Transcription Issues

If you encounter issues with text transcription:

1. Make sure your OpenAI API key is correctly set in the environment variables
2. Try using a video that has subtitles available as a fallback
3. Check the Replit console for any error messages

### Video/Audio Download Issues

If you encounter issues with video or audio downloads:

1. Make sure the URL is from a supported platform (YouTube, Vimeo)
2. Check if the video is restricted or private
3. Check the Replit console for any error messages

## Technical Details

- Frontend: React with TypeScript and Tailwind CSS
- Backend: Node.js with Express
- Media Processing: yt-dlp
- Transcription: OpenAI Whisper API
- Document Generation: docx library

## Design Guidelines

To maintain a consistent design style and theme throughout the application, follow these guidelines:

### Color Palette

- **Primary Background**: Dark gradient from purple to blue (`from-purple-900 via-blue-900 to-indigo-900`)
- **Accent Colors**: Purple (`purple-500`, `purple-600`) and Blue (`blue-500`, `blue-600`)
- **Text Colors**: White for primary text, light gray (`gray-300`, `gray-400`) for secondary text
- **Status Colors**: Green (`green-500`) for success, Red (`red-500`) for errors

### UI Components

- **Cards/Containers**: Use semi-transparent white backgrounds with blur effects
  - Background: `bg-white/10` or `bg-white/5` (10% or 5% opacity white)
  - Blur effect: `backdrop-blur-lg` or `backdrop-blur-sm`
  - Rounded corners: `rounded-xl` or `rounded-lg`
  - Subtle borders: `border border-white/10`
  - Shadow for depth: `shadow-2xl` where appropriate

- **Buttons**:
  - Primary buttons: Gradient background `from-purple-600 to-blue-600`
  - Hover state: Lighter gradient `from-purple-500 to-blue-500`
  - Disabled state: `opacity-50 cursor-not-allowed`
  - Include transition effects: `transition-all`

- **Form Elements**:
  - Input fields: `bg-white/5 border border-white/10`
  - Focus state: `focus:ring-2 focus:ring-purple-500 focus:border-transparent`

### Typography

- **Headings**: Bold, larger font sizes (`text-4xl font-bold` for main heading)
- **Body Text**: Regular weight, appropriate sizing for readability
- **Secondary Text**: Lighter color (`text-gray-300`, `text-gray-400`)

### Icons

- Use Lucide React icons throughout the application
- Maintain consistent sizing (e.g., `w-5 h-5` for button icons, `w-6 h-6` for feature icons)
- Use icons to enhance UI elements, not replace text where clarity is needed

### Layout

- Centered content with appropriate padding
- Card-based design for distinct sections
- Responsive design with appropriate spacing
- Grid layouts for organizing related content (`grid grid-cols-3 gap-6`)

### Animation & Interaction

- Subtle transitions for hover and active states (`transition-all`)
- Loading indicators for async operations (`animate-spin`)
- Feedback for user actions through visual cues
- Interactive timeline for media editing with visual markers

### Media Editor

- **Timeline**: Visual representation of media duration with start/end markers
- **Controls**: Play/pause, skip forward/backward, set start/end points
- **Preview**: Video/audio player for previewing selected clip
- **Feedback**: Clear visual indication of selected time range

When extending the application with new features, refer to these guidelines to ensure the new elements match the existing design language and maintain visual consistency.

## License

This project is open source and available under the MIT License.
