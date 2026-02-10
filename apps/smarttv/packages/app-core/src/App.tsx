import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { createGlobalStyle } from 'styled-components';
import { HomePage } from './pages/HomePage';
import { ChannelPage } from './pages/ChannelPage';
import { colors, typography } from './styles/designTokens';

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    font-size: 16px;
    -webkit-text-size-adjust: 100%;
    -ms-text-size-adjust: 100%;
  }

  body {
    font-family: ${typography.fontFamily.system};
    font-weight: ${typography.fontWeight.normal};
    line-height: ${typography.lineHeight.normal};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    background: ${colors.dark.systemBackground};
    color: ${colors.text.primary};
    overflow-x: hidden;
    
    // Prevent blue highlight on touch devices
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  html, body, #root {
    height: 100%;
    min-height: 100vh;
  }

  #root {
    display: flex;
    flex-direction: column;
  }

  // Improved focus styles for accessibility
  *:focus {
    outline: none;
  }

  *:focus-visible {
    outline: 2px solid ${colors.primary[500]};
    outline-offset: 2px;
    border-radius: 4px;
  }

  // Remove default button and input styles
  button, input, textarea, select {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    border: none;
    background: none;
    outline: none;
  }

  button {
    cursor: pointer;
  }

  // Improved scrollbar styles
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${colors.dark.secondary};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: ${colors.dark.quaternary};
    border-radius: 4px;
    transition: background 0.2s ease;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${colors.dark.quinary};
  }

  // Firefox scrollbar
  html {
    scrollbar-width: thin;
    scrollbar-color: ${colors.dark.quaternary} ${colors.dark.secondary};
  }

  // Image optimization
  img {
    max-width: 100%;
    height: auto;
    display: block;
  }

  // Links
  a {
    color: ${colors.primary[400]};
    text-decoration: none;
    transition: color 0.2s ease;
  }

  a:hover {
    color: ${colors.primary[300]};
  }

  // Selection styles
  ::selection {
    background: ${colors.primary[500]};
    color: ${colors.text.primary};
  }

  ::-moz-selection {
    background: ${colors.primary[500]};
    color: ${colors.text.primary};
  }

  // Typography improvements
  h1, h2, h3, h4, h5, h6 {
    font-family: ${typography.fontFamily.system};
    font-weight: ${typography.fontWeight.bold};
    line-height: ${typography.lineHeight.tight};
    color: ${colors.text.primary};
    margin: 0;
  }

  p {
    margin: 0;
    line-height: ${typography.lineHeight.relaxed};
  }

  // Motion preferences
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  // High contrast mode support
  @media (prefers-contrast: high) {
    * {
      text-shadow: none !important;
      box-shadow: none !important;
    }
  }

  // Dark mode enhancements
  @media (prefers-color-scheme: dark) {
    html {
      color-scheme: dark;
    }
  }

  // Performance optimizations
  * {
    -webkit-transform: translateZ(0);
    -moz-transform: translateZ(0);
    -ms-transform: translateZ(0);
    -o-transform: translateZ(0);
    transform: translateZ(0);
  }

  // TV-specific optimizations
  @media screen and (min-width: 1920px) {
    html {
      font-size: 18px;
    }
  }

  @media screen and (min-width: 3840px) {
    html {
      font-size: 24px;
    }
  }
`;

export const App: React.FC = () => {
  return (
    <>
      <GlobalStyle />
      <Router>
        <Routes>
          <Route path='/' element={<HomePage />} />
          <Route path='/channel/:channelId' element={<ChannelPage />} />
        </Routes>
      </Router>
    </>
  );
};
