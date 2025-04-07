import React from 'react';
import './toggle-switch.scss';

interface ToggleSwitchProps {
    isEnabled: boolean;
    onToggle: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
    isEnabled,
    onToggle,
    label,
    disabled = false
}) => {
    return (
        <div className="trade-replication-toggle">
            {label && <span className="toggle-label">{label}</span>}
            <label className="toggle-switch">
                <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => onToggle(e.target.checked)}
                    disabled={disabled}
                />
                <span className="toggle-slider"></span>
            </label>
        </div>
    );
};

export default ToggleSwitch; 