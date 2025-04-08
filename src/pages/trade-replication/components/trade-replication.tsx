import React, { useState, useEffect } from 'react';
import ToggleSwitch from './toggle-switch';
import CustomModal from './custom-modal';
import './trade-replication.scss';

interface TradeReplicationProps {
  demoBalance: number;
  realBalance: number;
  onReplicationChange: (isEnabled: boolean) => void;
}

export const TradeReplication: React.FC<TradeReplicationProps> = ({
  demoBalance,
  realBalance,
  onReplicationChange,
}) => {
  const [isReplicationEnabled, setIsReplicationEnabled] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [scalingMode, setScalingMode] = useState<'auto' | 'fixed'>('auto');
  const [riskPercentage, setRiskPercentage] = useState(2);
  const [dailyLossLimit, setDailyLossLimit] = useState(10);
  const [minBalanceThreshold, setMinBalanceThreshold] = useState(50);
  const [askBeforeExecuting, setAskBeforeExecuting] = useState(false);
  const [maxTradeSize, setMaxTradeSize] = useState(200);

  const handleReplicationToggle = (value: boolean) => {
    if (value) {
      setShowConfirmationModal(true);
    } else {
      setIsReplicationEnabled(false);
      onReplicationChange(false);
    }
  };

  const confirmReplication = () => {
    setIsReplicationEnabled(true);
    onReplicationChange(true);
    setShowConfirmationModal(false);
  };

  const calculateRequiredMargin = (tradeSize: number, assetRisk: number) => {
    const buffer = 5; // $5 buffer as per example
    return (tradeSize * assetRisk) + buffer;
  };

  const checkMargin = (tradeSize: number, assetRisk: number) => {
    const requiredMargin = calculateRequiredMargin(tradeSize, assetRisk);
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

  return (
    <div className="trade-replication">
      <div className="replication-header">
        <div className="header-left">
          <h2>Trade Replication</h2>
          <div className="balance-display">
            <div className="balance-item">
              <span className="balance-label">Demo Balance:</span>
              <span className="balance-value">${demoBalance.toFixed(2)}</span>
            </div>
            <div className="balance-item">
              <span className="balance-label">Real Balance:</span>
              <span className="balance-value">${realBalance.toFixed(2)}</span>
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
          </div>

          <div className="settings-section">
            <h3>Loss Protection</h3>
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
            </div>
          </div>

          <div className="settings-section">
            <h3>Trade Controls</h3>
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
            </div>
          </div>
        </div>
      )}

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
}; 