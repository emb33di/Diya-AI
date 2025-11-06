import { useEffect, useRef } from 'react';

interface Blob {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  targetRadius: number;
}

const DynamicBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const timeRef = useRef(0);
  const blobsRef = useRef<Blob[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initBlobs();
    };

    const initBlobs = () => {
      blobsRef.current = [
        {
          x: canvas.width * 0.2,
          y: canvas.height * 0.3,
          radius: 200,
          vx: 0.3,
          vy: 0.2,
          targetRadius: 250,
        },
        {
          x: canvas.width * 0.8,
          y: canvas.height * 0.6,
          radius: 180,
          vx: -0.2,
          vy: 0.3,
          targetRadius: 220,
        },
        {
          x: canvas.width * 0.5,
          y: canvas.height * 0.8,
          radius: 150,
          vx: 0.25,
          vy: -0.15,
          targetRadius: 200,
        },
        {
          x: canvas.width * 0.7,
          y: canvas.height * 0.2,
          radius: 140,
          vx: -0.3,
          vy: 0.25,
          targetRadius: 180,
        },
      ];
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation loop - smooth morphing blobs
    const animate = () => {
      timeRef.current += 0.01;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update blob positions with smooth morphing
      blobsRef.current.forEach((blob) => {
        // Smooth radius morphing
        blob.radius += (blob.targetRadius - blob.radius) * 0.02;
        
        // Update position with boundary wrapping
        blob.x += blob.vx;
        blob.y += blob.vy;

        if (blob.x < -blob.radius) blob.x = canvas.width + blob.radius;
        if (blob.x > canvas.width + blob.radius) blob.x = -blob.radius;
        if (blob.y < -blob.radius) blob.y = canvas.height + blob.radius;
        if (blob.y > canvas.height + blob.radius) blob.y = -blob.radius;

        // Subtle size pulsing
        const pulseRadius = blob.radius + Math.sin(timeRef.current * 0.5) * 20;
        
        // Create smooth gradient blob
        const gradient = ctx.createRadialGradient(
          blob.x, blob.y, 0,
          blob.x, blob.y, pulseRadius
        );
        gradient.addColorStop(0, 'rgba(208, 125, 0, 0.25)');
        gradient.addColorStop(0.4, 'rgba(208, 125, 0, 0.15)');
        gradient.addColorStop(0.7, 'rgba(208, 125, 0, 0.08)');
        gradient.addColorStop(1, 'rgba(208, 125, 0, 0)');

        ctx.save();
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, pulseRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });


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
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Base gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at top left, rgba(208, 125, 0, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at bottom right, rgba(208, 125, 0, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at center, rgba(208, 125, 0, 0.08) 0%, transparent 60%),
            hsl(0 0% 7%)
          `,
        }}
      />

      {/* Canvas for smooth morphing animations */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ mixBlendMode: 'screen', opacity: 0.9 }}
      />

      {/* Animated gradient mesh overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, rgba(208, 125, 0, 0.12) 0%, transparent 45%),
            radial-gradient(circle at 80% 70%, rgba(208, 125, 0, 0.1) 0%, transparent 45%),
            radial-gradient(circle at 50% 50%, rgba(208, 125, 0, 0.08) 0%, transparent 55%),
            radial-gradient(circle at 70% 20%, rgba(208, 125, 0, 0.1) 0%, transparent 45%)
          `,
          backgroundSize: '200% 200%',
          animation: 'morphMesh 25s ease-in-out infinite',
          opacity: 0.7,
        }}
      />

      {/* Secondary layer for depth */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 60% 25%, rgba(208, 125, 0, 0.08) 0%, transparent 55%),
            radial-gradient(ellipse at 40% 75%, rgba(208, 125, 0, 0.1) 0%, transparent 55%),
            radial-gradient(ellipse at 90% 50%, rgba(208, 125, 0, 0.06) 0%, transparent 55%)
          `,
          backgroundSize: '180% 180%',
          animation: 'morphMesh 30s ease-in-out infinite reverse',
          opacity: 0.6,
        }}
      />

      <style>{`
        @keyframes morphMesh {
          0%, 100% {
            background-position: 0% 50%;
            transform: scale(1);
          }
          33% {
            background-position: 100% 30%;
            transform: scale(1.03);
          }
          66% {
            background-position: 50% 100%;
            transform: scale(0.98);
          }
        }
      `}</style>
    </div>
  );
};

export default DynamicBackground;

