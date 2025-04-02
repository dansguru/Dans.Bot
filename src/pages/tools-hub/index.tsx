import React, { useState, useEffect } from 'react';
import ChunkLoader from '@/components/loader/chunk-loader';
import { localize } from '@deriv-com/translations';

const ToolsHub: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (isLoading) {
                setHasError(true);
            }
        }, 10000);

        return () => clearTimeout(timer);
    }, [isLoading]);

    return (
        <div className='tools-hub-wrapper' style={{ 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            width: '100%',
            padding: '20px'
        }}>
            <div style={{ 
                width: '100%', 
                height: '100%',
                maxWidth: '1200px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative'
            }}>
                {isLoading && (
                    <div style={{ 
                        position: 'absolute', 
                        top: '50%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1
                    }}>
                        <ChunkLoader message={localize('Loading Tradershall Tool Analysis...')} />
                    </div>
                )}

                {hasError && (
                    <div style={{ 
                        position: 'absolute', 
                        top: '50%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        zIndex: 2
                    }}>
                        <h3>{localize('Unable to load Tradershall Tool Analysis')}</h3>
                        <p>{localize('This could be due to connection issues or content security restrictions.')}</p>
                    
                    </div>
                )}

                <iframe 
                    src="https://tool.derivhub.com/" 
                    title="Deriv Tools Hub"
                    style={{ 
                        width: '100%', 
                        height: '100%', 
                        border: 'none',
                        borderRadius: '8px',
                        zIndex: hasError ? 0 : 1
                    }}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
                    loading="lazy"
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false);
                        setHasError(true);
                    }}
                />
            </div>
        </div>
    );
};

export default ToolsHub;
