import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  accentColor: string;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser, isPlaying, accentColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderFrame = () => {
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Using only the lower half of the spectrum for better visuals usually
      const visibleBars = Math.floor(bufferLength * 0.6); 
      const barWidth = (canvas.width / visibleBars) * 1.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < visibleBars; i++) {
        // Boost high frequencies slightly for better visual balance
        const multiplier = 1 + (i / visibleBars); 
        barHeight = (dataArray[i] / 255) * canvas.height * 0.8 * multiplier; 

        // Dynamic gradient
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, accentColor);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');

        ctx.fillStyle = gradient;
        
        ctx.beginPath();
        // Draw rounded bars
        ctx.roundRect(x, canvas.height - barHeight, barWidth - 1, barHeight, [4, 4, 0, 0]);
        ctx.fill();

        x += barWidth;
      }

      if (isPlaying) {
        requestRef.current = requestAnimationFrame(renderFrame);
      }
    };

    if (isPlaying) {
      renderFrame();
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw a subtle line for "ready" state
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(0, canvas.height - 2, canvas.width, 2);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [analyser, isPlaying, accentColor]);

  return (
    <canvas 
      ref={canvasRef} 
      width={800} 
      height={200} 
      className="w-full h-full block"
    />
  );
};

export default Visualizer;