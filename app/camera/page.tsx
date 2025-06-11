// "use client";

// import { useState, useRef, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { useRouter } from "next/navigation";

// type Emotions = {
//   neutral: number;
//   happy: number;
//   sad: number;
//   angry: number;
//   fearful: number;
//   disgusted: number;
//   surprised: number;
// };

// export default function CameraPage() {
//   const [isStreaming, setIsStreaming] = useState(false);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [backendError, setBackendError] = useState<string | null>(null);
//   const [isRecording, setIsRecording] = useState(false);
//   const [isUploading, setIsUploading] = useState(false);
//   const [recordingError, setRecordingError] = useState<string | null>(null);
//   const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
//   const [uploadedAudio, setUploadedAudio] = useState<string | null>(null);
//   const [separateAudioRecording, setSeparateAudioRecording] = useState(false);
//   const [gazeDirection, setGazeDirection] = useState<string>("center");
//   const [emotions, setEmotions] = useState<Emotions>({
//     neutral: 0,
//     happy: 0,
//     sad: 0,
//     angry: 0,
//     fearful: 0,
//     disgusted: 0,
//     surprised: 0,
//   });
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const streamRef = useRef<MediaStream | null>(null);
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const intervalRef = useRef<NodeJS.Timeout | null>(null);
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const chunksRef = useRef<Blob[]>([]);
//   const audioRecorderRef = useRef<MediaRecorder | null>(null);
//   const audioChunksRef = useRef<Blob[]>([]);
//   const router = useRouter();
//   const audioContextRef = useRef<AudioContext | null>(null);
//   const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
//   const lowPassNodeRef = useRef<BiquadFilterNode | null>(null);
//   const highPassNodeRef = useRef<BiquadFilterNode | null>(null);
//   const [recordingDuration, setRecordingDuration] = useState<number>(0);
//   const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

//   const detectCombined = async () => {
//     // First, make sure video ref exists
//     if (!videoRef.current || !canvasRef.current || isProcessing || isRecording) return;
    
//     const videoElement = videoRef.current;
    
//     // Extra safety check - if at any point videoRef becomes null, exit
//     if (!videoElement) return;
    
//     // Wait for video dimensions
//     if (!videoElement.videoWidth || !videoElement.videoHeight) {
//       console.log("Waiting for video dimensions to be available...");
//       return; // Skip this detection cycle if video isn't ready
//     }
  
//     try {
//       setIsProcessing(true);
//       setBackendError(null);
  
//       // Test connection first
//       const isConnected = await testApiConnection();
//       if (!isConnected) {
//         setIsProcessing(false);
//         return;
//       }
  
//       // Capture the current frame from video
//       const canvas = document.createElement("canvas");
      
//       // Extra safety check - we already checked above but double-checking for safety
//       if (!videoElement) {
//         setIsProcessing(false);
//         return;
//       }
  
//       canvas.width = videoElement.videoWidth;
//       canvas.height = videoElement.videoHeight;
      
//       const ctx = canvas.getContext("2d");
//       if (!ctx) {
//         setIsProcessing(false);
//         return;
//       }
  
//       ctx.drawImage(videoElement, 0, 0);
//       const imageData = canvas.toDataURL("image/jpeg", 0.8);
  
//       // Send to combined backend API
//       const response = await fetch(
//         `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5328"}/api/detect-combined`,
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Accept: "application/json",
//           },
//           body: JSON.stringify({ image: imageData }),
//         }
//       );
  
//       if (!response.ok) {
//         throw new Error("Failed to process frame");
//       }
  
//       const result = await response.json();
  
//       // More checks to ensure videoElement still exists throughout the function
//       if (!videoElement) {
//         setIsProcessing(false);
//         return;
//       }
  
//       if (result.success && result.face_detected) {
//         // Update emotions
//         setEmotions(result.emotions);
  
//         // Update gaze
//         if (result.gaze) {
//           setGazeDirection(result.gaze.direction);
  
//           // Update canvas with gaze visualization
//           const canvasElement = canvasRef.current;
//           if (!canvasElement || !videoElement) {
//             setIsProcessing(false);
//             return;
//           }
  
//           const displayRect = videoElement.getBoundingClientRect();
//           const displayWidth = displayRect.width;
//           const displayHeight = displayRect.height;
  
//           // Update canvas size if needed
//           if (canvasElement.width !== displayWidth || canvasElement.height !== displayHeight) {
//             canvasElement.width = displayWidth;
//             canvasElement.height = displayHeight;
//           }
  
//           // If recording, clear the canvas and return
//           if (isRecording) {
//             const overlayCtx = canvasElement.getContext("2d");
//             if (overlayCtx) {
//               overlayCtx.clearRect(0, 0, displayWidth, displayHeight);
//             }
//             setIsProcessing(false);
//             return;
//           }
  
//           // Additional safety checks before proceeding
//           if (!videoElement.videoWidth || !videoElement.videoHeight) {
//             setIsProcessing(false);
//             return;
//           }
  
//           // Calculate scaling factors
//           const scaleX = displayWidth / videoElement.videoWidth;
//           const scaleY = displayHeight / videoElement.videoHeight;
//           const scale = Math.min(scaleX, scaleY);
  
//           // Calculate centering offsets
//           const offsetX = (displayWidth - videoElement.videoWidth * scale) / 2;
//           const offsetY = (displayHeight - videoElement.videoHeight * scale) / 2;
  
//           // Get overlay context
//           const overlayCtx = canvasElement.getContext("2d", {
//             willReadFrequently: true,
//           });
//           if (!overlayCtx) {
//             setIsProcessing(false);
//             return;
//           }
  
//           // Clear previous drawings
//           overlayCtx.clearRect(0, 0, displayWidth, displayHeight);
  
//           // Set up transform for proper scaling and centering
//           overlayCtx.save();
//           overlayCtx.translate(offsetX, offsetY);
//           overlayCtx.scale(scale, scale);
  
//           // Draw minimal face outline
//           if (result.gaze.landmarks) {
//             overlayCtx.strokeStyle = "rgba(255, 255, 255, 0.3)"; // Very subtle white outline
//             overlayCtx.lineWidth = 1;
  
//             // Draw face outline using selected landmarks
//             const faceOutlinePoints = result.gaze.landmarks.filter(
//               (_: [number, number], index: number) =>
//                 // Only use points that form the face outline
//                 [
//                   10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
//                   397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
//                   172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
//                 ].includes(index)
//             );
  
//             if (faceOutlinePoints.length > 0) {
//               overlayCtx.beginPath();
//               overlayCtx.moveTo(
//                 faceOutlinePoints[0][0] * videoElement.videoWidth,
//                 faceOutlinePoints[0][1] * videoElement.videoHeight
//               );
  
//               faceOutlinePoints.forEach((point: [number, number]) => {
//                 overlayCtx.lineTo(
//                   point[0] * videoElement.videoWidth,
//                   point[1] * videoElement.videoHeight
//                 );
//               });
  
//               overlayCtx.closePath();
//               overlayCtx.stroke();
//             }
//           }
  
//           // Draw minimal gaze indicator
//           if (result.gaze.gaze_arrow) {
//             const { start, end } = result.gaze.gaze_arrow;
//             overlayCtx.strokeStyle = "rgba(255, 255, 255, 0.4)"; // Subtle white
//             overlayCtx.lineWidth = 2;
  
//             // Draw a simple dot at the eye center
//             overlayCtx.beginPath();
//             overlayCtx.arc(
//               start.x * videoElement.videoWidth,
//               start.y * videoElement.videoHeight,
//               3,
//               0,
//               2 * Math.PI
//             );
//             overlayCtx.fill();
  
//             // Draw a small line indicating direction
//             overlayCtx.beginPath();
//             overlayCtx.moveTo(
//               start.x * videoElement.videoWidth,
//               start.y * videoElement.videoHeight
//             );
//             overlayCtx.lineTo(
//               end.x * videoElement.videoWidth,
//               end.y * videoElement.videoHeight
//             );
//             overlayCtx.stroke();
//           }
  
//           // Draw minimal gaze direction text
//           overlayCtx.font = "16px system-ui"; // Smaller, system font
//           overlayCtx.textBaseline = "top";
//           const text = result.gaze.direction.toUpperCase();
  
//           overlayCtx.fillStyle = "rgba(255, 255, 255, 0.5)";
//           overlayCtx.fillText(text, 10, 10);
  
//           // Restore the original transform
//           overlayCtx.restore();
//         }
//       }
//     } catch (error) {
//       console.error("Error in combined detection:", error);
//       setBackendError(
//         error instanceof Error
//           ? error.message
//           : "Failed to process frame. Please try again."
//       );
//     } finally {
//       setIsProcessing(false);
//     }
//   };
  
  

//   // const startCamera = async () => {
//   //   try {
//   //     const stream = await navigator.mediaDevices.getUserMedia({
//   //       video: true,
//   //       audio: {
//   //         echoCancellation: false,
//   //         noiseSuppression: false,
//   //         autoGainControl: false,
//   //         sampleRate: 44100,
//   //         channelCount: 2,
//   //         sampleSize: 16,
//   //       },
//   //     });

//   //     if (videoRef.current) {
//   //       videoRef.current.srcObject = stream;
//   //       // Wait for video to be ready
//   //       await new Promise((resolve) => {
//   //         if (!videoRef.current) return;

//   //         const checkVideo = () => {
//   //           if (videoRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight) {
//   //             resolve(true);
//   //           } else {
//   //             // Keep checking if not ready
//   //             setTimeout(checkVideo, 100);
//   //           }
//   //         };

//   //         videoRef.current.onloadedmetadata = () => {
//   //           if (videoRef.current) {
//   //             videoRef.current.play();
//   //             resolve(true);
//   //           }
//   //         };
//   //       });

//   //       // Initialise canvas size
//   //       if (canvasRef.current && videoRef.current) {
//   //         const videoRect = videoRef.current.getBoundingClientRect();
//   //         canvasRef.current.width = videoRect.width;
//   //         canvasRef.current.height = videoRect.height;
//   //       }
//   //     }

//   //     streamRef.current = stream;
//   //     setIsStreaming(true);

//   //     // Start detection loop with combined detection
//   //     intervalRef.current = setInterval(detectCombined, 100);
//   //   } catch (error) {
//   //     console.error("Error accessing camera:", error);
//   //     alert(
//   //       "Failed to access camera or microphone. Please make sure you have granted necessary permissions."
//   //     );
//   //   }
//   // };
//   const startCamera = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: {
//           echoCancellation: false,
//           noiseSuppression: false,
//           autoGainControl: false,
//           sampleRate: 44100,
//           channelCount: 2,
//           sampleSize: 16,
//         },
//       });
  
//       if (videoRef.current) {
//         videoRef.current.srcObject = stream;
        
//         // Wait for video to be ready with dimensions
//         await new Promise((resolve, reject) => {
//           if (!videoRef.current) return reject('Video element is null');
        
          
//           // Function to check video dimensions
//           const checkVideo = () => {
//             if (videoRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight) {
//               console.log("Video dimensions ready:", videoRef.current.videoWidth, videoRef.current.videoHeight);
//               resolve(true);
//             } else {
//               // Keep checking if not ready
//               // setTimeout(checkVideo, 100);
//               setTimeout(() => {
//                 intervalRef.current = setInterval(detectCombined, 100);
//               }, 500);
//             }
//           };
          
//           videoRef.current.onloadedmetadata = () => {
//             if (videoRef.current) {
//               videoRef.current.play()
//                 .then(() => {
//                   // Start checking for dimensions AFTER play has started
//                   checkVideo();
//                 })
//                 .catch(console.error);
//             }
//           };
//         });
  
//         // Initialise canvas size
//         if (canvasRef.current && videoRef.current) {
//           const videoRect = videoRef.current.getBoundingClientRect();
//           canvasRef.current.width = videoRect.width;
//           canvasRef.current.height = videoRect.height;
//         }
  
//         streamRef.current = stream;
//         setIsStreaming(true);
  
//         // Start detection loop with combined detection
//         intervalRef.current = setInterval(detectCombined, 100);
//       }
//     } catch (error) {
//       console.error("Error accessing camera:", error);
//       alert(
//         "Failed to access camera or microphone. Please make sure you have granted necessary permissions."
//       );
//     }
//   };
//   const stopCamera = () => {
//     if (streamRef.current) {
//       streamRef.current.getTracks().forEach((track) => track.stop());
//       if (videoRef.current) {
//         videoRef.current.srcObject = null;
//       }
//       streamRef.current = null;
//       setIsStreaming(false);
//     }
//     if (intervalRef.current) {
//       clearInterval(intervalRef.current);
//       intervalRef.current = null;
//     }
//   };

//   // Update the testApiConnection function
//   const testApiConnection = async () => {
//     try {
//       // Use the absolute URL with the correct port
//       const response = await fetch("http://localhost:5328/api/test", {
//         // Add these headers to help with CORS
//         headers: {
//           Accept: "application/json",
//         },
//       });
//       const data = await response.json();
//       console.log("API test response:", data);
//       return true;
//     } catch (error) {
//       console.error("API connection test failed:", error);
//       setBackendError(
//         "Cannot connect to Python server. Make sure it's running on port 5328."
//       );
//       return false;
//     }
//   };

//   // Call this in useEffect or before starting the camera
//   useEffect(() => {
//     testApiConnection();

//     return () => {
//       if (intervalRef.current) {
//         clearInterval(intervalRef.current);
//       }
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach((track) => track.stop());
//       }
//     };
//   }, []);

//   // Add this function to get the dominant emotion
//   const getDominantEmotion = (emotions: Record<string, number>): string => {
//     if (Object.keys(emotions).length === 0) return "none";

//     let maxEmotion = "";
//     let maxValue = 0;

//     Object.entries(emotions).forEach(([emotion, value]) => {
//       if (value > maxValue) {
//         maxValue = value;
//         maxEmotion = emotion;
//       }
//     });

//     return maxEmotion;
//   };

//   const startRecording = async () => {
//     if (!streamRef.current) return;

//     try {
//       setRecordingError(null);
//       setRecordingDuration(0);

//       // Clear the canvas when starting recording
//       if (canvasRef.current) {
//         const ctx = canvasRef.current.getContext("2d");
//         if (ctx) {
//           ctx.clearRect(
//             0,
//             0,
//             canvasRef.current.width,
//             canvasRef.current.height
//           );
//         }
//       }

//       // Check supported MIME types for MP4
//       const mimeTypes = [
//         "video/mp4;codecs=avc1.42E01E,mp4a.40.2", // H.264 + AAC
//         "video/mp4",
//       ];

//       let selectedMimeType = "";
//       for (const mimeType of mimeTypes) {
//         if (MediaRecorder.isTypeSupported(mimeType)) {
//           console.log("Using MIME type:", mimeType);
//           selectedMimeType = mimeType;
//           break;
//         }
//       }

//       if (!selectedMimeType) {
//         throw new Error("No supported MP4 video format found");
//       }

//       // High quality settings for MP4
//       const options = {
//         mimeType: selectedMimeType,
//         videoBitsPerSecond: 8000000,
//         audioBitsPerSecond: 320000,
//         videoKeyFrameInterval: 1000,
//         videoQuality: 1.0,
//         audioSampleRate: 44100,
//         audioChannelCount: 2,
//       };

//       const mediaRecorder = new MediaRecorder(streamRef.current, options);

//       mediaRecorderRef.current = mediaRecorder;
//       chunksRef.current = [];

//       mediaRecorder.ondataavailable = (event) => {
//         if (event.data.size > 0) {
//           chunksRef.current.push(event.data);
//         }
//       };

//       mediaRecorder.onstop = async () => {
//         // Clear recording timer
//         if (recordingTimerRef.current) {
//           clearInterval(recordingTimerRef.current);
//           recordingTimerRef.current = null;
//         }

//         const videoBlob = new Blob(chunksRef.current, { type: "video/mp4" });

//         const formData = new FormData();
//         formData.append("video", videoBlob, "recording.mp4");

//         try {
//           setIsUploading(true);
//           const response = await fetch(
//             "http://localhost:5328/api/upload-video",
//             {
//               method: "POST",
//               body: formData,
//             }
//           );

//           if (!response.ok) {
//             throw new Error(`Upload failed: ${response.statusText}`);
//           }

//           const result = await response.json();
//           console.log("Video uploaded successfully:", result.filename);
//           setUploadedVideo(result.filename);
//           if (result.has_audio) {
//             setUploadedAudio(result.audio_filename);
//           }
//           router.push(
//             `/recordings/${result.filename}${
//               result.has_audio ? `?audio=${result.audio_filename}` : ""
//             }`
//           );
//         } catch (error) {
//           console.error("Error uploading video:", error);
//           setRecordingError(
//             error instanceof Error ? error.message : "Failed to upload video"
//           );
//         } finally {
//           setIsUploading(false);
//         }
//       };

//       mediaRecorder.start(100);
//       setIsRecording(true);

//       // Start recording timer
//       recordingTimerRef.current = setInterval(() => {
//         setRecordingDuration((prev) => prev + 1);
//       }, 1000);
//     } catch (error) {
//       console.error("Error starting recording:", error);
//       setRecordingError(
//         "Failed to start recording. Please check your camera and microphone permissions."
//       );
//     }
//   };

//   const stopRecording = () => {
//     if (mediaRecorderRef.current && isRecording) {
//       mediaRecorderRef.current.stop();
//       setIsRecording(false);
//     }
//   };

//   // Add cleanup for recording timer in useEffect
//   useEffect(() => {
//     testApiConnection();

//     return () => {
//       if (intervalRef.current) {
//         clearInterval(intervalRef.current);
//       }
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach((track) => track.stop());
//       }
//       if (recordingTimerRef.current) {
//         clearInterval(recordingTimerRef.current);
//       }
//     };
//   }, []);

//   // Format recording duration
//   const formatDuration = (seconds: number): string => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins.toString().padStart(2, "0")}:${secs
//       .toString()
//       .padStart(2, "0")}`;
//   };

//   return (
//     <main className="container py-8 flex flex-col items-center">
//       <h1 className="text-4xl font-bold mb-8 text-center">Camera Practice</h1>

//       <Card className="w-full max-w-2xl">
//         <CardHeader>
//           <CardTitle className="text-center">Camera Feed</CardTitle>
//         </CardHeader>
//         <CardContent className="flex flex-col items-center gap-4">
//           <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
//             <video
//               ref={videoRef}
//               autoPlay
//               playsInline
//               muted={isRecording}
//               className="absolute top-0 left-0 w-full h-full object-contain"
//             />
//             <canvas
//               ref={canvasRef}
//               className="absolute top-0 left-0 w-full h-full"
//               style={{
//                 pointerEvents: "none",
//                 zIndex: 10,
//                 display: isRecording ? "none" : "block",
//               }}
//             />
//             {isRecording && (
//               <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full flex items-center gap-2">
//                 <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
//                 <span>{formatDuration(recordingDuration)}</span>
//               </div>
//             )}
//           </div>

//           <div className="flex gap-4">
//             {!isRecording && (
//               <Button
//                 onClick={isStreaming ? stopCamera : startCamera}
//                 variant={isStreaming ? "destructive" : "default"}
//                 className="w-32"
//               >
//                 {isStreaming ? "Stop Camera" : "Start Camera"}
//               </Button>
//             )}

//             {isStreaming && (
//               <Button
//                 onClick={isRecording ? stopRecording : startRecording}
//                 variant={isRecording ? "destructive" : "default"}
//                 className="w-32"
//                 disabled={!isStreaming || isUploading}
//               >
//                 {isRecording ? "Stop Recording" : "Start Recording"}
//               </Button>
//             )}
//           </div>

//           {isUploading && (
//             <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
//               <div className="bg-white p-8 rounded-lg shadow-lg flex flex-col items-center gap-4">
//                 <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
//                 <p className="text-lg font-semibold">
//                   Processing your recording...
//                 </p>
//                 <p className="text-sm text-gray-500">
//                   Please wait while we prepare your video
//                 </p>
//               </div>
//             </div>
//           )}

//           {recordingError && (
//             <div className="w-full p-4 bg-destructive/10 text-destructive rounded-lg text-center mt-4">
//               {recordingError}
//             </div>
//           )}

//           {isStreaming && !isRecording && Object.keys(emotions).length > 0 && (
//             <>
//               <div className="w-full p-4 bg-muted rounded-lg">
//                 <h3 className="font-semibold mb-2">Detected Emotions:</h3>
//                 <div className="grid grid-cols-2 gap-2">
//                   {Object.entries(emotions).map(([emotion, probability]) => (
//                     <div key={emotion} className="flex justify-between">
//                       <span className="capitalize">{emotion}:</span>
//                       <span>{(probability * 100).toFixed(1)}%</span>
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               <div className="w-full p-4 bg-primary/10 text-primary rounded-lg text-center">
//                 <h3 className="font-semibold mb-1">Dominant Emotion:</h3>
//                 <div className="text-2xl font-bold capitalize">
//                   {getDominantEmotion(emotions)}
//                 </div>
//               </div>
//             </>
//           )}

//           {backendError && (
//             <div className="w-full p-4 bg-destructive/10 text-destructive rounded-lg text-center mt-4">
//               {backendError}
//             </div>
//           )}
//         </CardContent>
//       </Card>
//     </main>
//   );
// }
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

type Emotions = {
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
};

export default function CameraPage() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [uploadedAudio, setUploadedAudio] = useState<string | null>(null);
  const [separateAudioRecording, setSeparateAudioRecording] = useState(false);
  const [gazeDirection, setGazeDirection] = useState<string>("center");
  const [emotions, setEmotions] = useState<Emotions>({
    neutral: 0,
    happy: 0,
    sad: 0,
    angry: 0,
    fearful: 0,
    disgusted: 0,
    surprised: 0,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const router = useRouter();
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const lowPassNodeRef = useRef<BiquadFilterNode | null>(null);
  const highPassNodeRef = useRef<BiquadFilterNode | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };
  const startRecording = async () => {
    if (!streamRef.current) return;

    try {
      setRecordingError(null);
      setRecordingDuration(0);

      // Clear the canvas when starting recording
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
        }
      }

      // Check supported MIME types for MP4
      const mimeTypes = [
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2", // H.264 + AAC
        "video/mp4",
      ];

      let selectedMimeType = "";
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          console.log("Using MIME type:", mimeType);
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error("No supported MP4 video format found");
      }

      // High quality settings for MP4
      const options = {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 8000000,
        audioBitsPerSecond: 320000,
        videoKeyFrameInterval: 1000,
        videoQuality: 1.0,
        audioSampleRate: 44100,
        audioChannelCount: 2,
      };

      const mediaRecorder = new MediaRecorder(streamRef.current, options);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Clear recording timer
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        const videoBlob = new Blob(chunksRef.current, { type: "video/mp4" });

        const formData = new FormData();
        formData.append("video", videoBlob, "recording.mp4");

        try {
          setIsUploading(true);
          const response = await fetch(
            "http://localhost:5328/api/upload-video",
            {
              method: "POST",
              body: formData,
              mode: "no-cors",
            }
          );

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
          }

          const result = await response.json();
          console.log("Video uploaded successfully:", result.filename);
          setUploadedVideo(result.filename);
          if (result.has_audio) {
            setUploadedAudio(result.audio_filename);
          }
          router.push(
            `/recordings/${result.filename}${
              result.has_audio ? `?audio=${result.audio_filename}` : ""
            }`
          );
        } catch (error) {
          console.error("Error uploading video:", error);
          setRecordingError(
            error instanceof Error ? error.message : "Failed to upload video"
          );
        } finally {
          setIsUploading(false);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      setRecordingError(
        "Failed to start recording. Please check your camera and microphone permissions."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  const detectCombined = async () => {
    // Ensure videoRef and canvasRef are not null
    if (!videoRef.current || !canvasRef.current || isProcessing || isRecording) return;

    const videoElement = videoRef.current; // Store the reference in a local variable

    // Ensure video element is loaded and ready
    if (!videoElement || !videoElement.videoWidth || !videoElement.videoHeight) {
      console.log("Waiting for video dimensions to be available...");
      return;  // Skip this detection cycle if video isn't ready
    }

    try {
      setIsProcessing(true);
      setBackendError(null);

      // Test connection first
      const isConnected = await testApiConnection();
      if (!isConnected) {
        setIsProcessing(false);
        return;
      }

      // Capture the current frame from video
      const canvas = document.createElement("canvas");

      // Ensure the canvas context is ready
      if (!videoElement) return;
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(videoElement, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.8);

      // Send to combined backend API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5328"}/api/detect-combined`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ image: imageData }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to process frame");
      }

      const result = await response.json();

      // Check if the video element still exists and if results are valid
      if (!videoElement || !result.success || !result.face_detected) {
        setIsProcessing(false);
        return;
      }

      // Update emotions and gaze information
      setEmotions(result.emotions);
      if (result.gaze) {
        setGazeDirection(result.gaze.direction);

        const canvasElement = canvasRef.current;
        if (!canvasElement || !videoElement) {
          setIsProcessing(false);
          return;
        }

        const displayRect = videoElement.getBoundingClientRect();
        const displayWidth = displayRect.width;
        const displayHeight = displayRect.height;

        if (canvasElement.width !== displayWidth || canvasElement.height !== displayHeight) {
          canvasElement.width = displayWidth;
          canvasElement.height = displayHeight;
        }

        // Clear canvas if recording
        if (isRecording) {
          const overlayCtx = canvasElement.getContext("2d");
          if (overlayCtx) {
            overlayCtx.clearRect(0, 0, displayWidth, displayHeight);
          }
          setIsProcessing(false);
          return;
        }

        const scaleX = displayWidth / videoElement.videoWidth;
        const scaleY = displayHeight / videoElement.videoHeight;
        const scale = Math.min(scaleX, scaleY);
        const offsetX = (displayWidth - videoElement.videoWidth * scale) / 2;
        const offsetY = (displayHeight - videoElement.videoHeight * scale) / 2;

        const overlayCtx = canvasElement.getContext("2d", { willReadFrequently: true });
        if (!overlayCtx) {
          setIsProcessing(false);
          return;
        }

        // Clear previous drawings
        overlayCtx.clearRect(0, 0, displayWidth, displayHeight);

        // Set up transform for proper scaling and centering
        overlayCtx.save();
        overlayCtx.translate(offsetX, offsetY);
        overlayCtx.scale(scale, scale);

        // Draw face outline
        if (result.gaze.landmarks) {
          overlayCtx.strokeStyle = "rgba(255, 255, 255, 0.3)";
          overlayCtx.lineWidth = 1;
          const faceOutlinePoints = result.gaze.landmarks.filter(
            (_: [number, number], index: number) =>
              [
                10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
                397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
                172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
              ].includes(index)
          );

          if (faceOutlinePoints.length > 0) {
            overlayCtx.beginPath();
            overlayCtx.moveTo(
              faceOutlinePoints[0][0] * videoElement.videoWidth,
              faceOutlinePoints[0][1] * videoElement.videoHeight
            );

            faceOutlinePoints.forEach((point: [number, number]) => {
              overlayCtx.lineTo(
                point[0] * videoElement.videoWidth,
                point[1] * videoElement.videoHeight
              );
            });

            overlayCtx.closePath();
            overlayCtx.stroke();
          }
        }

        // Draw gaze arrow
        if (result.gaze.gaze_arrow) {
          const { start, end } = result.gaze.gaze_arrow;
          overlayCtx.strokeStyle = "rgba(255, 255, 255, 0.4)";
          overlayCtx.lineWidth = 2;

          overlayCtx.beginPath();
          overlayCtx.arc(start.x * videoElement.videoWidth, start.y * videoElement.videoHeight, 3, 0, 2 * Math.PI);
          overlayCtx.fill();

          overlayCtx.beginPath();
          overlayCtx.moveTo(start.x * videoElement.videoWidth, start.y * videoElement.videoHeight);
          overlayCtx.lineTo(end.x * videoElement.videoWidth, end.y * videoElement.videoHeight);
          overlayCtx.stroke();
        }

        // Draw gaze direction text
        overlayCtx.font = "16px system-ui";
        overlayCtx.textBaseline = "top";
        const text = result.gaze.direction.toUpperCase();
        overlayCtx.fillStyle = "rgba(255, 255, 255, 0.5)";
        overlayCtx.fillText(text, 10, 10);

        // Restore original transform
        overlayCtx.restore();
      }
    } catch (error) {
      console.error("Error in combined detection:", error);
      setBackendError(error instanceof Error ? error.message : "Failed to process frame. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
          channelCount: 2,
          sampleSize: 16,
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video metadata and video dimensions to be available
        await new Promise((resolve, reject) => {
          const videoElement = videoRef.current; // Safely store the reference

          if (!videoElement) return reject('Video element is null');
          
          // Wait for the video to load its metadata
          videoElement.onloadedmetadata = () => {
            if (videoElement.videoWidth && videoElement.videoHeight) {
              console.log("Video dimensions ready:", videoElement.videoWidth, videoElement.videoHeight);
              resolve(true);
            } else {
              reject("Video dimensions are not available");
            }
          };

          // Function to check video dimensions
          const checkVideo = () => {
            if (videoElement && videoElement.videoWidth && videoElement.videoHeight) {
              console.log("Video dimensions ready:", videoElement.videoWidth, videoElement.videoHeight);
              resolve(true);
            } else {
              // Keep checking if not ready
              setTimeout(checkVideo, 100);
            }
          };

          checkVideo(); // Start checking
        });

        // Initialize canvas size after video is ready
        if (canvasRef.current && videoRef.current) {
          const videoRect = videoRef.current.getBoundingClientRect();
          canvasRef.current.width = videoRect.width;
          canvasRef.current.height = videoRect.height;
        }

        streamRef.current = stream;
        setIsStreaming(true);

        // Start the detection loop
        intervalRef.current = setInterval(detectCombined, 100);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Failed to access camera or microphone. Please ensure permissions are granted.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      streamRef.current = null;
      setIsStreaming(false);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Test the connection to the API
  const testApiConnection = async () => {
    try {
      const response = await fetch("http://localhost:5328/api/test", {
        headers: {
          Accept: "application/json",
        },
      });
      const data = await response.json();
      console.log("API test response:", data);
      return true;
    } catch (error) {
      console.error("API connection test failed:", error);
      setBackendError("Cannot connect to Python server. Make sure it's running on port 5328.");
      return false;
    }
  };

  useEffect(() => {
    testApiConnection();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const getDominantEmotion = (emotions: Record<string, number>): string => {
    if (Object.keys(emotions).length === 0) return "none";
    let maxEmotion = "";
    let maxValue = 0;
    Object.entries(emotions).forEach(([emotion, value]) => {
      if (value > maxValue) {
        maxValue = value;
        maxEmotion = emotion;
      }
    });
    return maxEmotion;
  };

  return (
    <main className="container py-8 flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-8 text-center">Camera Practice</h1>

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-center">Camera Feed</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isRecording}
              className="absolute top-0 left-0 w-full h-full object-contain"
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
              style={{
                pointerEvents: "none",
                zIndex: 10,
                display: isRecording ? "none" : "block",
              }}
            />
            {isRecording && (
              <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span>{formatDuration(recordingDuration)}</span>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            {!isRecording && (
              <Button
                onClick={isStreaming ? stopCamera : startCamera}
                variant={isStreaming ? "destructive" : "default"}
                className="w-32"
              >
                {isStreaming ? "Stop Camera" : "Start Camera"}
              </Button>
            )}

            {isStreaming && (
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                variant={isRecording ? "destructive" : "default"}
                className="w-32"
                disabled={!isStreaming || isUploading}
              >
                {isRecording ? "Stop Recording" : "Start Recording"}
              </Button>
            )}
          </div>

          {isUploading && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-8 rounded-lg shadow-lg flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-lg font-semibold">
                  Processing your recording...
                </p>
                <p className="text-sm text-gray-500">
                  Please wait while we prepare your video
                </p>
              </div>
            </div>
          )}

          {recordingError && (
            <div className="w-full p-4 bg-destructive/10 text-destructive rounded-lg text-center mt-4">
              {recordingError}
            </div>
          )}

          {isStreaming && !isRecording && Object.keys(emotions).length > 0 && (
            <>
              <div className="w-full p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Detected Emotions:</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(emotions).map(([emotion, probability]) => (
                    <div key={emotion} className="flex justify-between">
                      <span className="capitalize">{emotion}:</span>
                      <span>{(probability * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full p-4 bg-primary/10 text-primary rounded-lg text-center">
                <h3 className="font-semibold mb-1">Dominant Emotion:</h3>
                <div className="text-2xl font-bold capitalize">
                  {getDominantEmotion(emotions)}
                </div>
              </div>
            </>
          )}

          {backendError && (
            <div className="w-full p-4 bg-destructive/10 text-destructive rounded-lg text-center mt-4">
              {backendError}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
