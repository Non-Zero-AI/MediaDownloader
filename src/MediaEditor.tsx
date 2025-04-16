import React, { useState, useRef, useEffect } from 'react';
import { Scissors, Play, Pause, SkipBack, SkipForward, Check, X } from 'lucide-react';

interface MediaEditorProps {
  mediaUrl: string;
  mediaType: 'video' | 'audio';
  mediaDuration: number;
  onClipCreated: (clipUrl: string) => void;
  onCancel: () => void;
}

interface TimelineRef {
  element: HTMLDivElement;
  width: number;
  left: number;
}

type DragType = 'start' | 'end' | null;

const MediaEditor: React.FC<MediaEditorProps> = ({ 
  mediaUrl, 
  mediaType, 
  mediaDuration, 
  onClipCreated,
  onCancel
}) => {
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(mediaDuration);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<DragType>(null);
  
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const timelineRef = useRef<TimelineRef | null>(null);
  
  // Update current time while playing
  useEffect(() => {
    const updateTime = () => {
      if (mediaRef.current) {
        setCurrentTime(mediaRef.current.currentTime);
        
        // Pause when reaching end time during playback
        if (mediaRef.current.currentTime >= endTime) {
          mediaRef.current.pause();
          setIsPlaying(false);
          mediaRef.current.currentTime = startTime;
        }
      }
    };
    
    const interval = setInterval(updateTime, 100);
    return () => clearInterval(interval);
  }, [endTime, startTime]);
  
  // Handle dragging for markers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !timelineRef.current) return;
      
      const { width, left } = timelineRef.current;
      const relativeX = Math.max(0, Math.min(width, e.clientX - left));
      const percentage = relativeX / width;
      const newTime = percentage * mediaDuration;
      
      if (isDragging === 'start') {
        setStartTime(Math.min(newTime, endTime - 1));
      } else if (isDragging === 'end') {
        setEndTime(Math.max(newTime, startTime + 1));
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(null);
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, mediaDuration, startTime, endTime]);
  
  // Start dragging
  const startDragging = (e: React.MouseEvent, type: DragType) => {
    e.preventDefault();
    setIsDragging(type);
  };
  
  // Handle play/pause
  const togglePlayback = () => {
    if (!mediaRef.current) return;
    
    if (isPlaying) {
      mediaRef.current.pause();
    } else {
      // If at the end, go back to start
      if (currentTime >= endTime) {
        mediaRef.current.currentTime = startTime;
      }
      
      // If before start time, go to start
      if (currentTime < startTime) {
        mediaRef.current.currentTime = startTime;
      }
      
      mediaRef.current.play();
    }
    
    setIsPlaying(!isPlaying);
  };
  
  // Set current position as start time
  const markStartTime = () => {
    if (!mediaRef.current) return;
    setStartTime(mediaRef.current.currentTime);
  };
  
  // Set current position as end time
  const markEndTime = () => {
    if (!mediaRef.current) return;
    setEndTime(mediaRef.current.currentTime);
  };
  
  // Skip backward 5 seconds
  const skipBackward = () => {
    if (!mediaRef.current) return;
    mediaRef.current.currentTime = Math.max(0, mediaRef.current.currentTime - 5);
  };
  
  // Skip forward 5 seconds
  const skipForward = () => {
    if (!mediaRef.current) return;
    mediaRef.current.currentTime = Math.min(mediaDuration, mediaRef.current.currentTime + 5);
  };
  
  // Format time as MM:SS
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Create the clip
  const createClip = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      
      // Get the API URL
      const apiUrl = window.location.origin;
      
      // Send request to create clip
      const response = await fetch(`${apiUrl}/api/clip-media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaUrl: mediaUrl.startsWith('http') ? mediaUrl : `${apiUrl}${mediaUrl}`,
          mediaType,
          startTime,
          endTime,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        onClipCreated(data.fileUrl);
      } else {
        setError(data.message || 'Failed to create clip');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-medium">Media Editor</h3>
        <button 
          onClick={onCancel}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* Media Player */}
      <div className="rounded-lg overflow-hidden bg-black/30">
        {mediaType === 'video' ? (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={mediaUrl}
            className="w-full max-h-[400px] object-contain"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        ) : (
          <div className="p-8 flex items-center justify-center">
            <audio
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              src={mediaUrl}
              className="w-full"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Play className={`w-12 h-12 ${isPlaying ? 'hidden' : 'block'}`} />
              <Pause className={`w-12 h-12 ${isPlaying ? 'block' : 'hidden'}`} />
            </div>
          </div>
        )}
      </div>
      
      {/* Timeline */}
      <div className="space-y-2">
        <div 
          className="relative h-8"
          ref={(el) => {
            if (el) {
              // Store timeline element dimensions for calculations
              timelineRef.current = {
                element: el,
                width: el.offsetWidth,
                left: el.getBoundingClientRect().left
              };
            }
          }}
          onClick={(e) => {
            if (!timelineRef.current) return;
            
            // Calculate click position as percentage of timeline width
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            const newTime = percentage * mediaDuration;
            
            // Update current time and seek to that position
            if (mediaRef.current) {
              mediaRef.current.currentTime = newTime;
              setCurrentTime(newTime);
            }
          }}
        >
          {/* Timeline bar */}
          <div className="absolute inset-0 bg-white/5 rounded-full"></div>
          
          {/* Selected range */}
          <div 
            className="absolute h-full bg-purple-500/50 rounded-full"
            style={{ 
              left: `${(startTime / mediaDuration) * 100}%`, 
              width: `${((endTime - startTime) / mediaDuration) * 100}%` 
            }}
          ></div>
          
          {/* Current position */}
          <div 
            className="absolute h-full w-1 bg-white rounded-full"
            style={{ left: `${(currentTime / mediaDuration) * 100}%` }}
          ></div>
          
          {/* Start marker */}
          <div 
            className="absolute top-0 h-full w-4 bg-green-500 rounded-full cursor-pointer"
            style={{ 
              left: `${(startTime / mediaDuration) * 100}%`,
              marginLeft: "-2px" // Center the marker
            }}
            onMouseDown={(e) => startDragging(e, 'start')}
          ></div>
          
          {/* End marker */}
          <div 
            className="absolute top-0 h-full w-4 bg-red-500 rounded-full cursor-pointer"
            style={{ 
              left: `${(endTime / mediaDuration) * 100}%`,
              marginLeft: "-2px" // Center the marker
            }}
            onMouseDown={(e) => startDragging(e, 'end')}
          ></div>
        </div>
        
        {/* Time indicators */}
        <div className="flex justify-between text-sm text-gray-400">
          <span>{formatTime(startTime)}</span>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(endTime)}</span>
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button 
          onClick={markStartTime}
          className="p-2 rounded-full bg-green-500/20 hover:bg-green-500/30 transition-colors"
          title="Set start point"
        >
          <SkipBack className="w-5 h-5" />
        </button>
        
        <button 
          onClick={skipBackward}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          title="Skip back 5 seconds"
        >
          <SkipBack className="w-5 h-5" />
        </button>
        
        <button 
          onClick={togglePlayback}
          className="p-4 rounded-full bg-purple-500 hover:bg-purple-600 transition-colors"
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </button>
        
        <button 
          onClick={skipForward}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          title="Skip forward 5 seconds"
        >
          <SkipForward className="w-5 h-5" />
        </button>
        
        <button 
          onClick={markEndTime}
          className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-colors"
          title="Set end point"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>
      
      {/* Create Clip Button */}
      <div className="flex justify-center">
        <button
          onClick={createClip}
          disabled={isProcessing || startTime >= endTime}
          className="py-3 px-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium flex items-center gap-2 hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Processing...
            </>
          ) : (
            <>
              <Scissors className="w-5 h-5" />
              Create Clip ({formatTime(endTime - startTime)})
            </>
          )}
        </button>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/20 text-red-200">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default MediaEditor;
