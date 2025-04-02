import React, { useState, useEffect, useCallback, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { localize } from '@deriv-com/translations';
import { ToggleSwitch, Button, Dialog, Modal } from '@deriv-com/ui';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import './trade-replication.scss';

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

interface Account {
    loginid: string;
    token: string;
    currency: string;
    is_virtual: boolean;
}

const TradeReplication = observer(() => {
    const [isReplicationEnabled, setIsReplicationEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasVirtualAccount, setHasVirtualAccount] = useState(false);
    const [hasRealAccount, setHasRealAccount] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [showLoginDialog, setShowLoginDialog] = useState(false);
    const [demoAccount, setDemoAccount] = useState<Account | null>(null);
    const [realAccount, setRealAccount] = useState<Account | null>(null);
    const [accountList, setAccountList] = useState<any[]>([]);
    const [replicationHistory, setReplicationHistory] = useState<ReplicationHistoryItem[]>([]);
    const [ws, setWs] = useState<any>(null);
    const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
    const [demoBalance, setDemoBalance] = useState(0);
    const [realBalance, setRealBalance] = useState(0);
    const [demoProfit, setDemoProfit] = useState(0);
    const [realProfit, setRealProfit] = useState(0);

    // API & Auth state
    const { core } = useStore();
    const { client } = core || {};

    // Refs for API calls and intervals
    const tradeMonitoringInterval = useRef<NodeJS.Timeout | null>(null);
    const balanceUpdateInterval = useRef<NodeJS.Timeout | null>(null);

    // Check if user has both demo and real accounts
    useEffect(() => {
        if (isAuthorized && accountList?.length) {
            const virtualAccount = accountList.find(account => account.is_virtual);
            const nonVirtualAccount = accountList.find(account => !account.is_virtual);
            
            setHasVirtualAccount(!!virtualAccount);
            setHasRealAccount(!!nonVirtualAccount);
            
            if (virtualAccount) {
                setDemoAccount({
                    loginid: virtualAccount.loginid,
                    token: '', 
                    currency: virtualAccount.currency,
                    is_virtual: true
                });
            }
            
            if (nonVirtualAccount) {
                setRealAccount({
                    loginid: nonVirtualAccount.loginid,
                    token: '', 
                    currency: nonVirtualAccount.currency,
                    is_virtual: false
                });
            }
            
            setIsLoading(false);
        } else if (!isAuthorized) {
            setIsLoading(false);
        }
    }, [isAuthorized, accountList]);

    // Fetch account balances
    const fetchBalances = useCallback(async () => {
        if (!isAuthorized || !ws || !demoAccount?.loginid || !realAccount?.loginid) return;
        
        try {
            // Get all account balances
            const balanceResponse = await ws.authorized.balance();
            
            if (balanceResponse.error) {
                console.error('Balance API error:', balanceResponse.error);
                return;
            }
            
            const accounts = balanceResponse.balance?.accounts || {};
            
            // Update demo account balance
            if (accounts[demoAccount.loginid]) {
                setDemoBalance(accounts[demoAccount.loginid].balance || 0);
            }
            
            // Update real account balance
            if (accounts[realAccount.loginid]) {
                setRealBalance(accounts[realAccount.loginid].balance || 0);
            }
        } catch (error) {
            console.error('Error fetching balances:', error);
        }
    }, [isAuthorized, ws, demoAccount?.loginid, realAccount?.loginid]);

    // Start fetching balances when component mounts and accounts are available
    useEffect(() => {
        if (isAuthorized && demoAccount && realAccount) {
            fetchBalances();
            
            // Set up interval to update balances regularly
            balanceUpdateInterval.current = setInterval(fetchBalances, 10000); // Every 10 seconds
            
            return () => {
                if (balanceUpdateInterval.current) {
                    clearInterval(balanceUpdateInterval.current);
                }
            };
        }
    }, [isAuthorized, demoAccount, realAccount, fetchBalances]);

    // Monitor trades in demo account and replicate to real account
    const startTradeMonitoring = useCallback(() => {
        if (!isAuthorized || !ws || !demoAccount?.loginid || !realAccount?.loginid) return;
        
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
                await ws.authorized.authorize(demoAccount.token);
                
                // Fetch recent transactions
                const transactionsResponse = await ws.authorized.statement({
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
                    // Check if we have sufficient balance in real account
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
                    await ws.authorized.authorize(realAccount.token);
                    
                    // Extract contract parameters from the transaction data
                    const contractDetails = await extractContractParameters(trade, ws);
                    
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
                    const buyResponse = await ws.authorized.buy({
                        buy: contractDetails.contractId,
                        price: trade.amount,
                        parameters: contractDetails.parameters
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
                await ws.authorized.authorize(demoAccount.token);
                
            } catch (error) {
                console.error('Error in trade monitoring:', error);
            }
        }, 5000); // Check every 5 seconds
        
        return () => {
            if (tradeMonitoringInterval.current) {
                clearInterval(tradeMonitoringInterval.current);
            }
        };
    }, [isAuthorized, ws, demoAccount, realAccount, realBalance]);

    // Update profit/loss for active trades
    const updateProfitLoss = useCallback(async () => {
        if (!isAuthorized || !ws || !activeTrades.length) return;
        
        try {
            // Get demo account profit/loss
            await ws.authorized.authorize(demoAccount?.token || '');
            const demoPLResponse = await ws.authorized.profitTable({
                profit_table: 1,
                description: 1,
                limit: 50
            });
            
            // Get real account profit/loss
            await ws.authorized.authorize(realAccount?.token || '');
            const realPLResponse = await ws.authorized.profitTable({
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
    }, [isAuthorized, ws, demoAccount, realAccount, activeTrades]);

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

    // Handle toggle change
    const handleToggleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const enabled = event.target.checked;
        
        if (!isAuthorized) {
            setShowLoginDialog(true);
            return;
        }
        
        if (enabled && (!hasVirtualAccount || !hasRealAccount)) {
            setError('You need both a Demo account and a Real account to use Trade Replication.');
            return;
        }
        
        setIsReplicationEnabled(enabled);
        
        if (!enabled) {
            console.log('Trade replication disabled. Existing trades remain active.');
        } else {
            console.log('Trade replication enabled. Starting trade monitoring...');
        }
    };

    // Go to login page
    const handleLogin = () => {
        setShowLoginDialog(true);
    };

    const formatNumber = (num: number) => {
        return num.toFixed(2);
    };

    // Show loading state
    if (isLoading) {
        return (
            <div className="trade-replication-container">
                <div className="trade-replication-loading">
                    <div className="futuristic-dots-container">
                        <div className="futuristic-dot"></div>
                        <div className="futuristic-dot"></div>
                        <div className="futuristic-dot"></div>
                        <div className="futuristic-dot"></div>
                        <div className="futuristic-dot"></div>
                    </div>
                    <div className="load-message">Loading Trade Replication...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="trade-replication-container">
            <div className="trade-replication-header">
                <h2 className="trade-replication-title">Trade Replication</h2>
                <div className="trade-replication-toggle">
                    <span className="toggle-label">{isReplicationEnabled ? 'Active' : 'Inactive'}</span>
                    <ToggleSwitch
                        value={isReplicationEnabled}
                        onChange={handleToggleChange}
                    />
                </div>
            </div>
            
            {!isAuthorized ? (
                <div className="not-logged-in-message">
                    <p>You need to log in to use the Trade Replication feature.</p>
                    <Button
                        onClick={handleLogin}
                        type="button"
                        primary={true}
                    >
                        {localize('Log in')}
                    </Button>
                </div>
            ) : (
                <>
                    {error && (
                        <div className="validation-error">
                            <p>⚠️ {error}</p>
                        </div>
                    )}
                    {(!hasVirtualAccount || !hasRealAccount) ? (
                        <div className="account-requirement-message">
                            <p>Trade Replication requires both a Demo account and a Real account.</p>
                            {!hasVirtualAccount && (
                                <p>You need to create a Demo account to use this feature.</p>
                            )}
                            {!hasRealAccount && (
                                <p>You need to create a Real Money account to use this feature.</p>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="account-balances-container">
                                <div className="account-balance-box demo">
                                    <h3>Demo Account ({demoAccount?.loginid})</h3>
                                    <div className="balance-amount">{demoAccount?.currency} {formatNumber(demoBalance)}</div>
                                    <div className={`profit-loss ${demoProfit >= 0 ? 'profit' : 'loss'}`}>
                                        {demoProfit >= 0 ? '+' : ''}{formatNumber(demoProfit)} {demoAccount?.currency}
                                    </div>
                                </div>
                                
                                <div className="replication-arrow">
                                    <span className={`arrow ${isReplicationEnabled ? 'active' : ''}`}>➜</span>
                                </div>
                                
                                <div className="account-balance-box real">
                                    <h3>Real Account ({realAccount?.loginid})</h3>
                                    <div className="balance-amount">{realAccount?.currency} {formatNumber(realBalance)}</div>
                                    <div className={`profit-loss ${realProfit >= 0 ? 'profit' : 'loss'}`}>
                                        {realProfit >= 0 ? '+' : ''}{formatNumber(realProfit)} {realAccount?.currency}
                                    </div>
                                </div>
                            </div>
                            
                            {activeTrades.length > 0 && (
                                <div className="active-trades-container">
                                    <h3>Active Replicated Trades</h3>
                                    <table className="trades-table">
                                        <thead>
                                            <tr>
                                                <th>Time</th>
                                                <th>Type</th>
                                                <th>Amount</th>
                                                <th>Demo P/L</th>
                                                <th>Real P/L</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeTrades.map(trade => (
                                                <tr key={trade.realTradeId}>
                                                    <td>{new Date(trade.timestamp).toLocaleTimeString()}</td>
                                                    <td>{trade.type}</td>
                                                    <td>{formatNumber(trade.amount)} {realAccount?.currency}</td>
                                                    <td className={trade.demoProfit >= 0 ? 'profit' : 'loss'}>
                                                        {trade.demoProfit >= 0 ? '+' : ''}{formatNumber(trade.demoProfit)}
                                                    </td>
                                                    <td className={trade.realProfit >= 0 ? 'profit' : 'loss'}>
                                                        {trade.realProfit >= 0 ? '+' : ''}{formatNumber(trade.realProfit)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
            
            <div className="trade-replication-explanation">
                <h3>How Trade Replication Works</h3>
                <div className="explanation-steps">
                    <div className="step">
                        <div className="step-number">1</div>
                        <div className="step-content">
                            <h4>Toggle-based Activation</h4>
                            <p>When enabled, the system monitors your Demo account and replicates trades to your Real account.</p>
                        </div>
                    </div>
                    
                    <div className="step">
                        <div className="step-number">2</div>
                        <div className="step-content">
                            <h4>Trade Monitoring & Validation</h4>
                            <p>The system continuously tracks trades in your Demo account, including amounts, types, and conditions.</p>
                        </div>
                    </div>
                    
                    <div className="step">
                        <div className="step-number">3</div>
                        <div className="step-content">
                            <h4>Real Account Verification</h4>
                            <p>Before executing, the system verifies your Real account has sufficient funds for the trade.</p>
                        </div>
                    </div>
                    
                    <div className="step">
                        <div className="step-number">4</div>
                        <div className="step-content">
                            <h4>Risk Management</h4>
                            <p>Trades are only executed if your Real account balance can support them - protecting you from insufficient funds.</p>
                        </div>
                    </div>
                    
                    <div className="step">
                        <div className="step-number">5</div>
                        <div className="step-content">
                            <h4>Real-Time Tracking</h4>
                            <p>Monitor profit/loss in both accounts simultaneously to compare performance.</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="replication-key-benefits">
                <h3>Key Benefits</h3>
                <ul>
                    <li>✅ User-Controlled Mirroring - No forced replication unless you enable it</li>
                    <li>✅ Risk Management - Prevents execution if your real balance is too low</li>
                    <li>✅ Real-time Tracking - Shows profit/loss data in sync with Demo trades</li>
                    <li>✅ Efficient API Usage - Optimized to prevent API rate limits</li>
                    <li>✅ Emergency Stop - Disable mirroring at any time</li>
                </ul>
            </div>
            
            {/* Login Dialog */}
            {showLoginDialog && (
                <Dialog
                    is_visible={showLoginDialog}
                    title={localize('Login Required')}
                    confirm_button_text={localize('Log in')}
                    cancel_button_text={localize('Cancel')}
                    onConfirm={handleLogin}
                    onCancel={() => setShowLoginDialog(false)}
                >
                    <p>{localize('Sorry, login first.')}</p>
                    <p>{localize('You need to be logged in to use the Trade Replication feature.')}</p>
                </Dialog>
            )}
        </div>
    );
});

// Helper function to extract contract parameters
const extractContractParameters = async (trade: TradeTransaction, ws: any): Promise<ContractDetailsResult> => {
    try {
        // First, get the contract details from the transaction
        const contractResponse = await ws.authorized.contractInfo({
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
