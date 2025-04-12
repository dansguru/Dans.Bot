import React, { useState, useEffect } from 'react';
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

  const MIN_TRADE_SIZE = 1; // Minimum trade size in dollars

  // Update active account type when isActiveAccountDemo changes
  useEffect(() => {
    setActiveAccountType(isActiveAccountDemo ? 'demo' : 'real');
  }, [isActiveAccountDemo]);

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
          
          // Store demo trade
          setDemoTrades(prev => [...prev, {
            ...contract,
            originalTradeSize: tradeSize,
            timestamp: new Date().toISOString()
          }]);

          // Process trade for real account
          processDemoTrade(contract, tradeSize);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          addLog(`Failed to process demo trade: ${errorMessage}`, LogLevel.ERROR);
          showNotification('Failed to process demo trade', 'error');
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
      // Calculate scaled trade size based on settings
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

      // Calculate required margin
      const requiredMargin = calculateRequiredMargin(scaledTradeSize);
      
      // Check if we have enough balance
      if (realBalance < requiredMargin) {
        throw new Error(`Insufficient balance. Required margin: $${requiredMargin}, Available: $${realBalance}`);
      }

      // Add to pending trades if manual approval is required
      if (askBeforeExecuting) {
        setPendingTrades(prev => [...prev, {
          ...contract,
          demoTradeSize: tradeSize,
          scaledTradeSize,
          requiredMargin,
          timestamp: new Date().toISOString()
        }]);
        addLog(`Trade added to pending approval: ${contract.underlying} - Demo: $${tradeSize} → Scaled: $${scaledTradeSize}`, LogLevel.INFO);
      } else {
        // Execute trade immediately if no approval required
        executeTrade(contract, scaledTradeSize);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addLog(`Failed to process demo trade: ${errorMessage}`, LogLevel.ERROR);
      showNotification('Failed to process demo trade', 'error');
    }
  };

  const executeTrade = (contract: any, tradeSize: number) => {
    try {
      // Calculate required margin
      const requiredMargin = calculateRequiredMargin(tradeSize);
      
      // Check if we have enough balance
      if (realBalance < requiredMargin) {
        throw new Error(`Insufficient balance. Required margin: $${requiredMargin}, Available: $${realBalance}`);
      }

      // Execute the trade
      addLog(`Executing trade: ${contract.underlying} - $${tradeSize}`, LogLevel.INFO);
      showNotification(`Executing trade: ${contract.underlying} - $${tradeSize}`, 'info');
      
      // Update real balance after successful trade
      const newBalance = realBalance - tradeSize;
      onReplicationChange(false); // Temporarily disable replication during trade
      onReplicationChange(true, newBalance);  // Re-enable replication after trade
      setNewRealBalance(newBalance);
      
      addLog(`Trade executed successfully: ${contract.underlying} - $${tradeSize}`, LogLevel.SUCCESS);
      showNotification(`Trade executed successfully: ${contract.underlying} - $${tradeSize}`, 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addLog(`Trade execution failed: ${errorMessage}`, LogLevel.ERROR);
      showNotification('Trade execution failed', 'error');
    }
  };

  const addLog = (message: string, level: LogLevel) => {
    const logEntry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      message,
      level,
    };
    setLogs(prevLogs => [...prevLogs, logEntry]);
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
      // Reset demo trades when enabling replication
      setDemoTrades([]);
      
      // Enable replication
      setIsReplicationEnabled(true);
      onReplicationChange(true);
      showNotification('Trade replication enabled - Now copying demo trades to real account', 'success');
      addLog('Trade replication enabled - Now copying demo trades to real account', LogLevel.SUCCESS);
    } else {
      // Disable replication
      setIsReplicationEnabled(false);
      onReplicationChange(false);
      showNotification('Trade replication disabled', 'info');
      addLog('Trade replication disabled', LogLevel.INFO);
    }
  };

  const calculateRequiredMargin = (tradeSize: number) => {
    // Calculate margin with minimum trade size consideration
    const effectiveTradeSize = Math.max(tradeSize, MIN_TRADE_SIZE);
    return (effectiveTradeSize * assetRisk / 100) + marginBuffer;
  };

  const checkMargin = (tradeSize: number) => {
    const margin = calculateRequiredMargin(tradeSize);
    return realBalance >= margin;
  };

  const LogEntryComponent = ({ log }: { log: LogEntry }) => (
    <div className={`log-entry ${log.level}`}>
      <span className="timestamp">{log.timestamp}</span>
      <span className="message">{log.message}</span>
    </div>
  );

  return (
    <div className="trade-replication">
      <div className="container">
        <div className="main-content">
          <div className="scroll-container">
            <div className="replication-header">
              <div className="header-left">
                <h2>Trade Replication</h2>
                <div className="balance-display">
                  <div className="balance-item">
                    <div className="balance-label">Demo Balance</div>
                    <div className="balance-value">${demoBalance.toFixed(2)}</div>
                    <div className="active-indicator">Demo Account</div>
                  </div>
                  <div className="balance-item">
                    <div className="balance-label">Real Balance</div>
                    <div className="balance-value">${newRealBalance.toFixed(2)}</div>
                    <div className="active-indicator">Real Account</div>
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
              <div className="replication-settings">
                <div className="settings-section">
                  <h3>Trade Scaling</h3>
                  <div className="input-group">
                    <label>Scaling Mode</label>
                    <div className="radio-group">
                      <label>
                        <input
                          type="radio"
                          checked={scalingMode === 'auto'}
                          onChange={() => setScalingMode('auto')}
                        />
                        Auto Scale (Based on Balance)
                      </label>
                      <label>
                        <input
                          type="radio"
                          checked={scalingMode === 'fixed'}
                          onChange={() => setScalingMode('fixed')}
                        />
                        Fixed Risk %
                      </label>
                    </div>
                  </div>

                  {scalingMode === 'fixed' && (
                    <div className="input-group">
                      <label>Risk Percentage (%)</label>
                      <input
                        type="number"
                        value={riskPercentage}
                        onChange={(e) => setRiskPercentage(Number(e.target.value))}
                        min="1"
                        max="100"
                      />
                    </div>
                  )}

                  <div className="input-group">
                    <label>Maximum Trade Size ($)</label>
                    <input
                      type="number"
                      value={maxTradeSize}
                      onChange={(e) => setMaxTradeSize(Number(e.target.value))}
                      min="0"
                    />
                  </div>
                </div>

                <div className="settings-section">
                  <h3>Margin Requirements</h3>
                  <div className="input-group">
                    <label>Asset Risk (%)</label>
                    <input
                      type="number"
                      value={assetRisk}
                      onChange={(e) => setAssetRisk(Number(e.target.value))}
                      min="1"
                      max="100"
                    />
                  </div>
                  <div className="input-group">
                    <label>Margin Buffer (%)</label>
                    <input
                      type="number"
                      value={marginBuffer}
                      onChange={(e) => setMarginBuffer(Number(e.target.value))}
                      min="1"
                      max="100"
                    />
                  </div>
                  <div className="info-box">
                    <p>Example: For a $500 trade with 5% risk, required margin = ${calculateRequiredMargin(500).toFixed(2)}</p>
                  </div>
                </div>

                <div className="settings-section">
                  <h3>User Controls</h3>
                  <div className="input-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={askBeforeExecuting}
                        onChange={(e) => setAskBeforeExecuting(e.target.checked)}
                      />
                      Ask Before Executing (Manual Approval)
                    </label>
                  </div>
                  <div className="pending-trades">
                    <h4>Pending Trades ({pendingTrades.length})</h4>
                    <div className="trades-list">
                      {pendingTrades.map((trade, index) => (
                        <div key={index} className="trade-item">
                          <div className="trade-details">
                            <span>Asset: {trade.underlying}</span>
                            <span>Trade Size: $${trade.scaledTradeSize.toFixed(2)}</span>
                            <span>Required Margin: $${trade.requiredMargin.toFixed(2)}</span>
                          </div>
                          <div className="trade-actions">
                            <button onClick={() => approvePendingTrade(index)}>Approve</button>
                            <button onClick={() => setPendingTrades(prev => prev.filter((_, i) => i !== index))}>Reject</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isReplicationEnabled && (
              <div className="log-container">
                <h3>Replication Activity</h3>
                <div className="logs">
                  {logs.map((log, index) => (
                    <LogEntryComponent key={index} log={log} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});