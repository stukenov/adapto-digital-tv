import React from 'react';
import styled, { css } from 'styled-components';
import { colors, spacing, borderRadius, shadows, gradients } from '../../styles/designTokens';

interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'glass' | 'outline';
  interactive?: boolean;
  focused?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  'data-focus-key'?: string;
}

interface StyledCardProps {
  $variant: 'elevated' | 'glass' | 'outline';
  $interactive: boolean;
  $focused: boolean;
  $padding: 'none' | 'sm' | 'md' | 'lg';
}

const StyledCard = styled.div<StyledCardProps>`
  border-radius: ${borderRadius.xl};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  
  ${({ $padding }) => {
    const paddingMap = {
      none: '0',
      sm: spacing.sm,
      md: spacing.md,
      lg: spacing.lg,
    };
    return css`padding: ${paddingMap[$padding]};`;
  }}
  
  ${({ $variant }) => {
    switch ($variant) {
      case 'elevated':
        return css`
          background: ${colors.dark.elevated};
          box-shadow: ${shadows.dark.md};
          border: 1px solid rgba(255, 255, 255, 0.1);
        `;
      case 'glass':
        return css`
          background: ${gradients.glassDark};
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: ${shadows.dark.sm};
        `;
      case 'outline':
        return css`
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
        `;
      default:
        return css`
          background: ${colors.dark.elevated};
          border: 1px solid rgba(255, 255, 255, 0.1);
        `;
    }
  }}
  
  ${({ $interactive }) =>
    $interactive &&
    css`
      cursor: pointer;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: ${shadows.dark.lg};
        border-color: rgba(255, 255, 255, 0.2);
      }
      
      &:active {
        transform: translateY(0);
        box-shadow: ${shadows.dark.md};
      }
    `}
  
  ${({ $focused }) =>
    $focused &&
    css`
      transform: translateY(-4px) scale(1.02);
      box-shadow: ${shadows.dark.xl}, 0 0 0 2px ${colors.primary[500]};
      border-color: ${colors.primary[500]};
      z-index: 10;
      
      &::before {
        content: '';
        position: absolute;
        inset: -2px;
        border-radius: ${borderRadius.xl};
        background: linear-gradient(45deg, ${colors.primary[500]}, ${colors.accent.purple});
        z-index: -1;
        opacity: 0.5;
        filter: blur(8px);
      }
    `}
`;

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  interactive = false,
  focused = false,
  padding = 'md',
  onClick,
  className,
  style,
  'data-focus-key': dataFocusKey,
  ...rest
}) => {
  return (
    <StyledCard
      $variant={variant}
      $interactive={interactive}
      $focused={focused}
      $padding={padding}
      onClick={onClick}
      className={className}
      style={style}
      data-focus-key={dataFocusKey}
      {...rest}
    >
      {children}
    </StyledCard>
  );
};
