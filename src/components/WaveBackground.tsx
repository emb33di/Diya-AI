import { useEffect, useRef } from 'react';

const WaveBackground = () => {
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

    // Animation loop - wavelength pattern
    const animate = () => {
      timeRef.current += 0.012; // 1.2x speed (0.01 * 1.2)
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Focus on the video area which is around 45-70% of screen height
      const videoAreaStart = canvas.height * 0.45; // Start of video area
      const videoAreaEnd = canvas.height * 0.70; // End of video area
      const videoAreaHeight = videoAreaEnd - videoAreaStart;
      
      ctx.save();
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      
      // Create compact wavelength pattern - closer together
      const waveCount = 6;
      const waveSpacing = videoAreaHeight / (waveCount + 1); // Even spacing within video area
      
      for (let i = 0; i < waveCount; i++) {
        // Position waves closer together in the video area
        const baseY = videoAreaStart + (waveSpacing * (i + 1));
        const waveY = baseY + Math.sin(timeRef.current * 0.48 + i * 0.3) * 15; // 1.2x speed (0.4 * 1.2)
        
        // Clip to video area only
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, videoAreaStart - 30, canvas.width, videoAreaHeight + 60);
        ctx.clip();
        
        // Create sound wave pattern - more organic, rounded curves with flowing motion
        const waveAmplitude = 15 + Math.sin(timeRef.current * 0.36 + i) * 3; // 1.2x speed (0.3 * 1.2)
        const waveFrequency = 8 + Math.sin(timeRef.current * 0.24 + i * 0.5) * 1; // 1.2x speed (0.2 * 1.2)
        
        // Draw granular particles instead of lines
        const particleSpacing = 5; // More space between particles
        const particleSize = 1.2; // Larger particles
        
        // Add flow effect - particles move along the wave path
        const flowOffset = timeRef.current * 0.6; // 1.2x speed (0.5 * 1.2)
        
        // Sound wave particles that travel along the ridges
        const soundWaveCount = 3; // Number of sound wave particles per ridge line
        const soundWaveSpeed = 0.8; // Speed of sound waves
        
        for (let x = 0; x <= canvas.width; x += particleSpacing) {
          // Create ridged pattern instead of smooth waves
          const normalizedX = (x / canvas.width) * waveFrequency + flowOffset + i * 0.8;
          
          // Create sharp ridges using modulo to create angular steps
          const ridgeStep = Math.floor(normalizedX * 2) / 2; // Creates steps at 0.5 intervals
          const ridgePosition = normalizedX - ridgeStep;
          
          // Create angular ridge shape - sharp peaks and valleys
          let ridgeValue;
          if (ridgePosition < 0.25) {
            // Rising edge
            ridgeValue = ridgePosition * 4; // 0 to 1
          } else if (ridgePosition < 0.5) {
            // Falling edge
            ridgeValue = 1 - (ridgePosition - 0.25) * 4; // 1 to 0
          } else if (ridgePosition < 0.75) {
            // Descending to negative
            ridgeValue = -(ridgePosition - 0.5) * 4; // 0 to -1
          } else {
            // Rising from negative
            ridgeValue = -1 + (ridgePosition - 0.75) * 4; // -1 to 0
          }
          
          // Add slight variation for flow
          const flowPhase = Math.sin((x / canvas.width) * Math.PI * 4 + flowOffset) * 0.1;
          
          // Combine ridge pattern with flow effect
          const wave = (ridgeValue + flowPhase) * waveAmplitude;
          const particleY = waveY + wave;
          
          // Check if this position should have a traveling sound wave particle
          let isSoundWave = false;
          let soundWaveIntensity = 0;
          for (let sw = 0; sw < soundWaveCount; sw++) {
            const soundWaveX = ((timeRef.current * soundWaveSpeed * 100 + sw * (canvas.width / soundWaveCount)) % (canvas.width + 100)) - 50;
            const distance = Math.abs(x - soundWaveX);
            if (distance < 30) {
              isSoundWave = true;
              soundWaveIntensity = (1 - distance / 30) * 1.5; // Brighter as it gets closer
              break;
            }
          }
          
          // Calculate opacity based on position (fade at edges) - brighter particles
          let opacity = 0.25 + (i % 2) * 0.06; // Increased from 0.15/0.04
          
          // Enhance opacity for sound wave particles
          if (isSoundWave) {
            opacity *= (1 + soundWaveIntensity);
          }
          
          if (x < canvas.width * 0.2) {
            opacity *= (x / (canvas.width * 0.2));
          } else if (x > canvas.width * 0.8) {
            opacity *= ((canvas.width - x) / (canvas.width * 0.2));
          }
          
          // Draw sound wave particles with enhanced glow and size
          const particleGlowSize = isSoundWave ? particleSize * (2 + soundWaveIntensity) : particleSize * 1.5;
          const particleCoreSize = isSoundWave ? particleSize * (1.5 + soundWaveIntensity * 0.5) : particleSize;
          
          // Draw small, distinct particle with brighter glow
          const gradient = ctx.createRadialGradient(x, particleY, 0, x, particleY, particleGlowSize);
          gradient.addColorStop(0, `rgba(208, 125, 0, ${opacity * (isSoundWave ? 2 : 1.5)})`); // Brighter for sound waves
          gradient.addColorStop(0.6, `rgba(208, 125, 0, ${opacity * (isSoundWave ? 1.2 : 0.7)})`);
          gradient.addColorStop(1, `rgba(208, 125, 0, 0)`);
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, particleY, particleGlowSize, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw brighter core particle
          ctx.fillStyle = `rgba(208, 125, 0, ${opacity * (isSoundWave ? 2.5 : 1.8)})`; // Much brighter for sound waves
          ctx.beginPath();
          ctx.arc(x, particleY, particleCoreSize, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw trailing effect for sound waves
          if (isSoundWave && soundWaveIntensity > 0.5) {
            const trailGradient = ctx.createRadialGradient(x, particleY, 0, x, particleY, particleGlowSize * 1.5);
            trailGradient.addColorStop(0, `rgba(208, 125, 0, ${opacity * soundWaveIntensity * 0.3})`);
            trailGradient.addColorStop(1, `rgba(208, 125, 0, 0)`);
            ctx.fillStyle = trailGradient;
            ctx.beginPath();
            ctx.arc(x, particleY, particleGlowSize * 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }
      ctx.restore();

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
        style={{ mixBlendMode: 'screen', opacity: 0.9 }}
      />
    </div>
  );
};

export default WaveBackground;

