import { useEffect, useRef } from 'react';

const MountainWaves = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation loop - mountain-like wave ridges
    const animate = () => {
      timeRef.current += 0.008; // Slow, subtle movement
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Create multiple wave layers for depth
      const waveLayers = 4;
      
      for (let layer = 0; layer < waveLayers; layer++) {
        const layerOffset = layer * 0.3;
        const layerHeight = canvas.height * (0.3 + layer * 0.15); // Stagger heights
        const amplitude = 80 - layer * 15; // Increased amplitude for more prominent waves
        const frequency = 0.002 + layer * 0.0005; // Varying frequencies
        const speed = 0.5 + layer * 0.2; // Different speeds per layer
        
        ctx.save();
        
        // Create gradient for each layer (darker as they go back)
        const gradient = ctx.createLinearGradient(
          0, layerHeight - amplitude,
          0, layerHeight + amplitude
        );
        
        const opacity = 0.18 - layer * 0.03; // Increased opacity for more prominence
        gradient.addColorStop(0, `rgba(208, 125, 0, 0)`);
        gradient.addColorStop(0.2, `rgba(208, 125, 0, ${opacity * 0.4})`);
        gradient.addColorStop(0.4, `rgba(208, 125, 0, ${opacity * 0.7})`);
        gradient.addColorStop(0.5, `rgba(208, 125, 0, ${opacity})`);
        gradient.addColorStop(0.6, `rgba(208, 125, 0, ${opacity * 0.7})`);
        gradient.addColorStop(0.8, `rgba(208, 125, 0, ${opacity * 0.4})`);
        gradient.addColorStop(1, `rgba(208, 125, 0, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        
        // Start from left edge
        ctx.moveTo(0, layerHeight);
        
        // Create mountain-like ridges with multiple peaks
        for (let x = 0; x <= canvas.width; x += 2) {
          // Combine multiple sine waves for organic mountain shape
          const wave1 = Math.sin(x * frequency + timeRef.current * speed + layerOffset) * amplitude;
          const wave2 = Math.sin(x * frequency * 1.5 + timeRef.current * speed * 1.3 + layerOffset) * (amplitude * 0.6);
          const wave3 = Math.sin(x * frequency * 2.3 + timeRef.current * speed * 0.8 + layerOffset) * (amplitude * 0.3);
          
          // Combine waves for complex mountain ridge pattern
          const y = layerHeight + wave1 + wave2 + wave3;
          
          ctx.lineTo(x, y);
        }
        
        // Complete the path to create filled mountain silhouette
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        ctx.fill();
        
        // Add more prominent contour lines for ridge definition
        ctx.strokeStyle = `rgba(208, 125, 0, ${opacity * 0.8})`;
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x += 2) {
          const wave1 = Math.sin(x * frequency + timeRef.current * speed + layerOffset) * amplitude;
          const wave2 = Math.sin(x * frequency * 1.5 + timeRef.current * speed * 1.3 + layerOffset) * (amplitude * 0.6);
          const wave3 = Math.sin(x * frequency * 2.3 + timeRef.current * speed * 0.8 + layerOffset) * (amplitude * 0.3);
          
          const y = layerHeight + wave1 + wave2 + wave3;
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        
        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ mixBlendMode: 'screen', opacity: 1 }}
      />
    </div>
  );
};

export default MountainWaves;

