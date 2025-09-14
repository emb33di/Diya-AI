import { useEffect, useState } from 'react';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  animationDelay: number;
}

const StarryBackground = () => {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const generateStars = () => {
      const newStars: Star[] = [];
      const starCount = 500; // Increased number of stars for better coverage

      for (let i = 0; i < starCount; i++) {
        newStars.push({
          id: i,
          x: Math.random() * 100, // Percentage across screen
          y: Math.random() * 100, // Percentage down screen
          size: Math.random() * 3 + 1, // 1-4px for better visibility
          opacity: Math.random() * 0.9 + 0.1, // 0.1-1.0 for better range
          animationDelay: Math.random() * 4, // 0-4s delay for varied animation
        });
      }
      setStars(newStars);
    };

    generateStars();
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" style={{ backgroundColor: 'hsl(0 0% 7%)' }}>
      
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full animate-twinkle"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDelay: `${star.animationDelay}s`,
            background: `radial-gradient(circle, rgba(255, 255, 255, ${star.opacity}) 0%, rgba(255, 215, 0, ${star.opacity * 0.7}) 50%, rgba(255, 255, 255, ${star.opacity * 0.3}) 100%)`,
            boxShadow: `0 0 ${star.size * 2}px rgba(255, 255, 255, ${star.opacity * 0.5})`,
          }}
        />
      ))}
    </div>
  );
};

export default StarryBackground; 