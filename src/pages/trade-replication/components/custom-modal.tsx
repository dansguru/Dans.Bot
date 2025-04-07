import React from 'react';
import { Modal as DerivModal } from '@deriv-com/ui';
import './custom-modal.scss';

interface CustomModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
}

const CustomModal: React.FC<CustomModalProps> = ({ isOpen, onClose, children }) => {
    return (
        <DerivModal
            is_open={isOpen}
            toggleModal={onClose}
        >
            {children}
        </DerivModal>
    );
};

export default CustomModal; 