import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ChannelCard } from '../components/ChannelCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';
import { useChannels } from '../hooks/useChannels';
import { Channel } from '../types';
import { colors, spacing, typography, borderRadius, shadows, gradients } from '../styles/designTokens';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, ${colors.dark.systemBackground} 0%, ${colors.dark.primary} 50%, ${colors.dark.secondary} 100%);
  padding: ${spacing.xxl} ${spacing.xl};
  position: relative;
  
  // Background pattern overlay
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: radial-gradient(circle at 20% 80%, rgba(0, 122, 255, 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, rgba(88, 86, 214, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }
`;

const Content = styled.div`
  position: relative;
  z-index: 1;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: ${spacing.xxxl};
  text-align: center;
`;

const TitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${spacing.md};
`;

const Title = styled.h1`
  color: ${colors.text.primary};
  font-size: ${typography.fontSize['6xl']};
  font-weight: ${typography.fontWeight.black};
  font-family: ${typography.fontFamily.system};
  margin: 0;
  line-height: ${typography.lineHeight.tight};
  background: linear-gradient(135deg, ${colors.text.primary} 0%, ${colors.primary[400]} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  letter-spacing: -0.02em;
`;

const Subtitle = styled.p`
  color: ${colors.text.secondary};
  font-size: ${typography.fontSize.xl};
  font-weight: ${typography.fontWeight.medium};
  font-family: ${typography.fontFamily.system};
  margin: 0;
  line-height: ${typography.lineHeight.relaxed};
  max-width: 600px;
`;

const ChannelGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(480px, 1fr));
  gap: ${spacing.xl};
  margin-bottom: ${spacing.xxl};
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: ${spacing.lg};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: ${spacing.lg};
`;

const LoadingMessage = styled.div`
  color: ${colors.text.secondary};
  font-size: ${typography.fontSize.lg};
  font-weight: ${typography.fontWeight.medium};
  font-family: ${typography.fontFamily.system};
  text-align: center;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: ${spacing.lg};
  text-align: center;
`;

const ErrorMessage = styled.div`
  color: ${colors.error};
  font-size: ${typography.fontSize.xl};
  font-weight: ${typography.fontWeight.medium};
  font-family: ${typography.fontFamily.system};
  margin-bottom: ${spacing.md};
`;

const ErrorDetails = styled.div`
  color: ${colors.text.secondary};
  font-size: ${typography.fontSize.base};
  font-family: ${typography.fontFamily.system};
  margin-bottom: ${spacing.lg};
  max-width: 500px;
`;

const StatsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: ${spacing.xl};
  margin-top: ${spacing.xxl};
  flex-wrap: wrap;
`;

const StatCard = styled.div`
  background: ${gradients.glassDark};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: ${borderRadius.xl};
  padding: ${spacing.lg} ${spacing.xl};
  text-align: center;
  box-shadow: ${shadows.dark.md};
  min-width: 120px;
`;

const StatNumber = styled.div`
  color: ${colors.primary[400]};
  font-size: ${typography.fontSize['3xl']};
  font-weight: ${typography.fontWeight.bold};
  font-family: ${typography.fontFamily.system};
  line-height: ${typography.lineHeight.none};
`;

const StatLabel = styled.div`
  color: ${colors.text.secondary};
  font-size: ${typography.fontSize.sm};
  font-weight: ${typography.fontWeight.medium};
  font-family: ${typography.fontFamily.system};
  margin-top: ${spacing.xs};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

interface HomePageProps {
  onChannelSelect?: (channel: Channel) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onChannelSelect }) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const navigate = useNavigate();
  
  const { channels, status, error, refetch, isLoading, isEmpty } = useChannels({
    autoFetch: true,
    activeOnly: true,
    sortByName: true,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isLoading || channels.length === 0) return;
      
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex(prev => 
            prev < channels.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
          event.preventDefault();
          if (channels[focusedIndex]) {
            handleChannelSelect(channels[focusedIndex]);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [channels, focusedIndex, isLoading]);

  const handleChannelSelect = (channel: Channel) => {
    if (onChannelSelect) {
      onChannelSelect(channel);
    } else {
      // Navigate using slug if available, otherwise use id
      const identifier = channel.slug || channel.id;
      navigate(`/channel/${identifier}`);
    }
  };

  const getLiveChannelsCount = () => {
    const now = new Date();
    return channels.filter(channel => {
      if (!channel.currentProgram?.startTime || !channel.currentProgram?.endTime) {
        return false;
      }
      
      try {
        const startTime = new Date(channel.currentProgram.startTime);
        const endTime = new Date(channel.currentProgram.endTime);
        return now >= startTime && now <= endTime;
      } catch (error) {
        return false;
      }
    }).length;
  };

  const getActiveChannelsCount = () => {
    return channels.filter(channel => channel.isActive !== false).length;
  };

  if (isLoading) {
    return (
      <Container>
        <Content>
          <LoadingContainer>
            <LoadingSpinner size="large" />
            <LoadingMessage>Подключаемся к Adapto Digital TV API...</LoadingMessage>
          </LoadingContainer>
        </Content>
      </Container>
    );
  }

  if (status === 'error') {
    return (
      <Container>
        <Content>
          <ErrorContainer>
            <ErrorMessage>Ошибка подключения к API</ErrorMessage>
            <ErrorDetails>
              {error || 'Не удалось загрузить данные с сервера. Проверьте подключение к интернету и убедитесь, что API сервер запущен.'}
            </ErrorDetails>
            <Button
              variant="primary"
              size="large"
              onClick={refetch}
              focused
            >
              Повторить попытку
            </Button>
          </ErrorContainer>
        </Content>
      </Container>
    );
  }

  if (isEmpty) {
    return (
      <Container>
        <Content>
          <ErrorContainer>
            <ErrorMessage>Нет доступных каналов</ErrorMessage>
            <ErrorDetails>
              API не вернул активных телеканалов. Возможно, сервер не настроен или база данных пуста.
            </ErrorDetails>
            <Button
              variant="secondary"
              size="large"
              onClick={refetch}
              focused
            >
              Обновить
            </Button>
          </ErrorContainer>
        </Content>
      </Container>
    );
  }

  return (
    <Container>
      <Content>
        <Header>
          <TitleContainer>
            <Title>ADAPTO</Title>
            <Subtitle>
              Прямые трансляции телеканалов через Adapto Digital TV API
            </Subtitle>
          </TitleContainer>
        </Header>
        
        <ChannelGrid>
          {channels.map((channel, index) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              focused={index === focusedIndex}
              onClick={() => handleChannelSelect(channel)}
              focusKey={`channel-${channel.id}`}
            />
          ))}
        </ChannelGrid>
        
        <StatsContainer>
          <StatCard>
            <StatNumber>{channels.length}</StatNumber>
            <StatLabel>Каналов</StatLabel>
          </StatCard>
          
          <StatCard>
            <StatNumber>{getLiveChannelsCount()}</StatNumber>
            <StatLabel>В эфире</StatLabel>
          </StatCard>
          
          <StatCard>
            <StatNumber>{getActiveChannelsCount()}</StatNumber>
            <StatLabel>Активных</StatLabel>
          </StatCard>
          
          <StatCard>
            <StatNumber>API</StatNumber>
            <StatLabel>Live Data</StatLabel>
          </StatCard>
        </StatsContainer>
      </Content>
    </Container>
  );
};
