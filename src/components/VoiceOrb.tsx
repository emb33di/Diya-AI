import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSpring, animated } from '@react-spring/web';

interface VoiceOrbProps {
  className?: string;
  audioLevel?: number; // Audio input level (0-1)
  audioOutputLevel?: number; // AI audio output level (0-1)
  isListening?: boolean; // Whether the orb is listening
  isSpeaking?: boolean; // Whether the orb is speaking
  isThinking?: boolean; // Whether the orb is thinking
}

interface Dot {
  id: number;
  x: number;
  y: number;
  z: number;
  size: number;
  opacity: number;
  fixedColor: string; // Added fixedColor property
}

const VoiceOrb: React.FC<VoiceOrbProps> = ({
  className = '',
  audioLevel = 0,
  audioOutputLevel = 0,
  isListening = false,
  isSpeaking = false,
  isThinking = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [dots, setDots] = useState<Dot[]>([]);
  const [time, setTime] = useState(0);

  // Animation springs for the backdrop halo
  const backdropSpring = useSpring({
    scale: 1 + (Math.max(audioLevel, audioOutputLevel) * 0.43), // Scale up to 1.43x on max audio (max size: 50%)
    opacity: 0.8 + (Math.max(audioLevel, audioOutputLevel) * 0.2), // Opacity from 0.8 to 1.0
    config: { tension: 400, friction: 8 }
  });

  const breathingSpring = useSpring({
    scale: isListening || isSpeaking ? 1.1 : 1,
    config: { tension: 100, friction: 10 }
  });

  const rotationSpring = useSpring({
    rotateY: isSpeaking ? 360 : 0,
    config: { tension: 50, friction: 20 }
  });

  // Generate organic blob-like distribution with flowing wave effect
  const generateBlobDistribution = useCallback((numPoints: number, containerSize?: number): Dot[] => {
    const points: Dot[] = [];
    
    // Create flowing wave centers that move organically
    const waveCenters = [
      { x: 0, y: 0, z: 0, radius: 0.6, weight: 1.0, phase: 0 },
      { x: 0.3, y: -0.2, z: 0.2, radius: 0.4, weight: 0.8, phase: Math.PI / 3 },
      { x: -0.2, y: 0.3, z: -0.1, radius: 0.4, weight: 0.8, phase: Math.PI * 2 / 3 },
      { x: 0.1, y: 0.2, z: 0.4, radius: 0.3, weight: 0.7, phase: Math.PI },
      { x: -0.3, y: -0.1, z: 0.3, radius: 0.35, weight: 0.75, phase: Math.PI * 4 / 3 },
    ];

    // Define fixed color zones - all using #0060D0
    const colorZones = [
      { name: 'deep_blue', color: 'rgba(0, 96, 208, ', percentage: 1.0 },        // 100% deep blue (#0060D0)
    ];

    let pointsAdded = 0;
    let totalAttempts = 0;
    const maxTotalAttempts = numPoints * 3; // Allow more attempts to find valid positions
    
    while (pointsAdded < numPoints && totalAttempts < maxTotalAttempts) {
      let x, y, z;
      let attempts = 0;
      const maxAttempts = 50;
      let inWave = false;
      
      // All particles use the same deep blue color
      const colorIndex = 0;

      // Try to place point in flowing wave pattern
      do {
        // Random position within unit sphere
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.cbrt(Math.random()); // Constrain to inner sphere (100% of outer sphere)
        
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);

        // Check if point is within any wave center's influence
        inWave = false;
        for (const center of waveCenters) {
          const distance = Math.sqrt(
            Math.pow(x - center.x, 2) + 
            Math.pow(y - center.y, 2) + 
            Math.pow(z - center.z, 2)
          );
          
          if (distance < center.radius) {
            inWave = true;
            break;
          }
        }

        // Add some organic variation - allow some points outside wave centers
        if (Math.random() < 0.25) {
          inWave = true;
        }

        attempts++;
      } while (!inWave && attempts < maxAttempts);

      // Ensure point is within inner sphere bounds (100% of outer sphere)
      const distanceFromOrigin = Math.sqrt(x * x + y * y + z * z);
      if (distanceFromOrigin > 1) {
        x = (x / distanceFromOrigin);
        y = (y / distanceFromOrigin);
        z = (z / distanceFromOrigin);
      }

      // Add organic noise for more natural distribution
      const noise = (Math.random() - 0.5) * 0.1;
      
      // Check minimum distance from existing points to ensure spacing
      let tooClose = false;
      // Scale minimum distance based on container size to maintain consistent visual spacing
      const minDistance = 0.06 * (320 / Math.max(containerSize || 320, 1));
      
      for (const existingPoint of points) {
        const distance = Math.sqrt(
          Math.pow(x + noise - existingPoint.x, 2) + 
          Math.pow(y + noise - existingPoint.y, 2) + 
          Math.pow(z + noise - existingPoint.z, 2)
        );
        
        if (distance < minDistance) {
          tooClose = true;
          break;
        }
      }
      
      // Only add point if it's not too close to existing points
      if (!tooClose) {
        points.push({
          id: pointsAdded,
          x: x + noise,
          y: y + noise,
          z: z + noise,
          size: 1.0, // Reduced size for smaller particles
          opacity: Math.random() * 0.2 + 0.9, // Higher base opacity for more visible dots
          fixedColor: colorZones[colorIndex].color, // Store the fixed color
        });
        pointsAdded++;
      }
      totalAttempts++;
    }
    return points;
  }, []);

  // Initialize dots
  useEffect(() => {
    const calculateAndSetDots = () => {
      const container = canvasRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const area = rect.width * rect.height;
        // Base density: Use current Onboarding page VoiceOrb size ratio
        // The VoiceOrb component itself is 320×320px with 200,000 particles
        // This gives us 200,000 ÷ 102,400 = 1.953 particles per square pixel
        const baseDensity = 200000 / (320 * 320);
        const particleCount = Math.floor(area * baseDensity);
        // Clamp between reasonable bounds
        const clampedCount = Math.max(5000, Math.min(200000, particleCount));
        setDots(generateBlobDistribution(clampedCount, rect.width));
      } else {
        // Fallback to default count
        setDots(generateBlobDistribution(200000, 320));
      }
    };

    // Initial calculation
    calculateAndSetDots();

    // Set up resize observer to recalculate when container size changes
    const resizeObserver = new ResizeObserver(() => {
      calculateAndSetDots();
    });

    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [generateBlobDistribution]);

  // Animation loop for dots
  useEffect(() => {
    const animate = () => {
      setTime(prev => prev + 0.016); // ~60fps
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Render dots on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dots.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Add subtle bloom effect to the entire canvas
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.globalCompositeOperation = 'source-over';

    // Calculate center
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(rect.width, rect.height) * 0.65; // Covers 90% of area with small margin

    // Create dynamic wave centers that rotate for flowing effect
    const waveCenters = [
      { x: 0, y: 0, z: 0, radius: 0.6, weight: 1.0, phase: 0 },
      { x: 0.3, y: -0.2, z: 0.2, radius: 0.4, weight: 0.8, phase: Math.PI / 3 },
      { x: -0.2, y: 0.3, z: -0.1, radius: 0.4, weight: 0.8, phase: Math.PI * 2 / 3 },
      { x: 0.1, y: 0.2, z: 0.4, radius: 0.3, weight: 0.7, phase: Math.PI },
      { x: -0.3, y: -0.1, z: 0.3, radius: 0.35, weight: 0.75, phase: Math.PI * 4 / 3 },
    ];

    // Add subtle rotation to wave centers for dynamic flow
    const rotationSpeed = 0.3;
    const rotationRadius = 0.1;
    waveCenters.forEach((center, index) => {
      if (index > 0) { // Don't rotate the main center
        const angle = time * rotationSpeed + center.phase;
        center.x = Math.cos(angle) * rotationRadius + (index === 1 ? 0.3 : index === 2 ? -0.2 : index === 3 ? 0.1 : -0.3);
        center.y = Math.sin(angle) * rotationRadius + (index === 1 ? -0.2 : index === 2 ? 0.3 : index === 3 ? 0.2 : -0.1);
        center.z = Math.sin(angle * 0.7) * rotationRadius * 0.5 + (index === 1 ? 0.2 : index === 2 ? -0.1 : index === 3 ? 0.4 : 0.3);
      }
    });

    // Draw dots with energy glow effect
    dots.forEach(dot => {
      // Add amoeba-like movement
      const amoebaSpeed = 0.6;
      const amoebaAmplitude = 0.08; // Increased from 0.03 to 0.08 for more movement
      
      // Create organic, amoeba-like movement patterns
      const amoeba1 = Math.sin(time * amoebaSpeed + dot.id * 0.08) * Math.cos(time * 0.4 + dot.id * 0.03);
      const amoeba2 = Math.cos(time * amoebaSpeed * 0.8 + dot.id * 0.12) * Math.sin(time * 0.6 + dot.id * 0.07);
      const amoeba3 = Math.sin(time * amoebaSpeed * 1.2 + dot.id * 0.15) * Math.cos(time * 0.5 + dot.id * 0.05);
      
      // Combine movements for organic amoeba flow
      const movementX = (amoeba1 + amoeba2 * 0.6 + amoeba3 * 0.4) * amoebaAmplitude;
      const movementY = (amoeba2 + amoeba3 * 0.7 + amoeba1 * 0.5) * amoebaAmplitude;
      const movementZ = (amoeba3 + amoeba1 * 0.8 + amoeba2 * 0.3) * amoebaAmplitude;

      // Calculate 3D position with amoeba-like movement
      const x3D = dot.x + movementX;
      const y3D = dot.y + movementY;
      const z3D = dot.z + movementZ;

      // Project 3D to 2D
      const scale = 1 / (2 + z3D);
      const x2D = centerX + x3D * radius * scale;
      const y2D = centerY + y3D * radius * scale;

      // Calculate dot size and opacity based on Z position
      const pulseFactor = 1 + Math.sin(time * 2 + dot.id * 0.1) * 0.1; // Subtle pulsing
      const dotSize = dot.size * scale * pulseFactor;
      const dotOpacity = dot.opacity * scale * pulseFactor;
      
      // Use fixed color for each dot
      const baseColor = dot.fixedColor;
      
      // Add depth-based color variation while maintaining the base color
      const depthIntensity = Math.max(0.7, scale); // Dots closer to viewer get more vibrant
      
      // Extract RGB values from the fixed color
      const colorMatch = baseColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+)/);
      let enhancedColor = baseColor; // Default fallback
      
      if (colorMatch) {
        const r = parseInt(colorMatch[1]);
        const g = parseInt(colorMatch[2]);
        const b = parseInt(colorMatch[3]);
        
        // Apply depth intensity while preserving the base color
        const enhancedR = Math.min(255, Math.floor(r * depthIntensity));
        const enhancedG = Math.min(255, Math.floor(g * depthIntensity));
        const enhancedB = Math.min(255, Math.floor(b * depthIntensity));
        
        enhancedColor = `rgba(${enhancedR}, ${enhancedG}, ${enhancedB}, `;
      }
      


      // Draw core energy dot with soft edges
      const coreGradient = ctx.createRadialGradient(
        x2D, y2D, 0,
        x2D, y2D, dotSize
      );
      
      coreGradient.addColorStop(0, enhancedColor + dotOpacity + ')');
      coreGradient.addColorStop(0.6, enhancedColor + (dotOpacity * 0.7) + ')');
      coreGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.beginPath();
      ctx.arc(x2D, y2D, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();
    });
  }, [dots, time, audioLevel]);

  return (
    <div className={`relative aspect-square voice-orb ${className}`}>
      {/* Light Halo Around Component */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(100% 100% at 50% 50%, rgba(208,125,0,0.15), rgba(208,125,0,0.08) 60%, rgba(208,125,0,0.03) 80%, rgba(0,0,0,0) 100%)',
          filter: 'blur(15px)',
        }}
      />
      
      {/* Audio-Responsive Backdrop Halo */}
      <animated.div 
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(60% 60% at 50% 50%, rgba(208,125,0,0.95), rgba(208,125,0,0.7) 40%, rgba(208,125,0,0.4) 70%, rgba(0,0,0,0) 100%)',
          filter: 'blur(4px)',
          width: '35%',
          height: '35%',
          left: '32.5%',
          top: '32.5%',
          zIndex: 0,
          transform: backdropSpring.scale.to(s => `scale(${s})`),
          opacity: backdropSpring.opacity,
        }}
      />
      

      
      {/* Canvas for dots */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Breathing and rotation animations */}
      <animated.div
        className="absolute inset-0 w-full h-full"
        style={{
          transform: breathingSpring.scale.to(s => `scale(${s})`),
        }}
      >
        <animated.div
          className="w-full h-full"
          style={{
            transform: rotationSpring.rotateY.to(r => `rotateY(${r}deg)`),
          }}
        >
          {/* Optional: Add a subtle glow effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-transparent via-transparent to-white/5" />
        </animated.div>
      </animated.div>
    </div>
  );
};

export default VoiceOrb;

