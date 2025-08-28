"use client";

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Check, AlertTriangle, Info, X, AlertCircle } from 'lucide-react';
import Button from '../boton';

export type DialogType = 'success' | 'warning' | 'info' | 'error' | 'custom';
export type DialogSize = 'sm' | 'md' | 'lg';

interface BaseDialogProps {
  type?: DialogType;
  size?: DialogSize;
  title: string;
  message: React.ReactNode;
  primaryButton?: {
    text: string;
    onClick: () => void;
    disabled?: boolean;
  };
  secondaryButton?: {
    text: string;
    onClick: () => void;
    disabled?: boolean;
  };
  onClose?: () => void;
  showCloseButton?: boolean;
  customIcon?: React.ReactNode;
  customColor?: string;
  isOpen?: boolean;
}

const BaseDialog: React.FC<BaseDialogProps> = ({
  type = 'success',
  size = 'md',
  title,
  message,
  primaryButton,
  secondaryButton,
  onClose,
  showCloseButton = false,
  customIcon,
  customColor,
  isOpen = true
}) => {
  const [isVisible, setIsVisible] = useState(isOpen);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsAnimating(false);
    } else {
      setIsAnimating(true);
      setTimeout(() => {
        setIsVisible(false);
        setIsAnimating(false);
      }, 300); // Duración de la animación de fade out
    }
  }, [isOpen]);

  const handleClose = () => {
    if (onClose) {
      setIsAnimating(true);
      setTimeout(() => {
        onClose();
      }, 300);
    }
  };

  if (!isVisible) return null;

  const getIcon = () => {
    if (customIcon) return customIcon;

    switch (type) {
      case 'success': return <Check className="dialog-icon" />;
      case 'warning': return <AlertTriangle className="dialog-icon" />;
      case 'info': return <Info className="dialog-icon" />;
      case 'error': return <AlertCircle className="dialog-icon" />;
      default: return <Check className="dialog-icon" />;
    }
  };

  const getColors = () => {
    if (customColor) {
      return {
        primary: customColor,
        light: '#ffffff',
        medium: customColor,
        dark: customColor
      };
    }

    switch (type) {
      case 'success': return {
        primary: '#10B981',
        light: '#f0fdf4',
        medium: '#4ade80',
        dark: '#166534'
      };
      case 'warning': return {
        primary: '#F59E0B',
        light: '#fffbea',
        medium: '#fbbf24',
        dark: '#92400e'
      };
      case 'info': return {
        primary: '#3B82F6',
        light: '#eff6ff',
        medium: '#60a5fa',
        dark: '#1e40af'
      };
      case 'error': return {
        primary: '#9C1838',
        light: '#fef2f2',
        medium: '#f87171',
        dark: '#9C1838'
      };
      case 'custom': return {
        primary: '#9C1838',
        light: '#ffffff',
        medium: '#9C1838',
        dark: '#333333'
      };
      default: return {
        primary: '#9C1838',
        light: '#fef2f2',
        medium: '#9C1838',
        dark: '#9C1838'
      };
    }
  };

  const colors = getColors();

return (
    <StyledWrapper $colors={colors} size={size} $isAnimating={isAnimating}>
      <div className="dialog-overlay">
        <div className="dialog-container">
          <div className="dialog-content">
            {showCloseButton && onClose && (
              <button onClick={handleClose} className="dialog-close-button">
                <X size={20} />
              </button>
            )}

            <div className="dialog-icon-wrapper">
              {getIcon()}
            </div>

            <h3 className="dialog-title">{title}</h3>
            <div className="dialog-message">{message}</div>

            <div className="dialog-buttons">
              {secondaryButton && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsAnimating(true);
                    setTimeout(() => {
                      secondaryButton.onClick();
                    }, 300);
                  }}
                  disabled={secondaryButton.disabled}
                >
                  {secondaryButton.text}
                </Button>
              )}
              {primaryButton && (
                <Button
                  variant="primary"
                  onClick={primaryButton.onClick}
                  disabled={primaryButton.disabled} 
                >
                  {primaryButton.text}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div<{ $colors: any; size: DialogSize; $isAnimating: boolean }>`
  .dialog-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: ${props => props.$isAnimating ? 'fadeOut 0.3s ease-out forwards' : 'fadeIn 0.3s ease-out'};
  }

  .dialog-container {
    width: ${props => props.size === 'sm' ? '320px' : props.size === 'lg' ? '800px' : '400px'};
    max-width: 95vw;
    max-height: 90vh;
    background-color: ${props => props.$colors.light};
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
    position: relative;
    text-align: center;
    animation: ${props => props.$isAnimating ? 'scaleOut 0.3s ease-out forwards' : 'scaleIn 0.3s ease-out'};
    overflow-y: auto;
  }

  @media (min-width: 640px) {
    .dialog-container {
      padding: 2rem;
    }
  }

  // ...existing styles...
  .dialog-close-button {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: none;
    border: none;
    color: ${props => props.$colors.dark};
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.375rem;
    transition: background-color 0.2s ease;
  }

  .dialog-close-button:hover {
    background-color: ${props => props.$colors.medium}20;
  }

  .dialog-icon-wrapper {
    margin-bottom: 1rem;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: ${props => props.$colors.medium}30;
    border-radius: 50%;
    width: 3.5rem;
    height: 3.5rem;
    margin-left: auto;
    margin-right: auto;
  }

  .dialog-icon {
    color: ${props => props.$colors.primary};
    width: 1.8rem;
    height: 1.8rem;
  }

  .dialog-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: ${props => props.$colors.dark};
    margin-bottom: 0.5rem;
    word-break: break-word;
    white-space: pre-wrap;
  }

  .dialog-message {
    font-size: 0.95rem;
    color: ${props => props.$colors.dark}CC;
    margin-bottom: 1.5rem;
    line-height: 1.6;
    word-break: break-word;
    white-space: pre-wrap;
  }

  .dialog-buttons {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  @keyframes scaleIn {
    from { 
      opacity: 0; 
      transform: scale(0.9);
    }
    to { 
      opacity: 1; 
      transform: scale(1);
    }
  }

  @keyframes scaleOut {
    from { 
      opacity: 1; 
      transform: scale(1);
    }
    to { 
      opacity: 0; 
      transform: scale(0.9);
    }
  }
`;

export default BaseDialog;