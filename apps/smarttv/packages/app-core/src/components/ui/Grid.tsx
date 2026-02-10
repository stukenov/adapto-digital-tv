import React from 'react';
import styled, { css } from 'styled-components';
import { spacing } from '../../styles/designTokens';

interface GridProps {
  children: React.ReactNode;
  columns?: number;
  minItemWidth?: string;
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  className?: string;
  style?: React.CSSProperties;
}

interface StyledGridProps {
  $columns?: number;
  $minItemWidth?: string;
  $gap: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}

const StyledGrid = styled.div<StyledGridProps>`
  display: grid;
  width: 100%;
  
  ${({ $columns, $minItemWidth }) => {
    if ($columns) {
      return css`
        grid-template-columns: repeat(${$columns}, 1fr);
      `;
    } else if ($minItemWidth) {
      return css`
        grid-template-columns: repeat(auto-fit, minmax(${$minItemWidth}, 1fr));
      `;
    } else {
      return css`
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      `;
    }
  }}
  
  ${({ $gap }) => {
    const gapMap = {
      xs: spacing.xs,
      sm: spacing.sm,
      md: spacing.md,
      lg: spacing.lg,
      xl: spacing.xl,
      xxl: spacing.xxl,
    };
    return css`
      gap: ${gapMap[$gap]};
    `;
  }}
  
  // Responsive adjustments
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: ${spacing.md};
  }
  
  @media (max-width: 480px) {
    gap: ${spacing.sm};
  }
`;

export const Grid: React.FC<GridProps> = ({
  children,
  columns,
  minItemWidth,
  gap = 'md',
  className,
  style,
  ...rest
}) => {
  return (
    <StyledGrid
      $columns={columns}
      $minItemWidth={minItemWidth}
      $gap={gap}
      className={className}
      style={style}
      {...rest}
    >
      {children}
    </StyledGrid>
  );
};
