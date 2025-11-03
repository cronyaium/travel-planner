import React from 'react';
import './Modal.css';

interface ModalProps {
    show: boolean;
    title?: string;
    onClose: () => void;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ show, title, onClose, children }) => {
    if (!show) return null;

    return (
        <div className="custom-modal-overlay" onClick={onClose}>
            <div className="custom-modal" onClick={(e) => e.stopPropagation()}>
                {title && <h3 className="custom-modal-title">{title}</h3>}
                <div className="custom-modal-content">{children}</div>
                <button className="custom-modal-btn" onClick={onClose}>确定</button>
            </div>
        </div>
    );
};

export default Modal;
