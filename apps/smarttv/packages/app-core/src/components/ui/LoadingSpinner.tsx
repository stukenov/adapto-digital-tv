import React from 'react';
import styled, { keyframes } from 'styled-components';
import { colors, animation } from '../../styles/designTokens';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

const spin = keyframes`
  0% { 
    transform: rotate(0deg); 
  }
  100% { 
    transform: rotate(360deg); 
  }
`;

const SpinnerContainer = styled.div<LoadingSpinnerProps>`
  display: inline-block;
  position: relative;

  width: ${props => {
    switch (props.size) {
      case 'small':
        return '24px';
      case 'large':
        return '64px';
      default:
        return '48px';
    }
  }};

  height: ${props => {
    switch (props.size) {
      case 'small':
        return '24px';
      case 'large':
        return '64px';
      default:
        return '48px';
    }
  }};
`;

const Spinner = styled.div<LoadingSpinnerProps>`
  width: 100%;
  height: 100%;
  border: ${props => {
      const thickness =
        props.size === 'small' ? '2px' : props.size === 'large' ? '4px' : '3px';
      return thickness;
    }}
    solid rgba(255, 255, 255, 0.1);
  border-top: ${props => {
    const thickness =
      props.size === 'small' ? '2px' : props.size === 'large' ? '4px' : '3px';
    const color = props.color || colors.primary[500];
    return `${thickness} solid ${color}`;
  }};
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;

  // Add iOS-style smooth animation
  animation-timing-function: ${animation.easing.easeInOut};
`;

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color,
  ...props
}) => {
  return (
    <SpinnerContainer size={size} {...props}>
      <Spinner size={size} color={color} />
    </SpinnerContainer>
  );
};
