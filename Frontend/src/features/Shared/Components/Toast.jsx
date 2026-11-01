import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback(({ message, type = 'info', duration = 3000 }) => {
        const id = ++toastId;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            {/* Toast Container */}
            <div
                style={{
                    position: 'fixed',
                    top: '24px',
                    right: '24px',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    pointerEvents: 'none',
                }}
            >
                {toasts.map(toast => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onRemove={removeToast}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

const typeStyles = {
    success: { borderColor: '#C9A96E', iconColor: '#C9A96E', icon: '✓' },
    error:   { borderColor: '#b94a4a', iconColor: '#b94a4a', icon: '✕' },
    info:    { borderColor: '#B5ADA3', iconColor: '#7A6E63', icon: 'i' },
};

const ToastItem = ({ toast, onRemove }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // trigger enter animation
        const t = setTimeout(() => setVisible(true), 10);
        return () => clearTimeout(t);
    }, []);

    const { borderColor, iconColor, icon } = typeStyles[toast.type] || typeStyles.info;

    return (
        <div
            onClick={() => onRemove(toast.id)}
            style={{
                pointerEvents: 'all',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 18px',
                backgroundColor: '#fbf9f6',
                borderLeft: `2px solid ${borderColor}`,
                boxShadow: '0 4px 24px rgba(27,28,26,0.08)',
                fontFamily: "'Inter', sans-serif",
                minWidth: '260px',
                maxWidth: '340px',
                cursor: 'pointer',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(20px)',
                transition: 'opacity 0.25s ease, transform 0.25s ease',
            }}
        >
            <span
                style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: `1px solid ${iconColor}`,
                    color: iconColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 600,
                    flexShrink: 0,
                }}
            >
                {icon}
            </span>
            <span
                style={{
                    fontSize: '11px',
                    letterSpacing: '0.04em',
                    color: '#1b1c1a',
                    lineHeight: '1.5',
                }}
            >
                {toast.message}
            </span>
        </div>
    );
};

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
};

export default ToastProvider;

