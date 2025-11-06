import { useEffect, useRef } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
}

const TechBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();

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

    // Initialize particles
    const particleCount = 40; // Subtle amount
    particlesRef.current = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 3 + 1, // 1-4px
      speedX: (Math.random() - 0.5) * 0.3, // Very slow movement
      speedY: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.3 + 0.1, // Low opacity for subtlety
    }));

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particlesRef.current.forEach((particle) => {
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Draw particle with glow
        ctx.save();
        ctx.globalAlpha = particle.opacity;
        
        // Create glow effect
        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size * 4
        );
        gradient.addColorStop(0, 'rgba(208, 125, 0, 0.4)'); // Primary orange
        gradient.addColorStop(0.5, 'rgba(208, 125, 0, 0.15)');
        gradient.addColorStop(1, 'rgba(208, 125, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 4, 0, Math.PI * 2);
        ctx.fill();

        // Core particle
        ctx.fillStyle = 'rgba(208, 125, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      });

      // Draw subtle connecting lines between nearby particles
      particlesRef.current.forEach((particle, i) => {
        particlesRef.current.slice(i + 1).forEach((otherParticle) => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Draw line if particles are close
          if (distance < 150) {
            ctx.save();
            ctx.globalAlpha = (1 - distance / 150) * 0.1; // Fade out with distance
            ctx.strokeStyle = 'rgba(208, 125, 0, 0.2)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.stroke();
            ctx.restore();
          }
        });
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
      {/* Animated gradient mesh background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(at 20% 30%, rgba(208, 125, 0, 0.08) 0%, transparent 50%),
            radial-gradient(at 80% 70%, rgba(208, 125, 0, 0.06) 0%, transparent 50%),
            radial-gradient(at 40% 80%, rgba(208, 125, 0, 0.05) 0%, transparent 50%),
            radial-gradient(at 60% 20%, rgba(208, 125, 0, 0.07) 0%, transparent 50%),
            hsl(0 0% 7%)
          `,
          backgroundSize: '200% 200%',
          animation: 'gradientShift 20s ease infinite',
        }}
      />

      {/* Subtle grid overlay */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(208, 125, 0, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(208, 125, 0, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Canvas for animated particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* CSS animation for gradient movement */}
      <style>{`
        @keyframes gradientShift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
      `}</style>
    </div>
  );
};

export default TechBackground;

