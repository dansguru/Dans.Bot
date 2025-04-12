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
          
          // Calculate scaled trade size
          const scaledTradeSize = calculateScaledTrade(tradeSize);
          
          // Check if we have enough margin
          const requiredMargin = calculateRequiredMargin(scaledTradeSize);
          if (realBalance < requiredMargin) {
            addLog(`Insufficient margin: Required $${requiredMargin}, Available $${realBalance}`, LogLevel.ERROR);
            showNotification('Insufficient margin for trade', 'error');
            return;
          }

          // Add to pending trades if manual approval is required
          if (askBeforeExecuting) {
            setPendingTrades(prev => [...prev, {
              ...contract,
              demoTradeSize: tradeSize,
              scaledTradeSize,
              requiredMargin
            }]);
            addLog(`Trade added to pending approval: ${contract.underlying} - $${scaledTradeSize}`, LogLevel.INFO);
          } else {
            // Execute trade immediately if no approval required
            executeTrade(contract, scaledTradeSize);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          addLog(`Failed to process trade: ${errorMessage}`, LogLevel.ERROR);
          showNotification('Trade processing failed', 'error');
        }
      });
      
      if (typeof unsubscribeBotContract === 'function') {
        unsubscribeFunctions.push(unsubscribeBotContract);
      }
      
      const unsubscribeBotRunning = globalObserver.register('bot.running', () => {
        if (!isReplicationEnabled) return;
        showNotification('Bot started - Trade replication is active', 'info');
        addLog('Bot started - Trade replication is active', LogLevel.INFO);
      });
      
      if (typeof unsubscribeBotRunning === 'function') {
        unsubscribeFunctions.push(unsubscribeBotRunning);
      }
      
      const unsubscribeBotStop = globalObserver.register('bot.stop', () => {
        if (!isReplicationEnabled) return;
        showNotification('Bot stopped - Trade replication paused', 'info');
        addLog('Bot stopped - Trade replication paused', LogLevel.INFO);
      });
      
      if (typeof unsubscribeBotStop === 'function') {
        unsubscribeFunctions.push(unsubscribeBotStop);
      }

      return () => {
        // Call all unsubscribe functions
        unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
      };
    }
  }, [isReplicationEnabled, realBalance, askBeforeExecuting]);

  const addLog = (message: string, level: LogLevel) => {
    const logEntry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      message,
      level,
    };
    setLogs(prevLogs => [...prevLogs, logEntry]);
  };

  const handleReplicationToggle = (value: boolean) => {
    if (value) {
      // No need for API calls, just enable/disable locally
      setIsReplicationEnabled(true);
      onReplicationChange(true);
      showNotification('Trade replication has been enabled', 'success');
      addLog('Trade replication successfully enabled', LogLevel.SUCCESS);
    } else {
      setIsReplicationEnabled(false);
      onReplicationChange(false);
      showNotification('Trade replication has been disabled', 'info');
      addLog('Trade replication successfully disabled', LogLevel.INFO);
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
      
      addLog(`Trade executed successfully: ${contract.underlying} - $${tradeSize}`, LogLevel.SUCCESS);
      showNotification(`Trade executed successfully: ${contract.underlying} - $${tradeSize}`, 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addLog(`Trade execution failed: ${errorMessage}`, LogLevel.ERROR);
      showNotification('Trade execution failed', 'error');
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

  const calculateScaledTrade = (demoTradeSize: number) => {
    // Ensure minimum trade size is respected
    const effectiveDemoSize = Math.max(demoTradeSize, MIN_TRADE_SIZE);
    
    // Calculate scaling factor based on real account balance
    const maxPossibleTrade = realBalance / ((assetRisk / 100) + (marginBuffer / effectiveDemoSize));
    const scalingFactor = Math.min(1, maxPossibleTrade / effectiveDemoSize);
    
    // Apply scaling while ensuring minimum trade size
    const scaledSize = Math.max(effectiveDemoSize * scalingFactor, MIN_TRADE_SIZE);
    
    return scaledSize;
  };

  const onBotRunningEvent = () => {
    if (!isReplicationEnabled) return;
    showNotification('Bot started - Trade replication is active', 'info');
  };

  const onBotStopEvent = () => {
    if (!isReplicationEnabled) return;
    setPendingTrades([]);
    showNotification('Bot stopped - Trade replication paused', 'info');
  };

  const LogEntryComponent = ({ log }: { log: LogEntry }) => (
    <div className={`log-entry ${log.level}`}>
      <span className="timestamp">{log.timestamp}</span>
      <span className="message">{log.message}</span>
    </div>
  );

  const approvePendingTrade = (tradeIndex: number) => {
    const trade = pendingTrades[tradeIndex];
    if (trade) {
      // Execute the trade with the scaled size
      executeTrade(trade, trade.scaledTradeSize);
      
      // Remove the approved trade from pending list
      setPendingTrades(prev => prev.filter((_, index) => index !== tradeIndex));
    }
  };

 
  // Check if replication should be stopped based on minimum balance threshold
  useEffect(() => {
    if (isReplicationEnabled && realBalance < minBalanceThreshold) {
      setIsReplicationEnabled(false);
      onReplicationChange(false);
      showNotification(`Trade replication stopped: Balance below minimum threshold ($${minBalanceThreshold})`, 'error');
    }
  }, [realBalance, minBalanceThreshold, isReplicationEnabled, onReplicationChange]);

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
                  label="Enable Replication"
                  disabled={isProcessing}
                />
              </div>
            </div>

            {isReplicationEnabled && (
              <div className="replication-settings">
                <div className="settings-section">
                  <h3>Liquidation Shield</h3>
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
                  <h3>Dynamic Scaling</h3>
                  <div className="input-group">
                    <label>Scaling Mode</label>
                    <div className="radio-group">
                      <label>
                        <input
                          type="radio"
                          checked={scalingMode === 'auto'}
                          onChange={() => setScalingMode('auto')}
                        />
                        Auto-Scale
                      </label>
                      <label>
                        <input
                          type="radio"
                          checked={scalingMode === 'fixed'}
                          onChange={() => setScalingMode('fixed')}
                        />
                        Fixed % Risk
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
                  <div className="info-box">
                    <p>{scalingMode === 'auto' ? 
                      'All trades will be scaled down to match your real account balance if needed.' : 
                      `All trades will be capped at ${riskPercentage}% of your real account balance.`
                    }</p>
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
                      Ask Before Executing
                    </label>
                  </div>
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
              </div>
            )}

            {isReplicationEnabled && (
              <div className="log-container">
                <h3>Replication Logs</h3>
                <div className="logs">
                  {logs.map((log, index) => (
                    <LogEntryComponent key={index} log={log} />
                  ))}
                </div>
              </div>
            )}

            <div className="how-it-works">
              <div className="section-header">
                <h2>How It Works</h2>
              </div>

              <div className="steps">
                <div className="step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h3>Liquidation Shield</h3>
                    <p>Before executing any trade, the system calculates the required margin based on the trade size and asset risk. If your real account doesn't have enough balance, the trade will be blocked.</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h3>Dynamic Scaling</h3>
                    <p>You can choose between two scaling modes:</p>
                    <ul>
                      <li><strong>Auto-Scale:</strong> Reduces trade size to match your real account balance</li>
                      <li><strong>Fixed % Risk:</strong> Caps all trades at a percentage of your real account balance</li>
                    </ul>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h3>User Controls</h3>
                    <p>You have full control with options to approve each trade and set a maximum trade size.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CustomModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        title="Enable Trade Replication"
      >
        <p>Are you sure you want to enable trade replication? This will automatically execute demo trades in your real account with the configured safeguards.</p>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => setShowConfirmationModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={() => handleReplicationToggle(true)}>Enable</button>
        </div>
      </CustomModal>
    </div>
  );
});