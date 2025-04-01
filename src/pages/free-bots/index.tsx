import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { LabelPairedFileArrowDownCaptionRegularIcon } from '@deriv/quill-icons/LabelPaired';
import { LabelPairedMoonCaptionRegularIcon } from '@deriv/quill-icons/LabelPaired';
import { LabelPairedExclamationCaptionRegularIcon } from '@deriv/quill-icons/LabelPaired';
import { Localize } from '@deriv-com/translations';
import './free-bots.scss';

// Import the XML files directly
import OverUnderSwitcherXml from './AI V3 UNDER 9.xml';
import DigitMatchesXml from './DIGIT FAST BOT.xml';
import SpeedBotV3Xml from './SPEED BOT  V3.xml';
import AutoSwitchXml from './AUTO BOT.xml';
import G12BotXml from './G12 BOT SPEED EVEN.xml'; 
import SpeedBotV2Xml from './_SPEED BOT  V2 RISE FALL.xml';
import GolminerXml from './GOLMINER_XVT.xml';

const FreeBots = observer(() => {
    const { load_modal, dashboard, blockly_store } = useStore();
    const { handleFileChange } = load_modal;
    const [loadingBotId, setLoadingBotId] = useState<number | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
 
    // Map filenames to their XML content
    const botXmlMap: Record<string, string> = {
        'AI V3 UNDER 9.xml': OverUnderSwitcherXml,
        'DIGIT FAST BOT.xml': DigitMatchesXml,
        'SPEED BOT  V3.xml': SpeedBotV3Xml,
        'AUTO BOT.xml': AutoSwitchXml,
        'G12 BOT SPEED EVEN.xml': G12BotXml,
        '_SPEED BOT  V2 RISE FALL.xml': SpeedBotV2Xml,
        'GOLMINER_XVT.xml': GolminerXml,
    };

    const bots = [
        {
            name: 'AI V3 Under 9 Bot',
            description: 'Advanced AI-powered bot for Under 9 trading with smart switching capabilities',
            file: 'AI V3 UNDER 9.xml',
            icon: '🤖'
        },
        {
            name: 'Digit Fast Bot',
            description: 'Precision trading with advanced digit matching strategy for consistent results',
            file: 'DIGIT FAST BOT.xml',
            icon: '🔢'
        },
        {
            name: 'Speed Bot V3',
            description: 'High-speed trading bot with optimized performance for rapid market movements',
            file: 'SPEED BOT  V3.xml',
            icon: '⚡'
        },
        {
            name: 'Auto Bot',
            description: 'Automated trading bot with intelligent market analysis',
            file: 'AUTO BOT.xml',
            icon: '📈'
        },
        {
            name: 'G12 Bot Speed Even',
            description: 'Speed-based trading for even/odd outcomes with G12 technology integration',
            file: 'G12 BOT SPEED EVEN.xml',
            icon: '💹'
        },
        {
            name: 'Speed Bot V2 Rise Fall',
            description: 'Enhanced version of the popular speed trading bot with improved algorithms',
            file: '_SPEED BOT  V2 RISE FALL.xml',
            icon: '🚀'
        },
        {
            name: 'Golminer XVT',
            description: 'Advanced mining strategy bot designed for maximum profit extraction',
            file: 'GOLMINER_XVT.xml',
            icon: '⛏️'
        }
    ];

    const handleBotSelect = (filename: string, botIndex: number) => {
        // Reset any previous errors
        setLoadError(null);
        // Set loading state for this specific bot
        setLoadingBotId(botIndex);
    
        
        // Set the dashboard tab to Bot Builder (tab index 1)
        dashboard.setActiveTab(1);
        
        // Get the XML content for this bot
        const xmlContent = botXmlMap[filename];
        
        if (!xmlContent) {
            console.error(`XML content not found for ${filename}`);
            setLoadError(`Could not load bot: XML file "${filename}" not found`);
            setLoadingBotId(null);
            return;
        }
        
        // Wait for Blockly to be fully loaded
        const loadBot = () => {
            // Set a timeout to prevent infinite loops
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max waiting time
            
            const tryLoadBot = () => {
                if (!window.Blockly?.derivWorkspace) {
                    attempts++;
                    if (attempts > maxAttempts) {
                        setLoadError('Blockly workspace not available after multiple attempts');
                        setLoadingBotId(null);
                        return;
                    }
                    setTimeout(tryLoadBot, 100);
                    return;
                }
                
                try {
                    // Validate XML before attempting to load
                    if (!xmlContent.includes('<xml') || !xmlContent.includes('</xml>')) {
                        throw new Error('Invalid XML format');
                    }
                    
                    // Clear existing workspace
                    window.Blockly.derivWorkspace.asyncClear();
                    
                    // Parse the XML and load it into the workspace
                    const xml = window.Blockly.utils.xml.textToDom(xmlContent);
                    window.Blockly.Xml.domToWorkspace(xml, window.Blockly.derivWorkspace);
                    
                    // Save the current workspace for recovery
                    window.Blockly.derivWorkspace.strategy_to_load = xmlContent;
                    
                    // Update UI if needed
                    window.Blockly.derivWorkspace.cleanUp();
                    
                    // Successfully loaded
                    console.log(`Successfully loaded bot: ${filename}`);
                    
                    // Clear loading state
                    setLoadingBotId(null);
                } catch (error) {
                    console.error('Error loading bot:', error);
                    setLoadError(`Failed to load bot: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    setLoadingBotId(null);
                }
            };
            
            tryLoadBot();
        };
        
        loadBot();
    };

   
    useEffect(() => {
        const cards = document.querySelectorAll('.free-bots__card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                (card as HTMLElement).style.opacity = '1';
                (card as HTMLElement).style.transform = 'translateY(0)';
            }, 100 * index);
        });
    }, []);

    return (
        <div className='free-bots'>
            <div className='free-bots__header'>
                <LabelPairedMoonCaptionRegularIcon height='32px' width='32px' fill='var(--button-primary-default)' />
                <h1>Free Trading Bots</h1>
                <p>Select from our collection of high-performance trading bots</p>
            </div>
            {loadError && (
                <div className='free-bots__error-message'>
                    <LabelPairedExclamationCaptionRegularIcon height='20px' width='20px' fill='var(--status-danger)' />
                    <span>{loadError}</span>
                </div>
            )}
            <div className='free-bots__scroll-container'>
                <div className="bot-list-container">
                    <div className='free-bots__grid'>
                        {bots.map((bot, index) => (
                            <div 
                                key={index} 
                                className='free-bots__card'
                                style={{ 
                                    opacity: 0, 
                                    transform: 'translateY(20px)', 
                                    transition: 'all 0.4s ease-out'
                                }}
                            >
                                <div className='free-bots__card-icon'>{bot.icon}</div>
                                <div className='free-bots__card-content'>
                                    <h3>{bot.name}</h3>
                                    <p>{bot.description}</p>
                                    <button 
                                        className={`free-bots__download-btn ${loadingBotId === index ? 'loading' : ''}`}
                                        onClick={() => handleBotSelect(bot.file, index)}
                                        disabled={loadingBotId !== null}
                                    >
                                        {loadingBotId === index ? (
                                            <span>Loading...</span>
                                        ) : (
                                            <>
                                                <LabelPairedFileArrowDownCaptionRegularIcon height='16px' width='16px' />
                                                <span>Load Bot</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default FreeBots;