import React, { useEffect, useState } from 'react';
import './splash-screen.scss';

const SplashScreen: React.FC = () => {
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setLoadingProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setTimeout(() => setIsVisible(false), 500);
                    return 100;
                }
                return prev + 1;
            });
        }, 30);

        return () => clearInterval(interval);
    }, []);

    if (!isVisible) return null;

    return (
        <div className="splash-screen">
            <div className="splash-content">
                <div className="logo-container">
                    <div className="logo-circle">
                        <div className="logo-inner">
                            <div className="logo-text">
                                <span className="logo-text-gradient">DANS</span>
                                <span className="logo-text-fx">FX</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="loading-container">
                    <div className="loading-bar">
                        <div 
                            className="loading-progress" 
                            style={{ width: `${loadingProgress}%` }}
                        />
                    </div>
                    <div className="loading-text">
                        Loading {loadingProgress}%
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
