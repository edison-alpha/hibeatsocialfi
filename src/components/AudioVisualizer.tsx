import React, { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  audioData: Uint8Array | null;
  isPlaying: boolean;
  visualizerUpdate?: number;
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioData,
  isPlaying,
  visualizerUpdate = 0,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioData || !isPlaying) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw frequency bars
    const barCount = Math.min(audioData.length / 2, 64); // Use first half of frequency data
    const barWidth = width / barCount;
    const barSpacing = 1;

    for (let i = 0; i < barCount; i++) {
      const barHeight = (audioData[i] / 255) * height * 0.8; // Scale to 80% of canvas height

      // Create gradient for bars
      const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
      gradient.addColorStop(0, '#3b82f6'); // Blue
      gradient.addColorStop(0.5, '#8b5cf6'); // Purple
      gradient.addColorStop(1, '#ec4899'); // Pink

      ctx.fillStyle = gradient;
      ctx.fillRect(
        i * (barWidth + barSpacing),
        height - barHeight,
        barWidth,
        barHeight
      );
    }
  }, [audioData, isPlaying, visualizerUpdate]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ background: 'transparent' }}
    />
  );
};