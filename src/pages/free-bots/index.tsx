import React, { useEffect, useState, useRef, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { LabelPairedFileArrowDownCaptionRegularIcon } from '@deriv/quill-icons/LabelPaired';
import { LabelPairedMoonCaptionRegularIcon } from '@deriv/quill-icons/LabelPaired';
import { LabelPairedExclamationCaptionRegularIcon } from '@deriv/quill-icons/LabelPaired';
import { LabelPairedArrowUpCaptionRegularIcon } from '@deriv/quill-icons/LabelPaired';
import { Localize } from '@deriv-com/translations';
import './free-bots.scss';

// Main directory bots
import DollarPrinterXml from './DollarPrinterOriginal.xml';
import RiseFallAggregatorXml from './Rise Fall Agregator.xml';
import DigitDifferXml from './Digit Differ 3 free Bot.xml';
import ApolloHybridXml from './Apollo Hybrid.xml';
import DesertBoyXml from './Desert Boy.xml';
import CandleMineXml from './True Candle Mine Version 2.xml';
import VixLowerStrategyXml from './Vix-Lower Strategy Bot.xml';
import TradeCityBotXml from './Trade City Bot Version 34.xml';
import LasVegasMoneyPrinterXml from './Las Vegas Money Printer.xml';
import HLProtogeXml from './HL_Protoge Auto_Bot.xml';
import BinogatorGeckoLiteXml from './Binogator Gecko Lite v22.06.14 Commercial Bot.xml';
import GameOverXml from './5 Game Over.xml';
import BigBoyzRiseFallXml from './Big Boyz Rise and Fall.xml';
import LastDigitDesertBoyXml from './LastDigit Desert Boy .xml';
import MilkManXml from './10-stake-Milk_Man.xml';

// DigitMaxim folder bots
import TopSMADailyXml from './DigitMaxim/TOP 01 - SMA Daily.xml';
import TopBollingerXml from './DigitMaxim/TOP 02 - 0012 - B.BOLINGER.xml';
import TopMaestroEvenOddXml from './DigitMaxim/TOP 03 - MAESTRO - EVEN ODD - EN.xml';
import TopWallStreetPutXml from './DigitMaxim/TOP 04 - Wall Street Put - HL - L.xml';
import TopBlackHunterXml from './DigitMaxim/TOP 05 - Black Hunter USDJPY (15m).xml';
import TopHighTickLowTickXml from './DigitMaxim/TOP 06 - High Tick & Low Tick Analyzer Strategy.xml';
import TopRiseFallCandleXml from './DigitMaxim/TOP 07 - BOT - 0002 - Rise-Fall - Candle Close-Open - MG.xml';
import TopDigitsMatchesDiffersXml from './DigitMaxim/TOP 08 - Digits Matches&Differs - List Analyser Strategy.xml';
import TopDigitsOverUnderXml from './DigitMaxim/TOP 09 - Digits Over&Under - Predict Number.xml';
import TopEvenOddMGXml from './DigitMaxim/TOP 10 - BOT - 0001 - Even_Odd -  MG with Stop X.xml';

// Digits folder bots
import CashMachineXml from './digits/10-stake-cashmachine.xml';
import Differ123Xml from './digits/123Differ.xml';
import HoursBot24PrXml from './digits/24hrs bot pr.xml';
import BestDigitBotXml from './digits/Best Digit Bot.xml';
import BinaryBotOverProfitXml from './digits/BINARY BOT OVER PROFIT.xml';
import BotOverUnderXml from './digits/BOT - 0008 - Over Under.xml';
import DigitOverXml from './digits/Digit Over 0-9.xml';
import DigitsAnalyzerXml from './digits/Digits Analyzer.xml';
import ExecutiveDigitsXml from './digits/Executive Digits.xml';
import WolvesSpeedBotXml from './digits/WOLVES SPEED BOT.xml';

// FreeSourceBots folder bots
import BinaryBotPremiumRiseFallXml from './FreeSourceBots/binary-bot Premium Rise_Fall .xml';
import DefenderDigitsAutoBotXml from './FreeSourceBots/Defender_Digits Auto Bot.xml';
import DigitOver3Xml from './FreeSourceBots/Digit Over 3.xml';
import ExponentialStrategyBotXml from './FreeSourceBots/Exponential Strategy Bot 2.0.xml';
import HaramiBinaryBotXml from './FreeSourceBots/HARAMI Binary-Bot.xml';
import HigherLowerTrendChallengerXml from './FreeSourceBots/Higher-Lower Trend-Challenger BinaryBot .xml';
import HLBearKingXml from './FreeSourceBots/HL BearKing premium Bot.xml';
import HLHammerBBotXml from './FreeSourceBots/HL HAMMER B-BOT 1.0.xml';
import SharkDigitsXml from './FreeSourceBots/Shark_Digits.xml';
import SuperDigitDifferBotXml from './FreeSourceBots/Super Digit Differ Bot.xml';

// Higher/Lower folder bots
import Ambot123Xml from './higherlower/Ambot 123 v. 4 Reverso.xml';
import HiLoContoXml from './higherlower/CONTO HILO.xml';
import FakeLosesHigherOnlyXml from './higherlower/FAKE LOSES HIGHER ONLY.xml';
import FinalPowerRSITrendXml from './higherlower/FINAL POWER RSI TREND HILO DRAFT 2.xml';
import HigherStochasticEmasXml from './higherlower/higher stochastic emas.xml';
import HigherBotXml from './higherlower/HigherBot1.xml';
import HLBondBinaryBotXml from './higherlower/HL_Bond_Binary_Bot.xml';
import HLProtogeHigherXml from './higherlower/HL_Protoge Auto_Bot.xml';
import OneMinuteKillerBotXml from './higherlower/one minute killer bot.xml';
import PerfectBotV2Xml from './higherlower/Perfect bot V.2.xml';

// Rise/Fall folder bots
import SmartRiseFallXml from './risefall/SMART RISE AND FALL BOT.xml';
import SmartBot12V1Xml from './risefall/12 smartbotV1.xml';
import BinaryCallPutXml from './risefall/Binary CALL PUT Bot Ever.xml';
import CandleMajesticXml from './risefall/Candles Majestic - LiveBots.xml';
import ReverseSignalFoxXml from './risefall/BOT REVERSE SIGNAL FOX TRADER (1).xml';
import EMA_RSI_MACDXml from './risefall/bot-mascd-rsi.xml';
import RsiAccuratingXml from './risefall/RSI BOT ACCURATING BOT.xml';
import BobEmaRFXml from './risefall/binary-bot BOB EMA RF v.3.xml';
import RsiSafeBotXml from './risefall/Rsi safe bot.xml';
import TickPowerFlowXml from './risefall/Tick_Power_Flow Auto-Bot.xml';

// Testing Bots folder
import BlackHunterIndex100_7sXml from './Testing Bots/Black Hunter Index100 (7s).xml';
import BollingerBandsRSIXml from './Testing Bots/Bollinger Bands and RSI -  Default.xml';
import OriginalBlackHunterXml from './Testing Bots/Original Black Hunter - No Martingale DBot Version 12.xml';
import RiseFallBinaryDigitsTrendXml from './Testing Bots/Rise-Fall Binary Digits-Trend Ai Bot 101.xml';
import SimpleEvenOddXml from './Testing Bots/Simple Even Odd.xml';

const FreeBots = observer(() => {
    const { load_modal, dashboard, blockly_store } = useStore();
    const { handleFileChange } = load_modal;
    const [loadingBotId, setLoadingBotId] = useState<number | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [showScrollTop, setShowScrollTop] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    // For lazy loading
    const [visibleItemsCount, setVisibleItemsCount] = useState(20);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadingTriggerRef = useRef<HTMLDivElement | null>(null);

    // Map filenames to their XML content
    const botXmlMap: Record<string, string> = {
        // Main directory bots
        'DollarPrinterOriginal.xml': DollarPrinterXml,
        'Rise Fall Agregator.xml': RiseFallAggregatorXml,
        'Digit Differ 3 free Bot.xml': DigitDifferXml,
        'Apollo Hybrid.xml': ApolloHybridXml,
        'Desert Boy.xml': DesertBoyXml,
        'True Candle Mine Version 2.xml': CandleMineXml,
        'Vix-Lower Strategy Bot.xml': VixLowerStrategyXml,
        'Trade City Bot Version 34.xml': TradeCityBotXml,
        'Las Vegas Money Printer.xml': LasVegasMoneyPrinterXml,
        'HL_Protoge Auto_Bot.xml': HLProtogeXml,
        'Binogator Gecko Lite v22.06.14 Commercial Bot.xml': BinogatorGeckoLiteXml,
        '5 Game Over.xml': GameOverXml,
        'Big Boyz Rise and Fall.xml': BigBoyzRiseFallXml,
        'LastDigit Desert Boy .xml': LastDigitDesertBoyXml,
        '10-stake-Milk_Man.xml': MilkManXml,
        
        // DigitMaxim folder bots
        'DigitMaxim/TOP 01 - SMA Daily.xml': TopSMADailyXml,
        'DigitMaxim/TOP 02 - 0012 - B.BOLINGER.xml': TopBollingerXml,
        'DigitMaxim/TOP 03 - MAESTRO - EVEN ODD - EN.xml': TopMaestroEvenOddXml,
        'DigitMaxim/TOP 04 - Wall Street Put - HL - L.xml': TopWallStreetPutXml,
        'DigitMaxim/TOP 05 - Black Hunter USDJPY (15m).xml': TopBlackHunterXml,
        'DigitMaxim/TOP 06 - High Tick & Low Tick Analyzer Strategy.xml': TopHighTickLowTickXml,
        'DigitMaxim/TOP 07 - BOT - 0002 - Rise-Fall - Candle Close-Open - MG.xml': TopRiseFallCandleXml,
        'DigitMaxim/TOP 08 - Digits Matches&Differs - List Analyser Strategy.xml': TopDigitsMatchesDiffersXml,
        'DigitMaxim/TOP 09 - Digits Over&Under - Predict Number.xml': TopDigitsOverUnderXml,
        'DigitMaxim/TOP 10 - BOT - 0001 - Even_Odd -  MG with Stop X.xml': TopEvenOddMGXml,
        
        // Digits folder bots
        'digits/10-stake-cashmachine.xml': CashMachineXml,
        'digits/123Differ.xml': Differ123Xml,
        'digits/24hrs bot pr.xml': HoursBot24PrXml,
        'digits/Best Digit Bot.xml': BestDigitBotXml,
        'digits/BINARY BOT OVER PROFIT.xml': BinaryBotOverProfitXml,
        'digits/BOT - 0008 - Over Under.xml': BotOverUnderXml,
        'digits/Digit Over 0-9.xml': DigitOverXml,
        'digits/Digits Analyzer.xml': DigitsAnalyzerXml,
        'digits/Executive Digits.xml': ExecutiveDigitsXml,
        'digits/WOLVES SPEED BOT.xml': WolvesSpeedBotXml,
        
        // FreeSourceBots folder bots
        'FreeSourceBots/binary-bot Premium Rise_Fall .xml': BinaryBotPremiumRiseFallXml,
        'FreeSourceBots/Defender_Digits Auto Bot.xml': DefenderDigitsAutoBotXml,
        'FreeSourceBots/Digit Over 3.xml': DigitOver3Xml,
        'FreeSourceBots/Exponential Strategy Bot 2.0.xml': ExponentialStrategyBotXml,
        'FreeSourceBots/HARAMI Binary-Bot.xml': HaramiBinaryBotXml,
        'FreeSourceBots/Higher-Lower Trend-Challenger BinaryBot .xml': HigherLowerTrendChallengerXml,
        'FreeSourceBots/HL BearKing premium Bot.xml': HLBearKingXml,
        'FreeSourceBots/HL HAMMER B-BOT 1.0.xml': HLHammerBBotXml,
        'FreeSourceBots/Shark_Digits.xml': SharkDigitsXml,
        'FreeSourceBots/Super Digit Differ Bot.xml': SuperDigitDifferBotXml,
        
        // Higher/Lower folder bots
        'higherlower/Ambot 123 v. 4 Reverso.xml': Ambot123Xml,
        'higherlower/CONTO HILO.xml': HiLoContoXml,
        'higherlower/FAKE LOSES HIGHER ONLY.xml': FakeLosesHigherOnlyXml,
        'higherlower/FINAL POWER RSI TREND HILO DRAFT 2.xml': FinalPowerRSITrendXml,
        'higherlower/higher stochastic emas.xml': HigherStochasticEmasXml,
        'higherlower/HigherBot1.xml': HigherBotXml,
        'higherlower/HL_Bond_Binary_Bot.xml': HLBondBinaryBotXml,
        'higherlower/HL_Protoge Auto_Bot.xml': HLProtogeHigherXml,
        'higherlower/one minute killer bot.xml': OneMinuteKillerBotXml,
        'higherlower/Perfect bot V.2.xml': PerfectBotV2Xml,
        
        // Rise/Fall folder bots
        'risefall/SMART RISE AND FALL BOT.xml': SmartRiseFallXml,
        'risefall/12 smartbotV1.xml': SmartBot12V1Xml,
        'risefall/Binary CALL PUT Bot Ever.xml': BinaryCallPutXml,
        'risefall/Candles Majestic - LiveBots.xml': CandleMajesticXml,
        'risefall/BOT REVERSE SIGNAL FOX TRADER (1).xml': ReverseSignalFoxXml,
        'risefall/bot-mascd-rsi.xml': EMA_RSI_MACDXml,
        'risefall/RSI BOT ACCURATING BOT.xml': RsiAccuratingXml,
        'risefall/binary-bot BOB EMA RF v.3.xml': BobEmaRFXml,
        'risefall/Rsi safe bot.xml': RsiSafeBotXml,
        'risefall/Tick_Power_Flow Auto-Bot.xml': TickPowerFlowXml,
        
        // Testing Bots folder
        'Testing Bots/Black Hunter Index100 (7s).xml': BlackHunterIndex100_7sXml,
        'Testing Bots/Bollinger Bands and RSI -  Default.xml': BollingerBandsRSIXml,
        'Testing Bots/Original Black Hunter - No Martingale DBot Version 12.xml': OriginalBlackHunterXml,
        'Testing Bots/Rise-Fall Binary Digits-Trend Ai Bot 101.xml': RiseFallBinaryDigitsTrendXml,
        'Testing Bots/Simple Even Odd.xml': SimpleEvenOddXml,
    };

    // Categories of bots
    const categories = [
        'All',
        'Popular',
        'Digit Analysis',
        'Rise/Fall',
        'Higher/Lower',
        'Premium',
        'Strategy'
    ];

    const bots = [
        // Popular Bots
        {
            name: 'Dollar Printer',
            description: 'Automated trading bot designed for consistent returns',
            file: 'DollarPrinterOriginal.xml',
            icon: '💵',
            category: 'Popular'
        },
        {
            name: 'Trade City Bot',
            description: 'Advanced trading system with comprehensive market analysis',
            file: 'Trade City Bot Version 34.xml',
            icon: '🏙️',
            category: 'Popular'
        },
        {
            name: 'Apollo Hybrid',
            description: 'Versatile trading system with hybrid strategy approach',
            file: 'Apollo Hybrid.xml',
            icon: '🚀',
            category: 'Popular'
        },
        {
            name: 'Las Vegas Money Printer',
            description: 'High-performance bot with consistent win strategy',
            file: 'Las Vegas Money Printer.xml',
            icon: '🎰',
            category: 'Popular'
        },
        {
            name: 'Wolves Speed Bot',
            description: 'Fast-paced trading with optimized performance',
            file: 'digits/WOLVES SPEED BOT.xml',
            icon: '🐺',
            category: 'Popular'
        },
        
        // Digit Analysis Bots
        {
            name: 'Digit Differ 3',
            description: 'Binary options bot focusing on digit analysis and prediction',
            file: 'Digit Differ 3 free Bot.xml',
            icon: '🔢',
            category: 'Digit Analysis'
        },
        {
            name: 'Best Digit Bot',
            description: 'Premium digit analysis with highest win rate',
            file: 'digits/Best Digit Bot.xml',
            icon: '🔝',
            category: 'Digit Analysis'
        },
        {
            name: 'Shark Digits',
            description: 'Aggressive digit trading strategy with market monitoring',
            file: 'FreeSourceBots/Shark_Digits.xml',
            icon: '🦈',
            category: 'Digit Analysis'
        },
        {
            name: 'Super Digit Differ Bot',
            description: 'Advanced differ strategy with optimized parameters',
            file: 'FreeSourceBots/Super Digit Differ Bot.xml',
            icon: '💯',
            category: 'Digit Analysis'
        },
        {
            name: 'Digits Analyzer',
            description: 'Comprehensive digit pattern recognition system',
            file: 'digits/Digits Analyzer.xml',
            icon: '📊',
            category: 'Digit Analysis'
        },
        {
            name: 'TOP Digits Matches & Differs',
            description: 'List analyser with strategy for matches and differs',
            file: 'DigitMaxim/TOP 08 - Digits Matches&Differs - List Analyser Strategy.xml',
            icon: '📋',
            category: 'Digit Analysis'
        },
        {
            name: 'TOP Digits Over & Under',
            description: 'Predict numbers with over/under strategy',
            file: 'DigitMaxim/TOP 09 - Digits Over&Under - Predict Number.xml',
            icon: '⬆️',
            category: 'Digit Analysis'
        },
        {
            name: 'Digit Over 0-9',
            description: 'Complete digit range analysis for optimal entry',
            file: 'digits/Digit Over 0-9.xml',
            icon: '🔟',
            category: 'Digit Analysis'
        },
        {
            name: 'Executive Digits',
            description: 'Professional-grade digit analysis system',
            file: 'digits/Executive Digits.xml',
            icon: '👔',
            category: 'Digit Analysis'
        },
        
        // Rise/Fall Bots
        {
            name: 'Rise Fall Aggregator',
            description: 'Strategic bot for rise/fall markets with aggregated signals',
            file: 'Rise Fall Agregator.xml',
            icon: '📈',
            category: 'Rise/Fall'
        },
        {
            name: 'Big Boyz Rise and Fall',
            description: 'Professional-grade rise/fall strategy for larger accounts',
            file: 'Big Boyz Rise and Fall.xml',
            icon: '💪',
            category: 'Rise/Fall'
        },
        {
            name: 'SMART Rise and Fall Bot',
            description: 'Intelligent analysis for optimal rise/fall entries',
            file: 'risefall/SMART RISE AND FALL BOT.xml',
            icon: '🧠',
            category: 'Rise/Fall'
        },
        {
            name: 'Smart Bot V1',
            description: 'First version of the popular smart strategy for rise/fall',
            file: 'risefall/12 smartbotV1.xml',
            icon: '🤖',
            category: 'Rise/Fall'
        },
        {
            name: 'Binary CALL PUT Bot',
            description: 'Complete solution for call/put options trading',
            file: 'risefall/Binary CALL PUT Bot Ever.xml',
            icon: '📞',
            category: 'Rise/Fall'
        },
        {
            name: 'Candles Majestic',
            description: 'Advanced candlestick pattern recognition for rise/fall',
            file: 'risefall/Candles Majestic - LiveBots.xml',
            icon: '🕯️',
            category: 'Rise/Fall'
        },
        {
            name: 'True Candle Mine',
            description: 'Precise candlestick pattern analysis for accurate entries',
            file: 'True Candle Mine Version 2.xml',
            icon: '🕯️',
            category: 'Rise/Fall'
        },
        {
            name: 'BOT Reverse Signal Fox Trader',
            description: 'Counter-trend strategy for rise/fall markets',
            file: 'risefall/BOT REVERSE SIGNAL FOX TRADER (1).xml',
            icon: '🦊',
            category: 'Rise/Fall'
        },
        {
            name: 'MACD RSI Bot',
            description: 'Technical analysis using MACD and RSI for rise/fall',
            file: 'risefall/bot-mascd-rsi.xml',
            icon: '📊',
            category: 'Rise/Fall'
        },
        {
            name: 'RSI Accurating Bot',
            description: 'Highly accurate RSI-based strategy for rise/fall',
            file: 'risefall/RSI BOT ACCURATING BOT.xml',
            icon: '🎯',
            category: 'Rise/Fall'
        },
        {
            name: 'Rise-Fall Binary Digits Trend AI',
            description: 'AI-enhanced trend analysis for binary digits',
            file: 'Testing Bots/Rise-Fall Binary Digits-Trend Ai Bot 101.xml',
            icon: '🧬',
            category: 'Rise/Fall'
        },
        {
            name: 'TOP Rise-Fall Candle',
            description: 'Martingale strategy using candle open-close data',
            file: 'DigitMaxim/TOP 07 - BOT - 0002 - Rise-Fall - Candle Close-Open - MG.xml',
            icon: '📊',
            category: 'Rise/Fall'
        },
        {
            name: 'Premium Rise/Fall',
            description: 'Binary bot with premium rise/fall strategy',
            file: 'FreeSourceBots/binary-bot Premium Rise_Fall .xml',
            icon: '💎',
            category: 'Rise/Fall'
        },
        {
            name: 'TOP SMA Daily',
            description: 'Simple Moving Average based daily trading strategy',
            file: 'DigitMaxim/TOP 01 - SMA Daily.xml',
            icon: '📆',
            category: 'Rise/Fall'
        },
        {
            name: 'TOP Bollinger',
            description: 'Bollinger Bands strategy for optimal entry points',
            file: 'DigitMaxim/TOP 02 - 0012 - B.BOLINGER.xml',
            icon: '📏',
            category: 'Rise/Fall'
        },
        
        // Additional Main Directory Bots
        {
            name: '5 Game Over',
            description: 'Advanced strategy designed for consistent winning streaks',
            file: '5 Game Over.xml',
            icon: '🎮',
            category: 'Strategy'
        },
        {
            name: 'LastDigit Desert Boy',
            description: 'Specialized last digit analysis bot for desert markets',
            file: 'LastDigit Desert Boy .xml',
            icon: '🏜️',
            category: 'Digit Analysis'
        },
        {
            name: 'Milk Man Stakes',
            description: 'High stakes strategy with optimal money management',
            file: '10-stake-Milk_Man.xml',
            icon: '🥛',
            category: 'Premium'
        },
        
        // Higher/Lower Bots
        {
            name: 'HL Protoge Auto Bot',
            description: 'Automated higher/lower trading with intelligent algorithms',
            file: 'HL_Protoge Auto_Bot.xml',
            icon: '⚡',
            category: 'Higher/Lower'
        },
        {
            name: 'Vix-Lower Strategy',
            description: 'Specialized strategy for volatility index markets',
            file: 'Vix-Lower Strategy Bot.xml',
            icon: '📉',
            category: 'Higher/Lower'
        },
        {
            name: 'TOP Wall Street Put',
            description: 'Higher/Lower trading specialized for Wall Street',
            file: 'DigitMaxim/TOP 04 - Wall Street Put - HL - L.xml',
            icon: '🏢',
            category: 'Higher/Lower'
        },
        {
            name: 'HL BearKing Premium',
            description: 'Premium higher/lower strategy with king-sized profits',
            file: 'FreeSourceBots/HL BearKing premium Bot.xml',
            icon: '👑',
            category: 'Higher/Lower'
        },
        {
            name: 'HL HAMMER',
            description: 'Powerful higher/lower strategy with hammer pattern recognition',
            file: 'FreeSourceBots/HL HAMMER B-BOT 1.0.xml',
            icon: '🔨',
            category: 'Higher/Lower'
        },
        {
            name: 'Higher/Lower Trend Challenger',
            description: 'Challenge the trend with this advanced H/L strategy',
            file: 'FreeSourceBots/Higher-Lower Trend-Challenger BinaryBot .xml',
            icon: '📋',
            category: 'Higher/Lower'
        },
        {
            name: 'Higher Bot',
            description: 'Specialized bot focused on higher market entries',
            file: 'higherlower/HigherBot1.xml',
            icon: '⬆️',
            category: 'Higher/Lower'
        },
        {
            name: 'HL Bond Binary Bot',
            description: 'Stable bond-like returns with HL strategy',
            file: 'higherlower/HL_Bond_Binary_Bot.xml',
            icon: '🔗',
            category: 'Higher/Lower'
        },
        {
            name: 'One Minute Killer Bot',
            description: 'Fast 1-minute higher/lower strategy with high win rate',
            file: 'higherlower/one minute killer bot.xml',
            icon: '⏱️',
            category: 'Higher/Lower'
        },
        {
            name: 'Perfect Bot V2',
            description: 'Refined higher/lower strategy for consistent wins',
            file: 'higherlower/Perfect bot V.2.xml',
            icon: '✅',
            category: 'Higher/Lower'
        },
        
        // Premium Bots
        {
            name: 'Binogator Gecko Lite',
            description: 'Commercial-grade trading bot with proven performance',
            file: 'Binogator Gecko Lite v22.06.14 Commercial Bot.xml',
            icon: '🦎',
            category: 'Premium'
        },
        {
            name: 'Desert Boy',
            description: 'Reliable trading bot optimized for specific market conditions',
            file: 'Desert Boy.xml',
            icon: '🏜️',
            category: 'Premium'
        },
        {
            name: 'TOP Maestro Even/Odd',
            description: 'Master strategy for even/odd trading with high success rate',
            file: 'DigitMaxim/TOP 03 - MAESTRO - EVEN ODD - EN.xml',
            icon: '🎭',
            category: 'Premium'
        },
        {
            name: 'TOP Black Hunter USDJPY',
            description: 'Specialized for USDJPY 15m timeframe hunting',
            file: 'DigitMaxim/TOP 05 - Black Hunter USDJPY (15m).xml',
            icon: '🎯',
            category: 'Premium'
        },
        {
            name: 'TOP Even/Odd MG',
            description: 'Even/Odd martingale strategy with stop loss protection',
            file: 'DigitMaxim/TOP 10 - BOT - 0001 - Even_Odd -  MG with Stop X.xml',
            icon: '🛑',
            category: 'Premium'
        },
        {
            name: '10-Stake Cash Machine',
            description: 'Premium staking strategy with cash machine returns',
            file: 'digits/10-stake-cashmachine.xml',
            icon: '💰',
            category: 'Premium'
        },
        {
            name: 'FAKE LOSES HIGHER ONLY',
            description: 'Premium strategy that turns losing situations into wins',
            file: 'higherlower/FAKE LOSES HIGHER ONLY.xml',
            icon: '🎭',
            category: 'Premium'
        },
        
        // Strategy Bots
        {
            name: 'TOP High/Low Tick Analyzer',
            description: 'Advanced tick analysis for high/low market entries',
            file: 'DigitMaxim/TOP 06 - High Tick & Low Tick Analyzer Strategy.xml',
            icon: '📝',
            category: 'Strategy'
        },
        {
            name: '24hrs Bot PR',
            description: 'Round-the-clock trading strategy with proven results',
            file: 'digits/24hrs bot pr.xml',
            icon: '🕰️',
            category: 'Strategy'
        },
        {
            name: 'BINARY BOT OVER PROFIT',
            description: 'Strategy focused on maximizing profit with over trades',
            file: 'digits/BINARY BOT OVER PROFIT.xml',
            icon: '💹',
            category: 'Strategy'
        },
        {
            name: 'BOT Over/Under',
            description: 'Comprehensive over/under strategy with market analysis',
            file: 'digits/BOT - 0008 - Over Under.xml',
            icon: '⚖️',
            category: 'Strategy'
        },
        {
            name: 'Harami Binary Bot',
            description: 'Candlestick harami pattern recognition strategy',
            file: 'FreeSourceBots/HARAMI Binary-Bot.xml',
            icon: '🍡',
            category: 'Strategy'
        },
        {
            name: 'Exponential Strategy Bot 2.0',
            description: 'Exponential growth strategy with compounding wins',
            file: 'FreeSourceBots/Exponential Strategy Bot 2.0.xml',
            icon: '📈',
            category: 'Strategy'
        },
        {
            name: 'Defender Digits Auto Bot',
            description: 'Defensive strategy that protects capital while growing profits',
            file: 'FreeSourceBots/Defender_Digits Auto Bot.xml',
            icon: '🛡️',
            category: 'Strategy'
        },
        {
            name: 'Ambot 123 Reverso',
            description: 'Reversal strategy with 123 pattern recognition',
            file: 'higherlower/Ambot 123 v. 4 Reverso.xml',
            icon: '🔄',
            category: 'Strategy'
        },
        {
            name: 'HILO CONTO',
            description: 'Higher/Lower account management strategy',
            file: 'higherlower/CONTO HILO.xml',
            icon: '📒',
            category: 'Strategy'
        },
        {
            name: 'FINAL POWER RSI TREND HILO',
            description: 'RSI-based trend following for higher/lower markets',
            file: 'higherlower/FINAL POWER RSI TREND HILO DRAFT 2.xml',
            icon: '⚡',
            category: 'Strategy'
        },
        {
            name: 'Higher Stochastic EMAs',
            description: 'Technical analysis using stochastic and EMAs for higher trades',
            file: 'higherlower/higher stochastic emas.xml',
            icon: '📉',
            category: 'Strategy'
        }
    ];

    const filteredBots = selectedCategory === 'All' 
        ? bots 
        : bots.filter(bot => bot.category === selectedCategory);

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

    // Filter bots based on search input (optional enhancement)
    const [searchQuery, setSearchQuery] = useState('');
    
    const searchFilteredBots = filteredBots.filter(bot => 
        bot.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        bot.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bot.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Get the currently visible bots
    const visibleBots = searchFilteredBots.slice(0, visibleItemsCount);
    const hasMoreItems = visibleItemsCount < searchFilteredBots.length;

    // Load more items function
    const loadMoreItems = useCallback(() => {
        if (isLoadingMore || !hasMoreItems) return;
        
        setIsLoadingMore(true);
        
        // Simulating a delay to prevent UI freezing with large data
        setTimeout(() => {
            setVisibleItemsCount(prevCount => {
                const nextCount = prevCount + 10; // Load 10 more items at a time
                return Math.min(nextCount, searchFilteredBots.length);
            });
            setIsLoadingMore(false);
        }, 300);
    }, [isLoadingMore, searchFilteredBots.length, hasMoreItems]);

    // Set up the intersection observer for infinite scrolling
    useEffect(() => {
        // Reset visible items count when category or search changes
        setVisibleItemsCount(20);
        
        if (observerRef.current) {
            observerRef.current.disconnect();
        }
        
        // Create a new intersection observer
        observerRef.current = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    loadMoreItems();
                }
            },
            { rootMargin: '200px' } // Start loading when 200px from the bottom
        );
        
        // Observe the loading trigger element
        if (loadingTriggerRef.current) {
            observerRef.current.observe(loadingTriggerRef.current);
        }
        
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [loadMoreItems, selectedCategory, searchQuery]);

    // Handle scroll to show/hide the scroll-to-top button
    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollTop } = scrollContainerRef.current;
            setShowScrollTop(scrollTop > 300);
        }
    };

    // Scroll to top function
    const scrollToTop = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    };

    // Handle keyboard navigation for accessibility
    const handleKeyDown = (e: React.KeyboardEvent, botIndex: number) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const bot = visibleBots[botIndex];
            handleBotSelect(bot.file, botIndex);
        }
    };

    // Original useEffect for initial animations
    useEffect(() => {
        const cards = document.querySelectorAll('.free-bots__card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                (card as HTMLElement).style.opacity = '1';
                (card as HTMLElement).style.transform = 'translateY(0)';
            }, 50 * Math.min(index, 20)); // Limit animation delay for better performance
        });

        // Add scroll event listener
        const scrollContainer = scrollContainerRef.current;
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleScroll);
        }

        return () => {
            if (scrollContainer) {
                scrollContainer.removeEventListener('scroll', handleScroll);
            }
        };
    }, [visibleBots]);

    // Render individual bot card
    const renderBotCard = (bot, index) => (
        <div 
            key={`${bot.name}-${index}`} 
            className='free-bots__card'
            style={{ 
                opacity: 0, 
                transform: 'translateY(20px)', 
                transition: 'all 0.3s ease-out'
            }}
            onClick={() => handleBotSelect(bot.file, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            tabIndex={0}
            role="button"
            aria-label={`Load ${bot.name} bot`}
        >
            <div className='free-bots__card-category'>{bot.category}</div>
            <div className='free-bots__card-icon'>{bot.icon}</div>
            <div className='free-bots__card-content'>
                <h3 title={bot.name}>{bot.name}</h3>
            </div>
            
            {/* Info tooltip that appears on hover */}
            <div className='free-bots__card-info'>
                <h3>{bot.name}</h3>
                <p>{bot.description}</p>
                <button 
                    className={`free-bots__download-btn ${loadingBotId === index ? 'loading' : ''}`}
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent double triggering from card click
                        handleBotSelect(bot.file, index);
                    }}
                    disabled={loadingBotId !== null}
                    aria-label={`Load ${bot.name} bot`}
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
    );

    return (
        <div className='free-bots'>
            <div className='free-bots__header'>
                <LabelPairedMoonCaptionRegularIcon height='32px' width='32px' fill='var(--button-primary-default)' />
                <h1>Trading Bots Collection</h1>
                <p>Browse our library of high-performance trading bots</p>
            </div>
            
            {loadError && (
                <div className='free-bots__error-message'>
                    <LabelPairedExclamationCaptionRegularIcon height='20px' width='20px' fill='var(--status-danger)' />
                    <span>{loadError}</span>
                </div>
            )}
            
            <div className='free-bots__category-selector'>
                {categories.map(category => (
                    <button 
                        key={category}
                        className={`free-bots__category-btn ${selectedCategory === category ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(category)}
                    >
                        {category}
                    </button>
                ))}
            </div>
            
            <div className='free-bots__search'>
                <input
                    type='text'
                    placeholder='Search bots...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='free-bots__search-input'
                />
            </div>
            
            <div className='free-bots__stats'>
                <div className='free-bots__stat-item'>
                    <span className='free-bots__stat-value'>{bots.length}</span>
                    <span className='free-bots__stat-label'>Total</span>
                </div>
                <div className='free-bots__stat-item'>
                    <span className='free-bots__stat-value'>{categories.length - 1}</span>
                    <span className='free-bots__stat-label'>Categories</span>
                </div>
                <div className='free-bots__stat-item'>
                    <span className='free-bots__stat-value'>{searchFilteredBots.length}</span>
                    <span className='free-bots__stat-label'>Showing</span>
                </div>
            </div>
            
            <div className='free-bots__scroll-container' ref={scrollContainerRef}>
                <div className="bot-list-container">
                    <div className='free-bots__grid'>
                        {visibleBots.map((bot, index) => renderBotCard(bot, index))}
                    </div>
                    
                    {/* Loading indicator and trigger for lazy loading */}
                    {hasMoreItems && (
                        <div 
                            className='free-bots__loading-more' 
                            ref={loadingTriggerRef}
                        >
                            <div className="spinner"></div>
                            <p>Loading more bots...</p>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Scroll to top button */}
            <div 
                className={`free-bots__scroll-top ${showScrollTop ? 'visible' : ''}`}
                onClick={scrollToTop}
                role="button"
                aria-label="Scroll to top"
                tabIndex={0}
            >
                <LabelPairedArrowUpCaptionRegularIcon height='20px' width='20px' />
            </div>
        </div>
    );
});

export default FreeBots;