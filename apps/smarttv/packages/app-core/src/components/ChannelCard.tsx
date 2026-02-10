import React from 'react';
import styled from 'styled-components';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Channel } from '../types';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/designTokens';

const ChannelInfo = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${spacing.md};
  width: 100%;
`;

const ChannelLogoContainer = styled.div`
  flex-shrink: 0;
  position: relative;
`;

const ChannelLogo = styled.img`
  width: 80px;
  height: 80px;
  border-radius: ${borderRadius.lg};
  object-fit: cover;
  box-shadow: ${shadows.dark.sm};
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: ${colors.dark.tertiary};
`;

const ChannelLogoPlaceholder = styled.div`
  width: 80px;
  height: 80px;
  border-radius: ${borderRadius.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, ${colors.dark.tertiary} 0%, ${colors.dark.quaternary} 100%);
  box-shadow: ${shadows.dark.sm};
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: ${typography.fontSize.lg};
  font-weight: ${typography.fontWeight.bold};
  color: ${colors.text.secondary};
`;

const ChannelDetails = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${spacing.sm};
`;

const ChannelName = styled.h3`
  color: ${colors.text.primary};
  font-size: ${typography.fontSize.xl};
  font-weight: ${typography.fontWeight.bold};
  font-family: ${typography.fontFamily.system};
  margin: 0;
  line-height: ${typography.lineHeight.tight};
`;

const ProgramInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.xs};
`;

const ProgramMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.sm};
  flex-wrap: wrap;
`;

const CurrentProgram = styled.div`
  color: ${colors.text.primary};
  font-size: ${typography.fontSize.base};
  font-weight: ${typography.fontWeight.medium};
  font-family: ${typography.fontFamily.system};
  line-height: ${typography.lineHeight.snug};
`;

const ProgramTime = styled.div`
  color: ${colors.text.secondary};
  font-size: ${typography.fontSize.sm};
  font-weight: ${typography.fontWeight.medium};
  font-family: ${typography.fontFamily.system};
  padding: ${spacing.xs} ${spacing.sm};
  background: rgba(255, 255, 255, 0.05);
  border-radius: ${borderRadius.sm};
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const NoDataPlaceholder = styled.div`
  color: ${colors.text.secondary};
  font-size: ${typography.fontSize.sm};
  font-style: italic;
`;

interface ChannelCardProps {
  channel: Channel;
  focused?: boolean;
  onClick?: () => void;
  focusKey?: string;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  focused = false,
  onClick,
  focusKey,
}) => {
  const formatTime = (timeString: string) => {
    try {
      return new Date(timeString).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Invalid time format:', timeString);
      return '--:--';
    }
  };

  const isLive = () => {
    if (!channel.currentProgram?.startTime || !channel.currentProgram?.endTime) {
      return false;
    }
    
    try {
      const now = new Date();
      const startTime = new Date(channel.currentProgram.startTime);
      const endTime = new Date(channel.currentProgram.endTime);
      return now >= startTime && now <= endTime;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Invalid program time format:', channel.currentProgram);
      return false;
    }
  };

  const getChannelInitials = (name: string) => {
    if (!name) return '??';
    
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const hasValidProgram = channel.currentProgram && 
    channel.currentProgram.title && 
    channel.currentProgram.title !== 'Программа недоступна';

  const hasValidLogo = channel.logo && channel.logo.trim() !== '';

  return (
    <Card 
      variant="elevated" 
      interactive 
      focused={focused} 
      onClick={onClick}
      data-focus-key={focusKey}
    >
      <ChannelInfo>
        <ChannelLogoContainer>
          {hasValidLogo ? (
            <ChannelLogo 
              src={channel.logo || ''} 
              alt={channel.name}
              onError={(e) => {
                // Hide broken image and show placeholder
                e.currentTarget.style.display = 'none';
                const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                if (placeholder) {
                  placeholder.style.display = 'flex';
                }
              }}
            />
          ) : null}
          
          <ChannelLogoPlaceholder 
            style={{ display: hasValidLogo ? 'none' : 'flex' }}
          >
            {getChannelInitials(channel.name)}
          </ChannelLogoPlaceholder>
        </ChannelLogoContainer>
        
        <ChannelDetails>
          <ChannelName>{channel.name}</ChannelName>
          
          <ProgramInfo>
            {hasValidProgram ? (
              <>
                <ProgramMeta>
                  <CurrentProgram>{channel.currentProgram.title}</CurrentProgram>
                  {isLive() && <Badge variant="live" pulse>В эфире</Badge>}
                </ProgramMeta>
                
                {channel.currentProgram.startTime && channel.currentProgram.endTime && (
                  <ProgramTime>
                    {formatTime(channel.currentProgram.startTime)} - {formatTime(channel.currentProgram.endTime)}
                  </ProgramTime>
                )}
              </>
            ) : (
              <NoDataPlaceholder>
                Информация о программе загружается...
              </NoDataPlaceholder>
            )}
          </ProgramInfo>
        </ChannelDetails>
      </ChannelInfo>
    </Card>
  );
};
