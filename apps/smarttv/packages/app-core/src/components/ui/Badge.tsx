import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { colors, spacing, typography, borderRadius } from '../../styles/designTokens';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'live';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

interface StyledBadgeProps {
  $variant: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'live';
  $size: 'sm' | 'md' | 'lg';
  $pulse: boolean;
}

const pulseAnimation = keyframes`
  0% {
    box-shadow: 0 0 0 0 currentColor;
  }
  70% {
    box-shadow: 0 0 0 8px transparent;
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
`;

const StyledBadge = styled.span<StyledBadgeProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: ${typography.fontFamily.system};
  font-weight: ${typography.fontWeight.semibold};
  border-radius: ${borderRadius.round};
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  ${({ $size }) => {
    switch ($size) {
      case 'sm':
        return css`
          padding: ${spacing.xs} ${spacing.sm};
          font-size: ${typography.fontSize.xs};
          line-height: 1;
        `;
      case 'lg':
        return css`
          padding: ${spacing.sm} ${spacing.md};
          font-size: ${typography.fontSize.sm};
          line-height: 1.2;
        `;
      default:
        return css`
          padding: ${spacing.xs} ${spacing.sm};
          font-size: ${typography.fontSize.xs};
          line-height: 1.1;
        `;
    }
  }}
  
  ${({ $variant }) => {
    switch ($variant) {
      case 'primary':
        return css`
          background: ${colors.primary[500]};
          color: ${colors.text.primary};
        `;
      case 'secondary':
        return css`
          background: ${colors.dark.elevated};
          color: ${colors.text.secondary};
          border: 1px solid rgba(255, 255, 255, 0.1);
        `;
      case 'success':
        return css`
          background: ${colors.success};
          color: ${colors.text.primary};
        `;
      case 'warning':
        return css`
          background: ${colors.warning};
          color: ${colors.dark.systemBackground};
        `;
      case 'error':
        return css`
          background: ${colors.error};
          color: ${colors.text.primary};
        `;
      case 'live':
        return css`
          background: ${colors.error};
          color: ${colors.text.primary};
          position: relative;
          
          &::before {
            content: '';
            position: absolute;
            left: ${spacing.xs};
            top: 50%;
            transform: translateY(-50%);
            width: 6px;
            height: 6px;
            background: currentColor;
            border-radius: 50%;
          }
          
          padding-left: calc(${spacing.sm} + 6px + ${spacing.xs});
        `;
      default:
        return css`
          background: rgba(255, 255, 255, 0.1);
          color: ${colors.text.secondary};
          border: 1px solid rgba(255, 255, 255, 0.08);
        `;
    }
  }}
  
  ${({ $pulse, $variant }) =>
    $pulse &&
    css`
      animation: ${pulseAnimation} 2s infinite;
      animation-delay: ${$variant === 'live' ? '0.5s' : '0s'};
    `}
`;

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  pulse = false,
  className,
  style,
  ...rest
}) => {
  return (
    <StyledBadge
      $variant={variant}
      $size={size}
      $pulse={pulse}
      className={className}
      style={style}
      {...rest}
    >
      {children}
    </StyledBadge>
  );
};
