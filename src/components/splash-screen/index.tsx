import React, { useEffect, useState, useRef } from 'react';
import './splash-screen.scss';

// Custom interface for particle properties
interface ParticleStyle extends React.CSSProperties {
  speed?: number;
}

// Particle component for shooting stars
const Particle = ({ style }: { style: ParticleStyle }) => {
  return <div className="particle" style={style}></div>;
};

const SplashScreen: React.FC = () => {
  const [textIndex, setTextIndex] = useState(0);
  const text = "TraderShall is here to make trading easy and profitable";
  const [displayText, setDisplayText] = useState('');
  const [loadingDots, setLoadingDots] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [particles, setParticles] = useState<ParticleStyle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Text animation effect
  useEffect(() => {
    if (textIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[textIndex]);
        setTextIndex(prev => prev + 1);
      }, 100); // Speed of typing animation
      
      return () => clearTimeout(timer);
    }
  }, [textIndex, text]);

  // Loading dots animation
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingDots(prev => {
        if (prev.length >= 3) return '.';
        return prev + '.';
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  // Loading bar animation
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) return 100;
        return prev + 1;
      });
    }, 100); // Completes in 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Particles animation (shooting stars)
  useEffect(() => {
    // Determine number of particles based on screen size
    const getParticleCount = () => {
      if (windowSize.width <= 480) return 10; // Mobile
      if (windowSize.width <= 768) return 15; // Tablet
      return 20; // Desktop
    };

    // Create initial particles
    const initialParticles: ParticleStyle[] = [];
    for (let i = 0; i < getParticleCount(); i++) {
      initialParticles.push(createParticle());
    }
    setParticles(initialParticles);

    // Animation loop for particles
    const animateParticles = () => {
      setParticles(prevParticles => {
        return prevParticles.map(particle => {
          // Check if particle is out of screen
          if (
            (particle.left as number) < -10 || 
            (particle.top as number) > windowSize.height + 10
          ) {
            return createParticle(); // Reset particle
          }
          
          // Move particle
          return {
            ...particle,
            left: (particle.left as number) - (particle.speed as number),
            top: (particle.top as number) + (particle.speed as number),
          };
        });
      });
      
      animationFrameRef.current = requestAnimationFrame(animateParticles);
    };
    
    animationFrameRef.current = requestAnimationFrame(animateParticles);
    
    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [windowSize]);

  // Function to create a new particle with random properties
  const createParticle = (): ParticleStyle => {
    // Adjust speed and size based on screen size
    const speedMultiplier = windowSize.width <= 480 ? 0.8 : 1;
    const sizeMultiplier = windowSize.width <= 480 ? 0.8 : 1;
    
    const speed = (Math.random() * 3 + 1) * speedMultiplier;
    const size = (Math.random() * 3 + 1) * sizeMultiplier;
    const opacity = Math.random() * 0.7 + 0.3;
    
    return {
      left: Math.random() * windowSize.width,
      top: Math.random() * windowSize.height / 2, // Start in top half
      width: `${size}px`,
      height: `${size}px`,
      opacity,
      speed,
      boxShadow: `0 0 ${size * 2}px ${size}px rgba(255, 255, 255, ${opacity})`,
    };
  };

  return (
    <div className="splash-screen">
      {/* Particles (shooting stars) */}
      {particles.map((style, index) => (
        <Particle key={index} style={style} />
      ))}
      
      <div className="splash-content">
        <h1 className="gradient-title">TRADERSHALL</h1>
        <div className="animated-text">{displayText}</div>
        
        {/* Loading spinner */}
        <div className="loading-indicator">
          <div className="spinner"></div>
          <div className="loading-text">Loading{loadingDots}</div>
          
          {/* Loading bar */}
          <div className="loading-bar-container">
            <div 
              className="loading-bar" 
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
