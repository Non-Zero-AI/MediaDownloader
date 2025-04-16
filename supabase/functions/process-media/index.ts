import { YTDlpWrap } from "npm:yt-dlp-wrap@2.3.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface ProcessRequest {
  url: string;
  type: 'video' | 'audio' | 'text';
}

interface VideoInfo {
  title: string;
  duration: number;
  thumbnail: string;
  formats: any[];
}

async function getVideoInfo(url: string): Promise<VideoInfo> {
  const ytDlp = new YTDlpWrap();
  
  try {
    const info = await ytDlp.getVideoInfo(url);
    return {
      title: info.title,
      duration: info.duration,
      thumbnail: info.thumbnail,
      formats: info.formats
    };
  } catch (error) {
    throw new Error(`Failed to get video info: ${error.message}`);
  }
}

async function processVideo(url: string): Promise<{ url: string; info: VideoInfo }> {
  try {
    const info = await getVideoInfo(url);
    const format = info.formats.find(f => 
      f.vcodec !== 'none' && 
      f.acodec !== 'none' && 
      f.quality === 'best'
    );

    if (!format) {
      throw new Error('No suitable video format found');
    }

    return { 
      url: format.url,
      info
    };
  } catch (error) {
    throw new Error(`Failed to process video: ${error.message}`);
  }
}

async function processAudio(url: string): Promise<{ url: string; info: VideoInfo }> {
  try {
    const info = await getVideoInfo(url);
    const format = info.formats.find(f => 
      f.vcodec === 'none' && 
      f.acodec !== 'none' && 
      f.quality === 'best'
    );

    if (!format) {
      throw new Error('No suitable audio format found');
    }

    return {
      url: format.url,
      info
    };
  } catch (error) {
    throw new Error(`Failed to process audio: ${error.message}`);
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      throw new Error("Method not allowed");
    }

    const { url, type }: ProcessRequest = await req.json();

    if (!url || !type) {
      throw new Error("Missing required fields");
    }

    let result: { url: string; info: VideoInfo };
    let message: string;

    switch (type) {
      case 'video':
        result = await processVideo(url);
        message = 'Video processed successfully. Click to download.';
        break;
      case 'audio':
        result = await processAudio(url);
        message = 'Audio processed successfully. Click to download.';
        break;
      case 'text':
        throw new Error('Text conversion is not supported in this version');
      default:
        throw new Error('Invalid media type');
    }

    return new Response(JSON.stringify({
      success: true,
      message,
      fileUrl: result.url,
      mediaInfo: {
        title: result.info.title,
        duration: result.info.duration,
        thumbnail: result.info.thumbnail
      }
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});