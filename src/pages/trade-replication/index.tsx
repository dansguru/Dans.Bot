import React, { useState, useEffect, useCallback, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { localize } from '@deriv-com/translations';
import { ToggleSwitch as DerivToggleSwitch, Button, Modal } from '@deriv-com/ui';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import ToggleSwitch from './components/toggle-switch';
import './trade-replication.scss';
import { generateOAuthURL } from '@/components/shared';
import { requestOidcAuthentication } from '@deriv-com/auth-client';
import { Localize } from '@deriv-com/translations';
import { useOauth2 } from '@/hooks/auth/useOauth2';
import { api_base } from '@/external/bot-skeleton';
import CustomModal from './components/custom-modal';

// Store Types
interface TAccount {
    loginid: string;
    currency: string;
    balance: number;
    is_virtual: boolean;
    token: string;
}

interface ClientStore {
    is_logged_in: boolean;
    accountList: TAccount[];
    setAccountList: (accounts: TAccount[]) => void;
    setBalance: (balance: number) => void;
    all_accounts_balance?: any;
    is_virtual?: boolean;
}

interface StoreType {
    client: ClientStore;
}

// API Types
interface ApiResponse<T> {
    error?: {
        message: string;
    };
    result?: T;
}

interface ApiBase {
    connectionStatus: 'connected' | 'disconnected';
    isAuthorized: boolean;
    isAuthorizing: boolean;
    accountList: TAccount[];
    authData: any;
    activeLoginid: string;
}

interface Account {
    loginid: string;
    currency: string;
    balance: number;
    is_virtual: boolean;
    token: string;
}

interface Trade {
    id: string;
    amount: number;
    type: string;
    symbol: string;
    contract_type: string;
    parameters: Record<string, any>;
}

interface ReplicationSettings {
    riskManagement: 'auto' | 'fixed';
    dailyLossLimit: number;
    minBalanceThreshold: number;
    askBeforeExecuting: boolean;
    fixedRiskPercentage?: number;
    maxTradeSize?: number;
}

interface TradeConfirmation {
    demoAmount: number;
    realAmount: number;
    type: string;
    symbol: string;
    riskPercentage: number;
}

interface SystemStatus {
    status: 'success' | 'error' | 'warning' | 'inactive';
    message: string;
}

interface TradeResult {
    success: boolean;
    error?: string;
    profit?: number;
    tradeId?: string;
}

// Define types for trade and transaction data
interface TradeTransaction {
    transaction_id: string;
    amount: number;
    description: string;
    symbol: string;
    contract_type: string;
    parameters: any;
    action: string;
    status: string;
}

interface ContractInfo {
    contract_type: string;
    underlying: string;
    tick_count?: number;
    date_expiry?: number;
    date_start?: number;
    barrier?: string;
    high_barrier?: string;
    low_barrier?: string;
    currency: string;
    limit_order?: {
        take_profit?: { order_amount: number };
        stop_loss?: { order_amount: number };
    };
    last_digit_prediction?: number;
    asian_type?: string;
}

interface ContractParameters {
    contract_type: string;
    symbol: string;
    duration: number;
    duration_unit: string;
    barrier?: string;
    second_barrier?: string;
    basis: string;
    currency: string;
    limit_order: {
        take_profit?: number;
        stop_loss?: number;
    };
    last_digit_prediction?: number;
    asian_type?: string;
    barrier_range?: [string, string];
    tick_count?: number;
}

interface ActiveTrade {
    demoTradeId: string;
    realTradeId: string;
    amount: number;
    type: string;
    timestamp: string;
    demoProfit: number;
    realProfit: number;
    status?: string;
}

interface ReplicationHistoryItem {
    id: string;
    demoTradeId: string;
    realTradeId?: string;
    amount: number;
    type: string;
    timestamp: string;
    status: 'success' | 'failed';
    reason?: string;
}

interface ContractDetailsResult {
    success: boolean;
    contractId?: string;
    parameters?: ContractParameters;
    error?: string;
}

const TradeReplication = observer(() => {
    const { client } = useStore() as unknown as StoreType;
    const { isAuthorized, isAuthorizing } = useApiBase();
    const { isOAuth2Enabled } = useOauth2();
    const [isReplicationEnabled, setIsReplicationEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasVirtualAccount, setHasVirtualAccount] = useState(false);
    const [hasRealAccount, setHasRealAccount] = useState(false);
    const [demoAccount, setDemoAccount] = useState<TAccount | null>(null);
    const [realAccount, setRealAccount] = useState<TAccount | null>(null);
    const [replicationHistory, setReplicationHistory] = useState<ReplicationHistoryItem[]>([]);
    const [ws, setWs] = useState<any>(null);
    const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
    const [demoBalance, setDemoBalance] = useState(0);
    const [realBalance, setRealBalance] = useState(0);
    const [demoProfit, setDemoProfit] = useState(0);
    const [realProfit, setRealProfit] = useState(0);
    const [settings, setSettings] = useState<ReplicationSettings>({
        riskManagement: 'auto',
        dailyLossLimit: 10,
        minBalanceThreshold: 50,
        askBeforeExecuting: true,
        maxTradeSize: 1000
    });
    const [dailyLoss, setDailyLoss] = useState(0);
    const [marginCheck, setMarginCheck] = useState<SystemStatus>({
        status: 'inactive',
        message: 'Waiting for trade...'
    });
    const [circuitBreaker, setCircuitBreaker] = useState<SystemStatus>({
        status: 'inactive',
        message: 'System ready'
    });
    const [confirmationTrade, setConfirmationTrade] = useState<TradeConfirmation | null>(null);

    // API & Auth state
    const { core } = useStore();

    // Refs for API calls and intervals
    const tradeMonitoringInterval = useRef<NodeJS.Timeout | null>(null);

    // Initialize WebSocket connection
    const initializeWebSocket = useCallback(async () => {
        try {
            if (!isAuthorized || !client?.is_logged_in) return;

            const ws = await api_base.api?.connect();
            if (!ws) {
                console.error('Failed to initialize WebSocket connection');
                return;
            }

            setWs(ws);

            // Subscribe to balance updates
            if (demoAccount?.loginid) {
                await ws.balance.subscribe({
                    subscribe: 1,
                    loginid: demoAccount.loginid,
                });
            }
            if (realAccount?.loginid) {
                await ws.balance.subscribe({
                    subscribe: 1,
                    loginid: realAccount.loginid,
                });
            }

            // Handle WebSocket connection state
            ws.on('connection_state', (state: number) => {
                console.log('WebSocket connection state:', state);
                if (state === 3) { // Connection closed
                    console.log('WebSocket connection closed, attempting to reconnect...');
                    setTimeout(initializeWebSocket, 5000); // Retry after 5 seconds
                }
            });
        } catch (error) {
            console.error('Error initializing WebSocket:', error);
            setError('Failed to initialize WebSocket connection');
        }
    }, [isAuthorized, client?.is_logged_in, demoAccount?.loginid, realAccount?.loginid]);

    // Update balances
    const updateBalances = useCallback(async () => {
        try {
            if (!ws || !demoAccount || !realAccount) return;

            const [demoBalanceRes, realBalanceRes] = await Promise.all([
                ws.authorized.balance({ loginid: demoAccount.loginid }),
                ws.authorized.balance({ loginid: realAccount.loginid }),
            ]);

            setDemoBalance(demoBalanceRes.balance);
            setRealBalance(realBalanceRes.balance);
        } catch (error) {
            console.error('Error updating balances:', error);
            setError('Failed to update balances');
        }
    }, [ws, demoAccount, realAccount]);

    // Check if user is logged in
    const checkLoginStatus = useCallback(async () => {
        try {
            if (!client?.is_logged_in) {
                setError('Not logged in');
                return;
            }

            if (!api_base.api) {
                console.error('API not initialized');
                return;
            }
            
            const response = await api_base.api.authorize();
            if (response?.error) {
                console.error('Authorization failed:', response.error);
                setError('Authorization failed');
                return;
            }
            
            // Check for both demo and real accounts
            const accounts = await api_base.api.getAccountList();
            if (accounts?.error) {
                console.error('Failed to get account list:', accounts.error);
                setError('Failed to get account list');
                return;
            }

            const demoAccount = accounts.accounts.find((account: TAccount) => account.is_virtual);
            const realAccount = accounts.accounts.find((account: TAccount) => !account.is_virtual);

            setHasVirtualAccount(!!demoAccount);
            setHasRealAccount(!!realAccount);
            setDemoAccount(demoAccount || null);
            setRealAccount(realAccount || null);
        } catch (error) {
            console.error('Failed to check login status:', error);
            setError('Failed to check login status');
        }
    }, [client?.is_logged_in]);

    // Initialize component
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                await checkLoginStatus();
                if (isAuthorized && client?.is_logged_in) {
                    await initializeWebSocket();
                    await updateBalances();
                }
            } catch (error) {
                console.error('Error during initialization:', error);
                setError('Failed to initialize component');
            } finally {
                setIsLoading(false);
            }
        };

        init();

        // Cleanup function
        return () => {
            if (ws) {
                ws.disconnect();
            }
        };
    }, [checkLoginStatus, initializeWebSocket, updateBalances, isAuthorized, client?.is_logged_in]);

    // Handle toggle change
    const handleToggleChange = (checked: boolean) => {
        if (!isAuthorized) {
            setError('You need to be logged in to use this feature.');
            return;
        }
        
        if (checked && (!hasVirtualAccount || !hasRealAccount)) {
            setError('You need both a Demo account and a Real account to use Trade Replication.');
            return;
        }
        
        setIsReplicationEnabled(checked);
        
        if (!checked) {
            console.log('Trade replication disabled. Existing trades remain active.');
        } else {
            console.log('Trade replication enabled. Starting trade monitoring...');
        }
    };

    // Monitor trades in demo account and replicate to real account
    const startTradeMonitoring = useCallback(() => {
        if (!isAuthorized || !api_base.api || !demoAccount?.loginid || !realAccount?.loginid) return;
        
        // Clear any existing interval
        if (tradeMonitoringInterval.current) {
            clearInterval(tradeMonitoringInterval.current);
        }
        
        let lastCheckedTimestamp = Date.now();
        
        // Set up interval to check for new trades
        tradeMonitoringInterval.current = setInterval(async () => {
            try {
                // 1. Check demo account for new trades
                const currentTimestamp = Date.now();
                const startTime = Math.floor(lastCheckedTimestamp / 1000);
                const endTime = Math.floor(currentTimestamp / 1000);
                
                // Switch to demo account for checking
                await api_base.api.authorize(demoAccount.token);
                
                // Fetch recent transactions
                const transactionsResponse = await api_base.api.statement({
                    statement: "statement",
                    account: demoAccount.loginid,
                    date_from: startTime,
                    date_to: endTime,
                    description: 1,
                    limit: 50,
                    offset: 0
                });
                
                lastCheckedTimestamp = currentTimestamp;
                
                if (transactionsResponse.error) {
                    console.error('Transaction API error:', transactionsResponse.error);
                    return;
                }
                
                const newTrades = (transactionsResponse.statement?.transactions || [])
                    .filter((tx: TradeTransaction) => tx.action === 'buy' && tx.status !== 'cancelled');
                
                // 2. Process and replicate new trades if any
                for (const trade of newTrades) {
                    // 3. Check if we have sufficient balance in real account
                    if (trade.amount > realBalance) {
                        console.warn(`Insufficient balance to replicate trade: ${trade.transaction_id}`);
                        
                        // Add to history as failed
                        setReplicationHistory(prev => [
                            {
                                id: `${Date.now()}-${trade.transaction_id}`,
                                demoTradeId: trade.transaction_id,
                                amount: trade.amount,
                                type: trade.description,
                                timestamp: new Date().toISOString(),
                                status: 'failed',
                                reason: 'Insufficient balance'
                            },
                            ...prev
                        ]);
                        
                        continue;
                    }
                    
                    // Switch to real account for placing trade
                    await api_base.api.authorize(realAccount.token);
                    
                    // Extract contract parameters from the transaction data
                    const contractDetails = await extractContractParameters(trade, api_base.api);
                    
                    if (!contractDetails.success) {
                        console.error('Error extracting contract parameters:', contractDetails.error);
                        
                        // Add to history as failed
                        setReplicationHistory(prev => [
                            {
                                id: `${Date.now()}-${trade.transaction_id}`,
                                demoTradeId: trade.transaction_id,
                                amount: trade.amount,
                                type: trade.description,
                                timestamp: new Date().toISOString(),
                                status: 'failed',
                                reason: 'Failed to extract contract parameters: ' + contractDetails.error
                            },
                            ...prev
                        ]);
                        
                        continue;
                    }
                    
                    // Execute the buy contract with the extracted parameters
                    const buyResponse = await api_base.api.placeTrade({
                        ...trade,
                        amount: trade.amount,
                        loginid: realAccount.loginid
                    });
                    
                    if (buyResponse.error) {
                        console.error('Error replicating trade:', buyResponse.error);
                        
                        // Add to history as failed
                        setReplicationHistory(prev => [
                            {
                                id: `${Date.now()}-${trade.transaction_id}`,
                                demoTradeId: trade.transaction_id,
                                amount: trade.amount,
                                type: trade.description,
                                timestamp: new Date().toISOString(),
                                status: 'failed',
                                reason: buyResponse.error.message
                            },
                            ...prev
                        ]);
                    } else {
                        // Add to active trades
                        const newTrade: ActiveTrade = {
                            demoTradeId: trade.transaction_id,
                            realTradeId: buyResponse.buy.transaction_id,
                            amount: trade.amount,
                            type: trade.description,
                            timestamp: new Date().toISOString(),
                            demoProfit: 0,
                            realProfit: 0
                        };
                        
                        setActiveTrades(prev => [...prev, newTrade]);
                        
                        // Add to history as success
                        setReplicationHistory(prev => [
                            {
                                id: `${Date.now()}-${trade.transaction_id}`,
                                demoTradeId: trade.transaction_id,
                                realTradeId: buyResponse.buy.transaction_id,
                                amount: trade.amount,
                                type: trade.description,
                                timestamp: new Date().toISOString(),
                                status: 'success'
                            },
                            ...prev
                        ]);
                        
                        // Update P/L
                        updateProfitLoss();
                    }
                }
                
                // Switch back to demo account
                await api_base.api.authorize(demoAccount.token);
                
            } catch (error) {
                console.error('Error in trade monitoring:', error);
            }
        }, 5000); // Check every 5 seconds
        
        return () => {
            if (tradeMonitoringInterval.current) {
                clearInterval(tradeMonitoringInterval.current);
            }
        };
    }, [isAuthorized, api_base.api, demoAccount, realAccount, realBalance]);

    // Update profit/loss for active trades
    const updateProfitLoss = useCallback(async () => {
        if (!isAuthorized || !api_base.api || !activeTrades.length) return;
        
        try {
            // Get demo account profit/loss
            await api_base.api.authorize(demoAccount?.token || '');
            const demoPLResponse = await api_base.api.profitTable({
                profit_table: 1,
                description: 1,
                limit: 50
            });
            
            // Get real account profit/loss
            await api_base.api.authorize(realAccount?.token || '');
            const realPLResponse = await api_base.api.profitTable({
                profit_table: 1,
                description: 1,
                limit: 50
            });
            
            // Update active trades with latest P/L data
            const updatedTrades = activeTrades.map(trade => {
                const demoTradeData = demoPLResponse.profit_table?.transactions?.find(
                    (t: { transaction_id: string }) => t.transaction_id === trade.demoTradeId
                );
                
                const realTradeData = realPLResponse.profit_table?.transactions?.find(
                    (t: { transaction_id: string }) => t.transaction_id === trade.realTradeId
                );
                
                return {
                    ...trade,
                    demoProfit: demoTradeData?.profit || 0,
                    realProfit: realTradeData?.profit || 0,
                    status: realTradeData?.status || 'open'
                };
            });
            
            setActiveTrades(updatedTrades);
            
            // Calculate total profit/loss
            const totalDemoProfit = updatedTrades.reduce((sum, trade) => sum + (trade.demoProfit || 0), 0);
            const totalRealProfit = updatedTrades.reduce((sum, trade) => sum + (trade.realProfit || 0), 0);
            
            setDemoProfit(totalDemoProfit);
            setRealProfit(totalRealProfit);
            
            // Remove closed trades from active list
            setActiveTrades(prev => prev.filter(trade => trade.status === 'open'));
            
        } catch (error) {
            console.error('Error updating profit/loss:', error);
        }
    }, [isAuthorized, api_base.api, demoAccount, realAccount, activeTrades]);

    // Effect for starting/stopping trade monitoring
    useEffect(() => {
        if (isReplicationEnabled) {
            startTradeMonitoring();
        } else if (tradeMonitoringInterval.current) {
            clearInterval(tradeMonitoringInterval.current);
            tradeMonitoringInterval.current = null;
        }
        
        return () => {
            if (tradeMonitoringInterval.current) {
                clearInterval(tradeMonitoringInterval.current);
            }
        };
    }, [isReplicationEnabled, startTradeMonitoring]);

    // Format numbers to 2 decimal places
    const formatNumber = (num: number) => {
        return num.toFixed(2);
    };

    // Enhanced balance check with proper scaling
    const calculateMaxAllowedAmount = (trade: Trade, realBalance: number): number => {
        const assetRisk = 0.05; // 5% margin requirement
        const buffer = 5; // $5 buffer
        const requiredMargin = (trade.amount * assetRisk) + buffer;

        if (settings.riskManagement === 'fixed' && settings.fixedRiskPercentage) {
            return Math.min(
                (realBalance * settings.fixedRiskPercentage) / 100,
                realBalance - requiredMargin
            );
        }

        return Math.min(
            trade.amount,
            realBalance * 0.95, // Auto-scale to 95% of balance
            settings.maxTradeSize || Infinity
        );
    };

    // Enhanced trade monitoring with proper type safety
    useEffect(() => {
        if (!isReplicationEnabled || !demoAccount || !realAccount) return;

        const monitorTrades = async () => {
            try {
                const demoTrades = await api_base.api.getActiveTrades(demoAccount.loginid);
                
                for (const trade of demoTrades) {
                    // 1. Enhanced Liquidation Shield
                    const maxAllowedAmount = calculateMaxAllowedAmount(trade, realAccount.balance);
                    if (maxAllowedAmount <= 0) {
                        setMarginCheck({
                            status: 'error',
                            message: 'Insufficient margin or balance too low'
                        });
                        continue;
                    }

                    // 2. Enhanced Dynamic Scaling
                    const scaledAmount = Math.min(trade.amount, maxAllowedAmount);

                    // 3. Enhanced Loss Circuit Breaker
                    if (dailyLoss >= settings.dailyLossLimit) {
                        setCircuitBreaker({
                            status: 'error',
                            message: 'Daily loss limit reached. Replication paused.'
                        });
                        setIsReplicationEnabled(false);
                        return;
                    }

                    if (realAccount.balance < settings.minBalanceThreshold) {
                        setCircuitBreaker({
                            status: 'error',
                            message: 'Balance below minimum threshold. System shutting down.'
                        });
                        setIsReplicationEnabled(false);
                        return;
                    }

                    // 4. Enhanced User Control Panel
                    if (settings.askBeforeExecuting) {
                        setConfirmationTrade({
                            demoAmount: trade.amount,
                            realAmount: scaledAmount,
                            type: trade.type,
                            symbol: trade.symbol,
                            riskPercentage: (scaledAmount / realAccount.balance) * 100
                        });
                        return; // Wait for user confirmation
                    }

                    // Execute the trade
                    await executeRealTrade(trade, scaledAmount);
                }
            } catch (error) {
                console.error('Error monitoring trades:', error);
                setMarginCheck({
                    status: 'error',
                    message: 'Error monitoring trades'
                });
            }
        };

        const interval = setInterval(monitorTrades, 1000);
        return () => clearInterval(interval);
    }, [isReplicationEnabled, demoAccount, realAccount, settings, dailyLoss, api_base.api]);

    // Enhanced trade execution with proper error handling
    const executeRealTrade = async (trade: Trade, scaledAmount: number): Promise<TradeResult> => {
        try {
            const result = await api_base.api.placeTrade({
                ...trade,
                amount: scaledAmount,
                loginid: realAccount?.loginid
            });

            if (result.error) {
                throw new Error(result.error.message);
            }

            // Update daily loss
            if (result.profit < 0) {
                setDailyLoss(prev => prev + Math.abs(result.profit));
            }

            setMarginCheck({
                status: 'success',
                message: 'Trade executed successfully'
            });

            return {
                success: true,
                profit: result.profit,
                tradeId: result.tradeId
            };
        } catch (error) {
            console.error('Error executing trade:', error);
            setMarginCheck({
                status: 'error',
                message: 'Trade execution failed'
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    };

    // Enhanced settings management
    const handleSettingsChange = (key: keyof ReplicationSettings, value: any) => {
        setSettings(prev => {
            const newSettings = { ...prev, [key]: value };
            
            // Validate settings
            if (key === 'fixedRiskPercentage' && value > 100) {
                newSettings.fixedRiskPercentage = 100;
            }
            if (key === 'dailyLossLimit' && value > 100) {
                newSettings.dailyLossLimit = 100;
            }
            if (key === 'minBalanceThreshold' && value < 10) {
                newSettings.minBalanceThreshold = 10;
            }
            
            return newSettings;
        });
    };

    // Trade confirmation dialog
    const handleTradeConfirmation = async (confirmed: boolean) => {
        if (!confirmed || !confirmationTrade) {
            setConfirmationTrade(null);
            return;
        }

        const trade = await api_base.api.getTradeById(confirmationTrade.demoAmount);
        if (trade) {
            await executeRealTrade(trade, confirmationTrade.realAmount);
        }
        setConfirmationTrade(null);
    };

    // Show loading state
    if (isLoading) {
        return (
            <div className="trade-replication-container">
                <div className="loading-state">
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="trade-replication-container">
            <div className="trade-replication-header">
                <h1 className="trade-replication-title">Trade Replication</h1>
                {isAuthorizing ? (
                    <div className="loading-state">
                        <p>Loading account information...</p>
                    </div>
                ) : client?.is_logged_in ? (
                    <div className="account-section">
                        <ToggleSwitch
                            isEnabled={isReplicationEnabled}
                            onToggle={handleToggleChange}
                            label="Enable Replication"
                            disabled={!isAuthorized || !hasVirtualAccount || !hasRealAccount}
                        />
                        {error && <div className="error-message">{error}</div>}
                        {!hasVirtualAccount && (
                            <div className="warning-message">
                                <p>You need a Demo account to use Trade Replication.</p>
                            </div>
                        )}
                        {!hasRealAccount && (
                            <div className="warning-message">
                                <p>You need a Real account to use Trade Replication.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="not-logged-in-message">
                        <p>You need to log in to use the Trade Replication feature.</p>
                    </div>
                )}
            </div>
            
            {client?.is_logged_in && (
                <div className="trade-replication-content">
                    <div className="account-info">
                        <div className="account-balance">
                            <h3>Demo Account Balance</h3>
                            <p>{formatNumber(demoBalance)} {demoAccount?.currency}</p>
                        </div>
                        <div className="account-balance">
                            <h3>Real Account Balance</h3>
                            <p>{formatNumber(realBalance)} {realAccount?.currency}</p>
                        </div>
                    </div>
                    
                    <div className="profit-loss">
                        <div className="profit-item">
                            <h3>Demo Account P/L</h3>
                            <p className={demoProfit >= 0 ? 'profit' : 'loss'}>
                                {formatNumber(demoProfit)} {demoAccount?.currency}
                            </p>
                        </div>
                        <div className="profit-item">
                            <h3>Real Account P/L</h3>
                            <p className={realProfit >= 0 ? 'profit' : 'loss'}>
                                {formatNumber(realProfit)} {realAccount?.currency}
                            </p>
                        </div>
                    </div>
                    
                    <div className="system-status">
                        <div className={`status-item ${marginCheck.status}`}>
                            <h3>Margin Check</h3>
                            <p>{marginCheck.message}</p>
                        </div>
                        <div className={`status-item ${circuitBreaker.status}`}>
                            <h3>Circuit Breaker</h3>
                            <p>{circuitBreaker.message}</p>
                        </div>
                    </div>
                    
                    {isReplicationEnabled && (
                        <div className="active-trades">
                            <h3>Active Trades</h3>
                            {activeTrades.length > 0 ? (
                                <div className="trades-list">
                                    {activeTrades.map(trade => (
                                        <div key={trade.demoTradeId} className="trade-item">
                                            <div className="trade-info">
                                                <p>Type: {trade.type}</p>
                                                <p>Amount: {formatNumber(trade.amount)}</p>
                                                <p>Demo P/L: {formatNumber(trade.demoProfit)}</p>
                                                <p>Real P/L: {formatNumber(trade.realProfit)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p>No active trades</p>
                            )}
                        </div>
                    )}
                </div>
            )}
            
            {confirmationTrade && (
                <CustomModal
                    isOpen={true}
                    onClose={() => setConfirmationTrade(null)}
                >
                    <div className="confirmation-dialog">
                        <p>Demo Amount: {formatNumber(confirmationTrade.demoAmount)}</p>
                        <p>Real Amount: {formatNumber(confirmationTrade.realAmount)}</p>
                        <p>Type: {confirmationTrade.type}</p>
                        <p>Symbol: {confirmationTrade.symbol}</p>
                        <p>Risk: {formatNumber(confirmationTrade.riskPercentage)}%</p>
                        <div className="confirmation-actions">
                            <Button
                    
                                onClick={() => handleTradeConfirmation(true)}
                            >
                                Confirm
                            </Button>
                            <Button
                                onClick={() => handleTradeConfirmation(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </CustomModal>
            )}
        </div>
    );
});

// Helper function to extract contract parameters
const extractContractParameters = async (trade: TradeTransaction, api: any): Promise<ContractDetailsResult> => {
    try {
        // First, get the contract details from the transaction
        const contractResponse = await api.contractInfo({
            contract_id: trade.transaction_id,
            contract_type: trade.contract_type
        });
        
        if (contractResponse.error) {
            return {
                success: false,
                error: contractResponse.error.message
            };
        }

        const contractInfo = contractResponse.contract_info;
        const parameters: ContractParameters = {
            contract_type: contractInfo.contract_type,
            symbol: contractInfo.underlying,
            duration: contractInfo.duration,
            duration_unit: contractInfo.duration_unit,
            basis: contractInfo.basis,
            currency: contractInfo.currency,
            barrier: contractInfo.barrier,
            second_barrier: contractInfo.second_barrier,
            limit_order: {
                take_profit: contractInfo.take_profit,
                stop_loss: contractInfo.stop_loss
            },
            last_digit_prediction: contractInfo.last_digit_prediction,
            asian_type: contractInfo.asian_type,
            barrier_range: contractInfo.barrier_range,
            tick_count: contractInfo.tick_count
        };

        return {
            success: true,
            parameters
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'An unexpected error occurred'
        };
    }
};

export default TradeReplication;
