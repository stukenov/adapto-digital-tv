import React from 'react';
import styled, { css } from 'styled-components';
import { colors, spacing, typography, borderRadius, shadows } from '../../styles/designTokens';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'large';
  focused?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  style?: React.CSSProperties;
  focusKey?: string;
}

interface StyledButtonProps {
  $variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  $size: 'sm' | 'md' | 'large';
  $focused: boolean;
  $loading: boolean;
}

const StyledButton = styled.button<StyledButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: ${typography.fontFamily.system};
  font-weight: ${typography.fontWeight.semibold};
  border: none;
  border-radius: ${borderRadius.lg};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  text-decoration: none;
  outline: none;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
  
  ${({ $size }) => {
    switch ($size) {
      case 'sm':
        return css`
          padding: ${spacing.xs} ${spacing.md};
          font-size: ${typography.fontSize.sm};
          min-height: 36px;
        `;
      case 'large':
        return css`
          padding: ${spacing.md} ${spacing.xl};
          font-size: ${typography.fontSize.lg};
          min-height: 56px;
        `;
      default:
        return css`
          padding: ${spacing.sm} ${spacing.lg};
          font-size: ${typography.fontSize.base};
          min-height: 44px;
        `;
    }
  }}
  
  ${({ $variant }) => {
    switch ($variant) {
      case 'primary':
        return css`
          background: linear-gradient(135deg, ${colors.primary[500]} 0%, ${colors.primary[600]} 100%);
          color: ${colors.text.primary};
          box-shadow: ${shadows.dark.md};
          
          &:hover:not(:disabled) {
            background: linear-gradient(135deg, ${colors.primary[400]} 0%, ${colors.primary[500]} 100%);
            box-shadow: ${shadows.dark.lg};
            transform: translateY(-2px);
          }
          
          &:active:not(:disabled) {
            transform: translateY(0);
            box-shadow: ${shadows.dark.sm};
          }
        `;
        
      case 'secondary':
        return css`
          background: ${colors.dark.elevated};
          color: ${colors.text.primary};
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: ${shadows.dark.sm};
          
          &:hover:not(:disabled) {
            background: ${colors.dark.elevatedHigh};
            border-color: rgba(255, 255, 255, 0.2);
            box-shadow: ${shadows.dark.md};
            transform: translateY(-1px);
          }
          
          &:active:not(:disabled) {
            transform: translateY(0);
            background: ${colors.dark.elevated};
          }
        `;
        
      case 'ghost':
        return css`
          background: transparent;
          color: ${colors.text.secondary};
          border: 1px solid transparent;
          
          &:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.05);
            color: ${colors.text.primary};
            border-color: rgba(255, 255, 255, 0.1);
          }
          
          &:active:not(:disabled) {
            background: rgba(255, 255, 255, 0.02);
          }
        `;
        
      case 'danger':
        return css`
          background: linear-gradient(135deg, ${colors.error} 0%, #d70015 100%);
          color: ${colors.text.primary};
          box-shadow: ${shadows.dark.md};
          
          &:hover:not(:disabled) {
            background: linear-gradient(135deg, #ff6b6b 0%, ${colors.error} 100%);
            box-shadow: ${shadows.dark.lg};
            transform: translateY(-2px);
          }
          
          &:active:not(:disabled) {
            transform: translateY(0);
            box-shadow: ${shadows.dark.sm};
          }
        `;
        
      default:
        return css`
          background: ${colors.dark.elevated};
          color: ${colors.text.primary};
          border: 1px solid rgba(255, 255, 255, 0.1);
        `;
    }
  }}
  
  ${({ $focused }) =>
    $focused &&
    css`
      box-shadow: ${shadows.dark.xl}, 0 0 0 3px ${colors.primary[500]}40;
      transform: translateY(-2px);
      z-index: 10;
      
      &::before {
        content: '';
        position: absolute;
        inset: -2px;
        border-radius: ${borderRadius.lg};
        background: linear-gradient(45deg, ${colors.primary[500]}, ${colors.accent.purple});
        z-index: -1;
        opacity: 0.3;
        filter: blur(6px);
      }
    `}
  
  ${({ $loading }) =>
    $loading &&
    css`
      color: transparent;
      pointer-events: none;
      
      &::after {
        content: '';
        position: absolute;
        width: 20px;
        height: 20px;
        border: 2px solid currentColor;
        border-radius: 50%;
        border-top-color: transparent;
        animation: spin 1s linear infinite;
        color: ${colors.text.primary};
      }
      
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `}
`;

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  focused = false,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className,
  style,
  focusKey,
  ...rest
}) => {
  return (
    <StyledButton
      $variant={variant}
      $size={size}
      $focused={focused}
      $loading={loading}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
      className={className}
      style={style}
      data-focus-key={focusKey}
      {...rest}
    >
      {children}
    </StyledButton>
  );
};
