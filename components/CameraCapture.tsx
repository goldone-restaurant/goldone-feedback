import React, { useRef, useEffect, useCallback } from 'react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const enableCamera = async () => {
      // First, try to get the rear camera
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
      } catch (err) {
        console.warn("Không thể truy cập camera sau, thử lại với camera mặc định.", err);
        // If the rear camera isn't available, try any camera
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (fallbackErr) {
            console.error("Lỗi khi truy cập camera: ", fallbackErr);
            alert("Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập và đảm bảo thiết bị có camera hoạt động.");
            onClose();
            return;
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    };

    enableCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onClose]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `hoadon-${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(file);
          }
        }, 'image/jpeg', 0.9);
      }
    }
  }, [onCapture]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover"
        aria-label="Camera preview"
      />
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="absolute bottom-0 left-0 w-full p-4 bg-black bg-opacity-40 flex justify-center items-center">
        <button
          onClick={handleCapture}
          className="w-16 h-16 rounded-full border-4 border-white bg-white/30 focus:outline-none focus:ring-2 focus:ring-white active:bg-white/50"
          aria-label="Chụp ảnh"
        />
      </div>
      
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-3xl bg-black/40 rounded-full w-12 h-12 flex items-center justify-center leading-none"
        aria-label="Đóng camera"
      >
        &times;
      </button>
    </div>
  );
};

export default CameraCapture;