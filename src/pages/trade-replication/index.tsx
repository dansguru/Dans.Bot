import React, { useState, useEffect, useCallback, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { localize } from '@deriv-com/translations';
import { Button, Modal } from '@deriv-com/ui';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import ToggleSwitch from './components/toggle-switch';
import './trade-replication.scss';
import { generateOAuthURL } from '@/components/shared';
import CustomModal from './components/custom-modal';
import { api_base } from '@/external/bot-skeleton';

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

// Trade Types
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

const TradeReplication = observer(() => {
    const { client } = useStore() as unknown as StoreType;
    const { isAuthorized} = useApiBase();
    const [isReplicationEnabled, setIsReplicationEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasVirtualAccount, setHasVirtualAccount] = useState(false);
    const [hasRealAccount, setHasRealAccount] = useState(false);
    const [demoAccount, setDemoAccount] = useState<TAccount | null>(null);
    const [realAccount, setRealAccount] = useState<TAccount | null>(null);
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
    const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);

    const tradeMonitoringInterval = useRef<NodeJS.Timeout | null>(null);

    // Initialize authorization and accounts
    const initialize = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!client?.is_logged_in) {
                setError('Please log in first');
                return;
            }

            // Get account list
            const accountsResponse = await api_base.api?.send({
                account_list: 1
            });

            if (accountsResponse?.error) {
                setError(accountsResponse.error.message);
                return;
            }

            const accounts = accountsResponse?.account_list || [];
            const demo = accounts.find((a: TAccount) => a.is_virtual);
            const real = accounts.find((a: TAccount) => !a.is_virtual);

            setDemoAccount(demo || null);
            setRealAccount(real || null);
            setHasVirtualAccount(!!demo);
            setHasRealAccount(!!real);

            if (!demo) setError('No demo account found');
            if (!real) setError('No real account found');

            // Update balances
            await updateBalances();

        } catch (err) {
            setError('Initialization failed');
            console.error('Initialization error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [client?.is_logged_in]);

    // Update balances
    const updateBalances = useCallback(async () => {
        try {
            if (!api_base.api?.isAuthorized || !demoAccount || !realAccount) return;

            // Get demo balance
            const demoRes = await api_base.api.send({
                balance: 1,
                account: demoAccount.loginid
            });

            // Get real balance
            const realRes = await api_base.api.send({
                balance: 1,
                account: realAccount.loginid
            });

            if (!demoRes.error) setDemoBalance(demoRes.balance);
            if (!realRes.error) setRealBalance(realRes.balance);

        } catch (err) {
            console.error('Balance update error:', err);
        }
    }, [demoAccount, realAccount]);

    // Start/stop trade monitoring
    const startTradeMonitoring = useCallback(() => {
        if (!isAuthorized || !api_base.api) return;

        // Clear existing interval
        if (tradeMonitoringInterval.current) {
            clearInterval(tradeMonitoringInterval.current);
        }

        const interval = setInterval(async () => {
            try {
                // Get active trades
                const tradesRes = await api_base.api.send({
                    active_symbols: 'brief',
                    product_type: 'basic'
                });

                if (tradesRes.error) {
                    console.error('Trade fetch error:', tradesRes.error);
                    return;
                }

                // Process new trades
                const newTrades = tradesRes.active_symbols || [];
                for (const trade of newTrades) {
                    await processTrade(trade);
                }

            } catch (err) {
                console.error('Monitoring error:', err);
            }
        }, 5000);

        tradeMonitoringInterval.current = interval;
        return () => clearInterval(interval);
    }, [isAuthorized, demoAccount, realAccount, settings]);

    // Process individual trade
    const processTrade = async (trade: Trade) => {
        if (!demoAccount || !realAccount) return;

        // Calculate maximum allowed amount
        const maxAllowedAmount = calculateMaxAllowedAmount(trade, realAccount.balance);
        
        if (maxAllowedAmount <= 0) {
            setMarginCheck({
                status: 'error',
                message: 'Insufficient margin or balance too low'
            });
            return;
        }

        // Apply scaling
        const scaledAmount = Math.min(trade.amount, maxAllowedAmount);

        // Check circuit breakers
        if (dailyLoss >= settings.dailyLossLimit) {
            setCircuitBreaker({
                status: 'error',
                message: 'Daily loss limit reached'
            });
            setIsReplicationEnabled(false);
            return;
        }

        if (realAccount.balance < settings.minBalanceThreshold) {
            setCircuitBreaker({
                status: 'error',
                message: 'Balance below minimum threshold'
            });
            setIsReplicationEnabled(false);
            return;
        }

        // Handle user confirmation
        if (settings.askBeforeExecuting) {
            setConfirmationTrade({
                demoAmount: trade.amount,
                realAmount: scaledAmount,
                type: trade.type,
                symbol: trade.symbol,
                riskPercentage: (scaledAmount / realAccount.balance) * 100
            });
            return;
        }

        // Execute trade
        await executeRealTrade(trade, scaledAmount);
    };

    // Execute trade in real account
    const executeRealTrade = async (trade: Trade, amount: number): Promise<TradeResult> => {
        try {
            const result = await api_base.api?.send({
                buy: trade.id,
                price: amount,
                parameters: trade.parameters
            });

            if (result?.error) {
                throw new Error(result.error.message);
            }

            // Update daily loss if trade was unprofitable
            if (result?.profit && result.profit < 0) {
                setDailyLoss(prev => prev + Math.abs(result.profit));
            }

            // Add to active trades
            setActiveTrades(prev => [...prev, {
                demoTradeId: trade.id,
                realTradeId: result?.transaction_id || '',
                amount: amount,
                type: trade.type,
                timestamp: new Date().toISOString(),
                demoProfit: 0,
                realProfit: result?.profit || 0
            }]);

            setMarginCheck({
                status: 'success',
                message: 'Trade executed successfully'
            });

            return { success: true, profit: result?.profit, tradeId: result?.transaction_id };

        } catch (err) {
            console.error('Trade execution error:', err);
            setMarginCheck({
                status: 'error',
                message: 'Trade execution failed'
            });
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Unknown error'
            };
        }
    };

    // Calculate maximum allowed trade amount
    const calculateMaxAllowedAmount = (trade: Trade, realBalance: number): number => {
        const assetRisk = 0.05; // 5% margin requirement
        const buffer = 5; // $5 buffer
        const requiredMargin = (trade.amount * assetRisk) + buffer;

        if (settings.riskManagement === 'fixed' && settings.fixedRiskPercentage) {
            return Math.min(
                (realBalance * settings.fixedRiskPercentage) / 100,
                realBalance - requiredMargin,
                settings.maxTradeSize || Infinity
            );
        }

        return Math.min(
            trade.amount,
            realBalance * 0.95, // Auto-scale to 95% of balance
            settings.maxTradeSize || Infinity
        );
    };

    // Handle settings changes
    const handleSettingsChange = (key: keyof ReplicationSettings, value: any) => {
        setSettings(prev => {
            const newSettings = { ...prev, [key]: value };
            
            // Validate settings
            if (key === 'fixedRiskPercentage') {
                newSettings.fixedRiskPercentage = Math.min(100, Math.max(1, value));
            }
            if (key === 'dailyLossLimit') {
                newSettings.dailyLossLimit = Math.min(100, Math.max(1, value));
            }
            if (key === 'minBalanceThreshold') {
                newSettings.minBalanceThreshold = Math.max(10, value);
            }
            
            return newSettings;
        });
    };

    // Handle trade confirmation
    const handleTradeConfirmation = async (confirmed: boolean) => {
        if (!confirmed || !confirmationTrade) {
            setConfirmationTrade(null);
            return;
        }

        // In a real implementation, you would fetch the actual trade details here
        const trade: Trade = {
            id: 'demo_' + Date.now(),
            amount: confirmationTrade.demoAmount,
            type: confirmationTrade.type,
            symbol: confirmationTrade.symbol,
            contract_type: 'CALL', // Example
            parameters: {} // Would contain actual trade parameters
        };

        await executeRealTrade(trade, confirmationTrade.realAmount);
        setConfirmationTrade(null);
    };

    // Format numbers
    const formatNumber = (num: number) => {
        return num.toFixed(2);
    };

    // Initialize on mount
    useEffect(() => {
        initialize();
    }, [initialize]);

    // Handle replication toggle
    useEffect(() => {
        if (isReplicationEnabled) {
            startTradeMonitoring();
        } else if (tradeMonitoringInterval.current) {
            clearInterval(tradeMonitoringInterval.current);
            tradeMonitoringInterval.current = null;
        }
    }, [isReplicationEnabled, startTradeMonitoring]);

    // Update balances periodically
    useEffect(() => {
        const interval = setInterval(updateBalances, 30000);
        return () => clearInterval(interval);
    }, [updateBalances]);

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
                <h1>{localize('Trade Replication')}</h1>
                
                {client?.is_logged_in ? (
                    <div className="account-section">
                        <ToggleSwitch
                            isEnabled={isReplicationEnabled}
                            onToggle={setIsReplicationEnabled}
                            label={localize('Enable Replication')}
                            disabled={!hasVirtualAccount || !hasRealAccount}
                        />
                        
                        {hasVirtualAccount && demoAccount && (
                            <div className="account-info">
                                <span>{localize('Demo')}: {demoAccount.loginid}</span>
                                <span>{localize('Balance')}: {formatNumber(demoBalance)} {demoAccount.currency}</span>
                            </div>
                        )}
                        
                        {hasRealAccount && realAccount && (
                            <div className="account-info">
                                <span>{localize('Real')}: {realAccount.loginid}</span>
                                <span>{localize('Balance')}: {formatNumber(realBalance)} {realAccount.currency}</span>
                            </div>
                        )}
                        
                        {error && <div className="error-message">{error}</div>}
                    </div>
                ) : (
                    <Button onClick={() => window.location.href = generateOAuthURL()}>
                        {localize('Login to Deriv')}
                    </Button>
                )}
            </div>
            
            {client?.is_logged_in && (
                <div className="trade-replication-content">
                    <div className="profit-loss-section">
                        <div className="profit-item">
                            <h3>{localize('Demo P/L')}</h3>
                            <p className={demoProfit >= 0 ? 'profit' : 'loss'}>
                                {formatNumber(demoProfit)} {demoAccount?.currency}
                            </p>
                        </div>
                        <div className="profit-item">
                            <h3>{localize('Real P/L')}</h3>
                            <p className={realProfit >= 0 ? 'profit' : 'loss'}>
                                {formatNumber(realProfit)} {realAccount?.currency}
                            </p>
                        </div>
                    </div>
                    
                    <div className="status-section">
                        <div className={`status-item ${marginCheck.status}`}>
                            <h3>{localize('Margin Check')}</h3>
                            <p>{marginCheck.message}</p>
                        </div>
                        <div className={`status-item ${circuitBreaker.status}`}>
                            <h3>{localize('Circuit Breaker')}</h3>
                            <p>{circuitBreaker.message}</p>
                        </div>
                    </div>
                    
                    {isReplicationEnabled && (
                        <div className="active-trades-section">
                            <h3>{localize('Active Trades')}</h3>
                            {activeTrades.length > 0 ? (
                                <div className="trades-list">
                                    {activeTrades.map(trade => (
                                        <div key={trade.demoTradeId} className="trade-item">
                                            <div className="trade-info">
                                                <p>{localize('Type')}: {trade.type}</p>
                                                <p>{localize('Amount')}: {formatNumber(trade.amount)}</p>
                                                <p>{localize('Demo P/L')}: {formatNumber(trade.demoProfit)}</p>
                                                <p>{localize('Real P/L')}: {formatNumber(trade.realProfit)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p>{localize('No active trades')}</p>
                            )}
                        </div>
                    )}
                    
                    <div className="settings-section">
                        <h3>{localize('Settings')}</h3>
                        <div className="settings-grid">
                            <div className="setting-item">
                                <label>{localize('Risk Management')}</label>
                                <select
                                    value={settings.riskManagement}
                                    onChange={(e) => handleSettingsChange('riskManagement', e.target.value)}
                                >
                                    <option value="auto">{localize('Auto-Scale')}</option>
                                    <option value="fixed">{localize('Fixed %')}</option>
                                </select>
                            </div>
                            
                            {settings.riskManagement === 'fixed' && (
                                <div className="setting-item">
                                    <label>{localize('Risk Percentage')} (%)</label>
                                    <input
                                        type="number"
                                        value={settings.fixedRiskPercentage || 5}
                                        onChange={(e) => handleSettingsChange('fixedRiskPercentage', Number(e.target.value))}
                                        min="1"
                                        max="100"
                                    />
                                </div>
                            )}
                            
                            <div className="setting-item">
                                <label>{localize('Daily Loss Limit')} (%)</label>
                                <input
                                    type="number"
                                    value={settings.dailyLossLimit}
                                    onChange={(e) => handleSettingsChange('dailyLossLimit', Number(e.target.value))}
                                    min="1"
                                    max="100"
                                />
                            </div>
                            
                            <div className="setting-item">
                                <label>{localize('Min Balance Threshold')}</label>
                                <input
                                    type="number"
                                    value={settings.minBalanceThreshold}
                                    onChange={(e) => handleSettingsChange('minBalanceThreshold', Number(e.target.value))}
                                    min="10"
                                />
                            </div>
                            
                            <div className="setting-item">
                                <label>{localize('Ask Before Executing')}</label>
                                <ToggleSwitch
                                    isEnabled={settings.askBeforeExecuting}
                                    onToggle={(val) => handleSettingsChange('askBeforeExecuting', val)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {confirmationTrade && (
                <CustomModal
                    isOpen={true}
                    onClose={() => setConfirmationTrade(null)}
                    title={localize('Confirm Trade')}
                >
                    <div className="confirmation-dialog">
                        <div className="confirmation-row">
                            <span>{localize('Demo Amount')}:</span>
                            <strong>{formatNumber(confirmationTrade.demoAmount)}</strong>
                        </div>
                        <div className="confirmation-row">
                            <span>{localize('Real Amount')}:</span>
                            <strong>{formatNumber(confirmationTrade.realAmount)}</strong>
                        </div>
                        <div className="confirmation-row">
                            <span>{localize('Type')}:</span>
                            <strong>{confirmationTrade.type}</strong>
                        </div>
                        <div className="confirmation-row">
                            <span>{localize('Symbol')}:</span>
                            <strong>{confirmationTrade.symbol}</strong>
                        </div>
                        <div className="confirmation-row">
                            <span>{localize('Risk')}:</span>
                            <strong>{formatNumber(confirmationTrade.riskPercentage)}%</strong>
                        </div>
                        
                        <div className="confirmation-actions">
                            <Button
                                onClick={() => handleTradeConfirmation(true)}
                               
                            >
                                {localize('Confirm')}
                            </Button>
                            <Button
                                onClick={() => handleTradeConfirmation(false)}
                            >
                                {localize('Cancel')}
                            </Button>
                        </div>
                    </div>
                </CustomModal>
            )}
        </div>
    );
});

export default TradeReplication;