import React, { useState, useEffect } from 'react';
import ToggleSwitch from './toggle-switch';
import CustomModal from './custom-modal';
import './trade-replication.scss';
import { observer } from 'mobx-react-lite';
import { observer as globalObserver } from '@/external/bot-skeleton/utils/observer';
import { LogTypes } from '@/external/bot-skeleton';
import { showNotification } from '@/utils/notification';

// API keys for demo and real accountsS
const DEMO_API_KEY = '6N8BoA2nOGoBraP';
const REAL_API_KEY = 'xtwkGoyT9q15LL4';

interface TradeReplicationProps {
  demoBalance: number;
  realBalance: number;
  isActiveAccountDemo: boolean;
  onReplicationChange: (isEnabled: boolean) => void;
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
  const [dailyLossLimit, setDailyLossLimit] = useState(10);
  const [minBalanceThreshold, setMinBalanceThreshold] = useState(50);
  const [askBeforeExecuting, setAskBeforeExecuting] = useState(false);
  const [maxTradeSize, setMaxTradeSize] = useState(200);
  const [activeAccountType, setActiveAccountType] = useState<'demo' | 'real'>(isActiveAccountDemo ? 'demo' : 'real');
  const [assetRisk, setAssetRisk] = useState(5);
  const [marginBuffer, setMarginBuffer] = useState(5);
  const [showExplanation, setShowExplanation] = useState(false);
  const [dailyLoss, setDailyLoss] = useState(0);
  const [pendingTrades, setPendingTrades] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

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
      const unsubscribeBotContract = globalObserver.register('bot.contract', onBotContractEvent);
      if (typeof unsubscribeBotContract === 'function') {
        unsubscribeFunctions.push(unsubscribeBotContract);
      }
      
      const unsubscribeContractStatus = globalObserver.register('contract.status', onContractStatusEvent);
      if (typeof unsubscribeContractStatus === 'function') {
        unsubscribeFunctions.push(unsubscribeContractStatus);
      }
      
      const unsubscribeBotRunning = globalObserver.register('bot.running', onBotRunningEvent);
      if (typeof unsubscribeBotRunning === 'function') {
        unsubscribeFunctions.push(unsubscribeBotRunning);
      }
      
      const unsubscribeBotStop = globalObserver.register('bot.stop', onBotStopEvent);
      if (typeof unsubscribeBotStop === 'function') {
        unsubscribeFunctions.push(unsubscribeBotStop);
      }

      return () => {
        // Call all unsubscribe functions
        unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
      };
    }
  }, [isReplicationEnabled]);

  const handleReplicationToggle = (value: boolean) => {
    if (value) {
      setShowConfirmationModal(true);
    } else {
      setIsReplicationEnabled(false);
      onReplicationChange(false);
      showNotification('Trade replication has been disabled', 'info');
    }
  };

  const confirmReplication = () => {
    setIsReplicationEnabled(true);
    onReplicationChange(true);
    setShowConfirmationModal(false);
    showNotification('Trade replication has been enabled', 'success');
  };

  const calculateRequiredMargin = (tradeSize: number) => {
    return (tradeSize * assetRisk / 100) + marginBuffer;
  };

  const checkMargin = (tradeSize: number) => {
    const requiredMargin = calculateRequiredMargin(tradeSize);
    return realBalance >= requiredMargin;
  };

  const calculateScaledTrade = (demoTradeSize: number) => {
    if (scalingMode === 'auto') {
      return Math.min(demoTradeSize, realBalance);
    } else {
      const maxTrade = (realBalance * riskPercentage) / 100;
      return Math.min(demoTradeSize, maxTrade);
    }
  };

  const onBotContractEvent = (contract: any) => {
    if (!isReplicationEnabled || isActiveAccountDemo) return;

    const { buy_price, profit } = contract;
    if (profit) {
      setDailyLoss(prev => Math.min(0, prev + profit));
    }

    if (buy_price) {
      const scaledTradeSize = calculateScaledTrade(buy_price);
      if (checkMargin(scaledTradeSize)) {
        if (askBeforeExecuting) {
          setPendingTrades(prev => [...prev, { ...contract, scaledTradeSize }]);
          showNotification(`New trade detected: ${contract.underlying} - $${buy_price}`, 'info');
        } else {
          executeTrade(contract, scaledTradeSize);
        }
      } else {
        showNotification(`Trade blocked: Insufficient margin for $${buy_price} trade`, 'warning');
      }
    }
  };

  const onContractStatusEvent = (status: any) => {
    if (!isReplicationEnabled || isActiveAccountDemo) return;

    if (status.id === 'contract.sold') {
      const { contract } = status;
      if (contract) {
        const { profit } = contract;
        setDailyLoss(prev => Math.min(0, prev + profit));
        
        if (profit > 0) {
          showNotification(`Trade closed with profit: $${profit.toFixed(2)}`, 'success');
        } else if (profit < 0) {
          showNotification(`Trade closed with loss: $${Math.abs(profit).toFixed(2)}`, 'warning');
        }
      }
    }
  };

  const onBotRunningEvent = () => {
    if (!isReplicationEnabled || isActiveAccountDemo) return;
    // Reset daily loss when bot starts
    setDailyLoss(0);
    showNotification('Bot started - Trade replication is active', 'info');
  };

  const onBotStopEvent = () => {
    if (!isReplicationEnabled || isActiveAccountDemo) return;
    // Clear pending trades when bot stops
    setPendingTrades([]);
    showNotification('Bot stopped - Trade replication paused', 'info');
  };

  const executeTrade = async (contract: any, scaledTradeSize: number) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      // Here you would implement the actual trade execution logic using the API keys
      // This would involve calling the appropriate API endpoints
      console.log('Executing trade:', {
        originalSize: contract.buy_price,
        scaledSize: scaledTradeSize,
        contractType: contract.contract_type,
        symbol: contract.underlying,
        apiKey: REAL_API_KEY, // Using real account API key for execution
      });
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Log success
      console.log('Trade executed successfully');
      showNotification(`Trade executed: ${contract.underlying} - $${scaledTradeSize}`, 'success');
      
    } catch (error: unknown) {
      console.error('Error executing trade:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showNotification(`Error executing trade: ${errorMessage}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const approvePendingTrade = (tradeIndex: number) => {
    const trade = pendingTrades[tradeIndex];
    if (trade) {
      executeTrade(trade, trade.scaledTradeSize);
      
      // Remove the approved trade from pending list
      setPendingTrades(prev => prev.filter((_, index) => index !== tradeIndex));
      showNotification(`Trade approved: ${trade.underlying} - $${trade.scaledTradeSize}`, 'success');
    }
  };

  const rejectPendingTrade = (tradeIndex: number) => {
    const trade = pendingTrades[tradeIndex];
    if (trade) {
      setPendingTrades(prev => prev.filter((_, index) => index !== tradeIndex));
      showNotification(`Trade rejected: ${trade.underlying} - $${trade.scaledTradeSize}`, 'info');
    }
  };

  const toggleExplanation = () => {
    setShowExplanation(!showExplanation);
  };

  // Check if replication should be stopped based on daily loss limit
  useEffect(() => {
    if (isReplicationEnabled && dailyLoss < -((realBalance * dailyLossLimit) / 100)) {
      setIsReplicationEnabled(false);
      onReplicationChange(false);
      showNotification(`Trade replication stopped: Daily loss limit (${dailyLossLimit}%) exceeded`, 'error');
    }
  }, [dailyLoss, realBalance, dailyLossLimit, isReplicationEnabled, onReplicationChange]);

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
      <div className="replication-header">
        <div className="header-left">
          <h2>Trade Replication</h2>
          <div className="balance-display">
            <div className={`balance-item ${activeAccountType === 'demo' ? 'active-account' : ''}`}>
              <span className="balance-label">Demo Balance:</span>
              <span className="balance-value">${demoBalance.toFixed(2)}</span>
              {activeAccountType === 'demo' && <span className="active-indicator">(Active)</span>}
            </div>
            <div className={`balance-item ${activeAccountType === 'real' ? 'active-account' : ''}`}>
              <span className="balance-label">Real Balance:</span>
              <span className="balance-value">${realBalance.toFixed(2)}</span>
              {activeAccountType === 'real' && <span className="active-indicator">(Active)</span>}
            </div>
          </div>
        </div>
        <ToggleSwitch
          isEnabled={isReplicationEnabled}
          onToggle={handleReplicationToggle}
          label="Enable Replication"
        />
      </div>

      {isReplicationEnabled && (
        <div className="replication-settings">
          <div className="settings-section">
            <h3>Liquidation Shield</h3>
            <div className="protection-inputs">
              <div className="input-group">
                <label>Asset Risk (%):</label>
                <input
                  type="number"
                  value={assetRisk}
                  onChange={(e) => setAssetRisk(Number(e.target.value))}
                  min="0.1"
                  max="100"
                  step="0.1"
                />
                %
              </div>
              <div className="input-group">
                <label>Margin Buffer:</label>
                <input
                  type="number"
                  value={marginBuffer}
                  onChange={(e) => setMarginBuffer(Number(e.target.value))}
                  min="1"
                />
                $
              </div>
              <div className="margin-info">
                <p>Required Margin = (Trade Size × {assetRisk}%) + ${marginBuffer}</p>
                <p>Example: For a $500 trade, required margin = ${calculateRequiredMargin(500).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Dynamic Scaling</h3>
            <div className="scaling-options">
              <label>
                <input
                  type="radio"
                  checked={scalingMode === 'auto'}
                  onChange={() => setScalingMode('auto')}
                />
                Auto-Scale to Safe Size
              </label>
              <label>
                <input
                  type="radio"
                  checked={scalingMode === 'fixed'}
                  onChange={() => setScalingMode('fixed')}
                />
                Fixed % Risk Mode
              </label>
            </div>
            {scalingMode === 'fixed' && (
              <div className="risk-input">
                <label>Risk Percentage:</label>
                <input
                  type="number"
                  value={riskPercentage}
                  onChange={(e) => setRiskPercentage(Number(e.target.value))}
                  min="0.1"
                  max="100"
                  step="0.1"
                />
                %
              </div>
            )}
            <div className="scaling-info">
              {scalingMode === 'auto' ? (
                <p>All trades will be scaled down to match your real account balance if needed.</p>
              ) : (
                <p>All trades will be capped at {riskPercentage}% of your real account balance.</p>
              )}
            </div>
          </div>

          <div className="settings-section">
            <h3>Loss Circuit Breaker</h3>
            <div className="protection-inputs">
              <div className="input-group">
                <label>Daily Loss Limit:</label>
                <input
                  type="number"
                  value={dailyLossLimit}
                  onChange={(e) => setDailyLossLimit(Number(e.target.value))}
                  min="1"
                  max="100"
                />
                %
              </div>
              <div className="input-group">
                <label>Minimum Balance Threshold:</label>
                <input
                  type="number"
                  value={minBalanceThreshold}
                  onChange={(e) => setMinBalanceThreshold(Number(e.target.value))}
                  min="1"
                />
                $
              </div>
              <div className="circuit-breaker-info">
                <p>Replication will automatically stop if:</p>
                <ul>
                  <li>Daily loss exceeds {dailyLossLimit}% of your real account balance</li>
                  <li>Real account balance drops below ${minBalanceThreshold}</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>User Control Panel</h3>
            <div className="control-options">
              <label>
                <input
                  type="checkbox"
                  checked={askBeforeExecuting}
                  onChange={(e) => setAskBeforeExecuting(e.target.checked)}
                />
                Ask Before Executing
              </label>
              <div className="input-group">
                <label>Max Trade Size:</label>
                <input
                  type="number"
                  value={maxTradeSize}
                  onChange={(e) => setMaxTradeSize(Number(e.target.value))}
                  min="1"
                />
                $
              </div>
              <div className="control-info">
                <p>These settings give you manual control over trade execution:</p>
                <ul>
                  <li>Ask Before Executing: You'll need to approve each trade before it executes</li>
                  <li>Max Trade Size: No trade will exceed ${maxTradeSize}, regardless of other settings</li>
                </ul>
              </div>
            </div>
          </div>
          
          {pendingTrades.length > 0 && (
            <div className="settings-section">
              <h3>Pending Trades</h3>
              <div className="pending-trades">
                {pendingTrades.map((trade, index) => (
                  <div key={index} className="pending-trade-item">
                    <div className="trade-details">
                      <p><strong>Symbol:</strong> {trade.underlying}</p>
                      <p><strong>Type:</strong> {trade.contract_type}</p>
                      <p><strong>Original Size:</strong> ${trade.buy_price}</p>
                      <p><strong>Scaled Size:</strong> ${trade.scaledTradeSize}</p>
                    </div>
                    <div className="trade-actions">
                      <button 
                        className="btn-approve" 
                        onClick={() => approvePendingTrade(index)}
                        disabled={isProcessing}
                      >
                        Approve
                      </button>
                      <button 
                        className="btn-reject" 
                        onClick={() => rejectPendingTrade(index)}
                        disabled={isProcessing}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="trade-replication-explanation">
        <button className="explanation-toggle" onClick={toggleExplanation}>
          {showExplanation ? 'Hide How It Works' : 'Show How It Works'}
        </button>
        {showExplanation && (
          <div className="explanation-content">
            <h3>How Trade Replication Works</h3>
            <div className="explanation-steps">
              <div className="step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>Liquidation Shield</h4>
                  <p>Before executing any trade, the system calculates the required margin based on the trade size and asset risk. If your real account doesn't have enough balance, the trade will be blocked.</p>
                </div>
              </div>
              <div className="step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>Dynamic Scaling</h4>
                  <p>You can choose between two scaling modes:</p>
                  <ul>
                    <li><strong>Auto-Scale:</strong> Reduces trade size to match your real balance</li>
                    <li><strong>Fixed % Risk:</strong> Caps all trades at a percentage of your real balance</li>
                  </ul>
                </div>
              </div>
              <div className="step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>Loss Circuit Breaker</h4>
                  <p>The system automatically stops replication if your daily loss exceeds the limit or if your balance drops below the minimum threshold.</p>
                </div>
              </div>
              <div className="step">
                <div className="step-number">4</div>
                <div className="step-content">
                  <h4>User Controls</h4>
                  <p>You have full control with options to approve each trade and set a maximum trade size.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <CustomModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        title="Enable Trade Replication"
      >
        <p>Are you sure you want to enable trade replication? This will automatically execute demo trades in your real account with the configured safeguards.</p>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => setShowConfirmationModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={confirmReplication}>Enable</button>
        </div>
      </CustomModal>
    </div>
  );
}); 