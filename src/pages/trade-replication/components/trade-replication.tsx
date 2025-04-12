import React, { useState, useEffect, useCallback } from 'react';
import ToggleSwitch from './toggle-switch';
import CustomModal from './custom-modal';
import './trade-replication.scss';
import { observer } from 'mobx-react-lite';
import { observer as globalObserver } from '@/external/bot-skeleton/utils/observer';
import { LogTypes } from '@/external/bot-skeleton';
import { showNotification } from '@/utils/notification';

// API keys for demo and real accounts
const DEMO_API_KEY = '6N8BoA2nOGoBraP';
const REAL_API_KEY = 'xtwkGoyT9q15LL4';

interface TradeReplicationProps {
  demoBalance: number;
  realBalance: number;
  isActiveAccountDemo: boolean;
  onReplicationChange: (isEnabled: boolean, newBalance?: number) => void;
}

enum LogLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success'
}

interface LogEntry {
  timestamp: string;
  message: string;
  level: LogLevel;
}

export const TradeReplication: React.FC<TradeReplicationProps> = observer(({
  demoBalance,
  realBalance,
  isActiveAccountDemo,
  onReplicationChange,
}) => {
  // We're not using these store values yet, but will need them for API integration
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const { run_panel, transactions, client } = useStore();
  
  const [isReplicationEnabled, setIsReplicationEnabled] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [scalingMode, setScalingMode] = useState<'auto' | 'fixed'>('auto');
  const [riskPercentage, setRiskPercentage] = useState(2);
  const [minBalanceThreshold, setMinBalanceThreshold] = useState(1);
  const [askBeforeExecuting, setAskBeforeExecuting] = useState(false);
  const [maxTradeSize, setMaxTradeSize] = useState(200);
  const [activeAccountType, setActiveAccountType] = useState<'demo' | 'real'>(isActiveAccountDemo ? 'demo' : 'real');
  const [assetRisk, setAssetRisk] = useState(5);
  const [marginBuffer, setMarginBuffer] = useState(5);
  const [pendingTrades, setPendingTrades] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [demoTrades, setDemoTrades] = useState<any[]>([]);
  const [newRealBalance, setNewRealBalance] = useState(realBalance);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [trades, setTrades] = useState<any[]>([]); // Track all trades
  const [profitLoss, setProfitLoss] = useState(0); // Track total P&L
  const [lastTradePnl, setLastTradePnl] = useState(0); // Track last trade P&L

  const MIN_TRADE_SIZE = 1; // Minimum trade size in dollars

  // Update active account type when isActiveAccountDemo changes
  useEffect(() => {
    setActiveAccountType(isActiveAccountDemo ? 'demo' : 'real');
  }, [isActiveAccountDemo]);

  useEffect(() => {
    // Check real account balance when it changes
    if (realBalance <= 0) {
      setSnackbarMessage('Real account has insufficient funds for trade replication');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
    }
  }, [realBalance]);

  // Register bot event listeners
  useEffect(() => {
    if (isReplicationEnabled) {
      // Store unsubscribe functions
      const unsubscribeFunctions: (() => void)[] = [];
      
      // Register event listeners and store unsubscribe functions
      const unsubscribeBotContract = globalObserver.register('bot.contract', (contract: any) => {
        if (!isReplicationEnabled) return;

        try {
          // Get trade size from contract
          const tradeSize = contract.trade_size || contract.stake;
          
          // Check if real account has sufficient balance
          const requiredMargin = calculateRequiredMargin(tradeSize);
          if (realBalance < requiredMargin) {
            addLog(LogLevel.WARNING, 'Insufficient real balance for trade replication');
            setSnackbarMessage(`Insufficient funds for trade replication. Required: $${requiredMargin.toFixed(2)}`);
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
          }

          // Store demo trade
          setDemoTrades(prev => [...prev, {
            ...contract,
            originalTradeSize: tradeSize,
            timestamp: new Date().toISOString(),
            requiredMargin
          }]);

          // Process trade for real account
          processDemoTrade(contract, tradeSize);

          // Add success notification
          setSnackbarMessage('Trade replicated successfully');
          setSnackbarSeverity('success');
          setSnackbarOpen(true);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          addLog(LogLevel.ERROR, `Failed to process demo trade: ${errorMessage}`);
          setSnackbarMessage(`Failed to replicate trade: ${errorMessage}`);
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
        }
      });
      
      if (typeof unsubscribeBotContract === 'function') {
        unsubscribeFunctions.push(unsubscribeBotContract);
      }

      return () => {
        // Call all unsubscribe functions
        unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
      };
    }
  }, [isReplicationEnabled, realBalance, askBeforeExecuting]);

  const processDemoTrade = (contract: any, tradeSize: number) => {
    try {
      // Calculate scaled trade size based on real account balance
      const scaledTradeSize = calculateScaledTradeSize(tradeSize);
      const requiredMargin = calculateRequiredMargin(scaledTradeSize);

      // Check if real account has sufficient balance
      if (realBalance < requiredMargin) {
        addLog(LogLevel.WARNING, 'Insufficient real balance for trade replication');
        setSnackbarMessage(`Insufficient funds for trade replication. Required: $${requiredMargin.toFixed(2)}`);
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
        return;
      }

      // Execute trade on real account
      executeTrade(contract, scaledTradeSize);

      // Update logs and notifications
      addLog(LogLevel.SUCCESS, `Trade replicated successfully: ${contract.underlying} - $${scaledTradeSize.toFixed(2)}`);
      setSnackbarMessage(`Trade replicated successfully: ${contract.underlying} - $${scaledTradeSize.toFixed(2)}`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addLog(LogLevel.ERROR, `Failed to process demo trade: ${errorMessage}`);
      setSnackbarMessage(`Failed to replicate trade: ${errorMessage}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const executeTrade = useCallback((contract: any, tradeSize: number) => {
    try {
      // Calculate required margin
      const requiredMargin = calculateRequiredMargin(tradeSize);
      
      // Check if we have enough balance
      if (realBalance < requiredMargin) {
        throw new Error(`Insufficient balance. Required margin: $${requiredMargin}, Available: $${realBalance}`);
      }

      // Execute the trade
      addLog(LogLevel.INFO, `Executing trade: ${contract.underlying} - $${tradeSize}`);
      showNotification(`Executing trade: ${contract.underlying} - $${tradeSize}`, 'info');
      
      // Update real balance after successful trade
      const newBalance = realBalance - tradeSize;
      onReplicationChange(false); // Temporarily disable replication during trade
      onReplicationChange(true, newBalance);  // Re-enable replication after trade
      setNewRealBalance(newBalance);
      
      addLog(LogLevel.SUCCESS, `Trade executed successfully: ${contract.underlying} - $${tradeSize}`);
      showNotification(`Trade executed successfully: ${contract.underlying} - $${tradeSize}`, 'success');

      // Simulate trade execution (in real implementation, this would be an API call)
      const trade = {
        ...contract,
        size: tradeSize,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };

      // Add trade to monitoring
      setTrades(prev => [...prev, trade]);

      // Simulate trade result (in real implementation, this would come from API)
      setTimeout(() => {
        // Simulate trade result (in real implementation, this would come from API)
        const result = {
          profit: Math.random() > 0.5 ? Math.random() * tradeSize * 0.05 : 0,
          loss: Math.random() > 0.5 ? Math.random() * tradeSize * 0.05 : 0
        };

        // Update trade with result
        const updatedTrades = trades.map(t => 
          t.timestamp === trade.timestamp ? { ...t, result } : t
        );
        setTrades(updatedTrades);

        // Monitor the trade
        monitorTrade({ ...trade, result });
      }, 2000); // Simulated delay
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addLog(LogLevel.ERROR, `Trade execution failed: ${errorMessage}`);
      showNotification('Trade execution failed', 'error');
    }
  }, [trades]);

  const monitorTrade = (trade: any) => {
    // Check if trade has a result
    if (trade.result) {
      const pnl = trade.result.profit || trade.result.loss;
      setLastTradePnl(pnl);
      setProfitLoss(prev => prev + pnl);

      // Show P&L notification
      setSnackbarMessage(
        pnl > 0 
          ? `Profit: $${pnl.toFixed(2)} from ${trade.underlying}` 
          : `Loss: $${Math.abs(pnl).toFixed(2)} from ${trade.underlying}`
      );
      setSnackbarSeverity(pnl > 0 ? 'success' : 'error');
      setSnackbarOpen(true);
    }
  };

  const addLog = (level: LogLevel, message: string) => {
    const logEntry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      message,
      level,
    };
    
    // Remove oldest log if we have too many
    if (logs.length >= 100) {
      setLogs(prevLogs => [...prevLogs.slice(1), logEntry]);
    } else {
      setLogs(prevLogs => [...prevLogs, logEntry]);
    }
  };

  const approvePendingTrade = (tradeIndex: number) => {
    const trade = pendingTrades[tradeIndex];
    if (trade) {
      // Execute the trade with the scaled size
      executeTrade(trade, trade.scaledTradeSize);
      
      // Remove the approved trade from pending list
      setPendingTrades(prev => prev.filter((_, index) => index !== tradeIndex));
    }
  };

  const handleReplicationToggle = (value: boolean) => {
    if (value) {
      // Only enable if demo account has available funds
      const availableDemoBalance = demoBalance - demoTrades.reduce((acc, trade) => acc + trade.originalTradeSize, 0);
      if (availableDemoBalance > 0) {
        setIsReplicationEnabled(true);
        onReplicationChange(true);
      } else {
        addLog(LogLevel.WARNING, 'Cannot enable replication: No available funds in demo account');
      }
    } else {
      setIsReplicationEnabled(false);
      onReplicationChange(false);
    }
  };

  const calculateRequiredMargin = (tradeSize: number) => {
    // Calculate margin with minimum trade size consideration
    const effectiveTradeSize = Math.max(tradeSize, MIN_TRADE_SIZE);
    return (effectiveTradeSize * assetRisk / 100) + marginBuffer;
  };

  const calculateScaledTradeSize = (tradeSize: number) => {
    let scaledTradeSize = 0;
    
    if (scalingMode === 'auto') {
      // Auto scaling based on real account balance
      const effectiveDemoSize = Math.max(tradeSize, MIN_TRADE_SIZE);
      const maxPossibleTrade = realBalance / ((assetRisk / 100) + (marginBuffer / effectiveDemoSize));
      const scalingFactor = Math.min(1, maxPossibleTrade / effectiveDemoSize);
      scaledTradeSize = Math.max(effectiveDemoSize * scalingFactor, MIN_TRADE_SIZE);
    } else {
      // Fixed percentage risk scaling
      scaledTradeSize = (realBalance * riskPercentage) / 100;
    }

    // Check if scaled trade size exceeds max trade size
    scaledTradeSize = Math.min(scaledTradeSize, maxTradeSize);

    return scaledTradeSize;
  };

  const checkMargin = (tradeSize: number) => {
    const margin = calculateRequiredMargin(tradeSize);
    return realBalance >= margin;
  };

  const ProfitLossDisplay = () => {
    return (
      <div className="profit-loss-display">
        <div className="pnl-header">Total P&L</div>
        <div className={`pnl-value ${profitLoss >= 0 ? 'positive' : 'negative'}`}>
          ${profitLoss.toFixed(2)}
        </div>
      </div>
    );
  };

  const Snackbar = () => {
    return (
      <div className={`snackbar ${snackbarSeverity} ${snackbarOpen ? 'show' : ''}`}>
        {snackbarMessage}
      </div>
    );
  };

  return (
    <div className="trade-replication-container">
      <div className="container">
        <div className="main-content">
          <div className="scroll-container">
            <div className="replication-header">
              <div className="header-left">
                <h2>Trade Replication</h2>
                <div className="account-status">
                  <div className="account-card demo-account">
                    <div className="account-icon">
                      <span className="demo-icon">Demo</span>
                    </div>
                    <div className="account-info">
                      <div className="account-label">Demo Account</div>
                      <div className="account-balance">${demoBalance.toFixed(2)}</div>
                    </div>
                    <div className="account-status-indicator">
                      <span className="status-dot" style={{ backgroundColor: isActiveAccountDemo ? '#28a745' : '#ced4da' }}></span>
                      <span className="status-text">{isActiveAccountDemo ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                  <div className="account-card real-account">
                    <div className="account-icon">
                      <span className="real-icon">Real</span>
                    </div>
                    <div className="account-info">
                      <div className="account-label">Real Account</div>
                      <div className="account-balance">${realBalance.toFixed(2)}</div>
                    </div>
                    <div className="account-status-indicator">
                      <span className="status-dot" style={{ backgroundColor: !isActiveAccountDemo ? '#28a745' : '#ced4da' }}></span>
                      <span className="status-text">{!isActiveAccountDemo ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="toggle-container">
                <ToggleSwitch
                  isEnabled={isReplicationEnabled}
                  onToggle={handleReplicationToggle}
                  label="Enable Trade Replication"
                  disabled={isProcessing}
                />
              </div>
            </div>

            {isReplicationEnabled && (
              <div className="copy-trading-section">
                <div className="grid-container">
                  {/* Account Status Grid */}
                  <div className="grid-item account-status">
                    <div className="grid-header">
                      <h3>Account Status</h3>
                      <div className="status-indicator">
                        <span className="status-dot" style={{ backgroundColor: isActiveAccountDemo ? '#28a745' : '#ced4da' }}></span>
                        <span className="status-text">{isActiveAccountDemo ? 'Demo Active' : 'Real Active'}</span>
                      </div>
                    </div>
                    <div className="account-grid">
                      <div className="account-cell">
                        <div className="account-icon demo-icon">Demo</div>
                        <div className="account-info">
                          <div className="balance">${demoBalance.toFixed(2)}</div>
                          <div className="label">Demo Account</div>
                        </div>
                      </div>
                      <div className="account-cell">
                        <div className="account-icon real-icon">Real</div>
                        <div className="account-info">
                          <div className="balance">${realBalance.toFixed(2)}</div>
                          <div className="label">Real Account</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Trade Settings Grid */}
                  <div className="grid-item trade-settings">
                    <div className="grid-header">
                      <h3>Trade Settings</h3>
                      <div className="settings-info">Configure trade replication parameters</div>
                    </div>
                    <div className="settings-grid">
                      <div className="settings-section">
                        <h3>Configure trade replication parameters</h3>
                        <div className="settings-group">
                          <div className="scaling-mode">
                            <h4>Scaling Mode</h4>
                            <div className="radio-group">
                              <label>
                                <input type="radio" name="scaling" checked={scalingMode === 'auto'} onChange={() => setScalingMode('auto')} />
                                Auto Scale
                              </label>
                              <label>
                                <input type="radio" name="scaling" checked={scalingMode === 'fixed'} onChange={() => setScalingMode('fixed')} />
                                Fixed Risk %
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="settings-section">
                        <h4>Trade Controls</h4>
                        <div className="control-group">
                          <div className="control-item">
                            <label>
                              <input type="checkbox" checked={askBeforeExecuting} onChange={() => setAskBeforeExecuting(!askBeforeExecuting)} />
                              Ask Before Executing
                            </label>
                            <p>Requires manual approval for each trade</p>
                          </div>
                          <div className="control-item">
                            <label>Maximum Trade Size ($)</label>
                            <input type="number" value={maxTradeSize} onChange={(e) => setMaxTradeSize(Number(e.target.value))} min="1" max="1000" />
                          </div>
                        </div>
                      </div>

                      <div className="settings-section">
                        <h4>Margin Requirements</h4>
                        <div className="control-group">
                          <div className="control-item">
                            <label>Asset Risk (%)</label>
                            <input type="number" value={assetRisk} onChange={(e) => setAssetRisk(Number(e.target.value))} min="1" max="100" />
                          </div>
                          <div className="control-item">
                            <label>Margin Buffer (%)</label>
                            <input type="number" value={marginBuffer} onChange={(e) => setMarginBuffer(Number(e.target.value))} min="1" max="100" />
                          </div>
                          <div className="example-calculation">
                            <p>Example: For a $500 trade with {assetRisk}% risk, required margin = ${calculateRequiredMargin(500).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="pending-trades-section">
                        <h4>Pending Trades</h4>
                        <div className="pending-count">{pendingTrades.length} pending</div>
                      </div>
                    </div>
                  </div>

                  {/* Pending Trades Grid */}
                  <div className="grid-item pending-trades">
                    <div className="grid-header">
                      <h3>Pending Trades</h3>
                      <div className="pending-count">{pendingTrades.length} pending</div>
                    </div>
                    <div className="trades-grid">
                      {pendingTrades.map((trade, index) => (
                        <div key={index} className="trade-card">
                          <div className="trade-info">
                            <div className="trade-icon">📊</div>
                            <div className="trade-details">
                              <div className="trade-asset">{trade.underlying}</div>
                              <div className="trade-size">Trade Size: $${trade.scaledTradeSize.toFixed(2)}</div>
                              <div className="trade-margin">Required Margin: $${trade.requiredMargin.toFixed(2)}</div>
                            </div>
                            <div className="trade-actions">
                              <button onClick={() => approvePendingTrade(index)} className="approve-btn">
                                <span className="action-icon">✅</span>
                                Approve
                              </button>
                              <button onClick={() => setPendingTrades(prev => prev.filter((_, i) => i !== index))} className="reject-btn">
                                <span className="action-icon">❌</span>
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Activity Log Grid */}
                  <div className="grid-item activity-log">
                    <div className="grid-header">
                      <h3>Activity Log</h3>
                      <div className="log-info">Recent trade replication activity</div>
                    </div>
                    <div className="logs-wrapper">
                      <div className="logs">
                        {logs.map((log, index) => (
                          <div key={index} className={`log-bubble ${log.level}`}>
                            <div className="bubble-content">
                              <div className="bubble-header">
                                <span className="bubble-timestamp">{log.timestamp}</span>
                                <span className="bubble-icon">
                                  {log.level === LogLevel.INFO && <span>ℹ️</span>}
                                  {log.level === LogLevel.WARNING && <span>⚠️</span>}
                                  {log.level === LogLevel.ERROR && <span>❌</span>}
                                  {log.level === LogLevel.SUCCESS && <span>✅</span>}
                                </span>
                              </div>
                              <div className="bubble-message">
                                <div className="bubble-title">
                                  {log.level === LogLevel.INFO && 'Info'}
                                  {log.level === LogLevel.WARNING && 'Warning'}
                                  {log.level === LogLevel.ERROR && 'Error'}
                                  {log.level === LogLevel.SUCCESS && 'Success'}
                                </div>
                                <div className="bubble-text">{log.message}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* P&L Display Grid */}
                  <div className="grid-item pnl-display">
                    <ProfitLossDisplay />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Snackbar />
    </div>
  );
});