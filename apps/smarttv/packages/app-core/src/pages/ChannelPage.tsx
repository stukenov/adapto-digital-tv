import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Badge, Grid } from '../components/ui';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { usePlayer } from '../hooks/usePlayer';
import { useChannels } from '../hooks/useChannels';
import { Channel, Program } from '../types';
import { colors, spacing, typography, borderRadius, shadows, gradients } from '../styles/designTokens';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, ${colors.dark.systemBackground} 0%, ${colors.dark.primary} 50%, ${colors.dark.secondary} 100%);
  padding: ${spacing.xl};
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: radial-gradient(circle at 30% 70%, rgba(0, 122, 255, 0.08) 0%, transparent 50%);
    pointer-events: none;
  }
`;

const Content = styled.div`
  position: relative;
  z-index: 1;
  max-width: 1400px;
  margin: 0 auto;
`;

const PlayerSection = styled.section`
  margin-bottom: ${spacing.xxxl};
`;

const VideoContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto ${spacing.xl};
  border-radius: ${borderRadius.xxxl};
  overflow: hidden;
  box-shadow: ${shadows.dark.xl};
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const VideoPlayer = styled.video`
  width: 100%;
  height: auto;
  aspect-ratio: 16/9;
  background: ${colors.dark.systemBackground};
  display: block;
`;

const VideoOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${gradients.overlay};
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  
  &.visible {
    opacity: 1;
  }
`;

const ChannelInfo = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${spacing.xl};
  max-width: 1200px;
  margin: 0 auto;
`;

const ChannelLogoContainer = styled.div`
  flex-shrink: 0;
`;

const ChannelLogo = styled.img`
  width: 140px;
  height: 140px;
  border-radius: ${borderRadius.xl};
  object-fit: cover;
  box-shadow: ${shadows.dark.lg};
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ChannelLogoPlaceholder = styled.div`
  width: 140px;
  height: 140px;
  border-radius: ${borderRadius.xl};
  background: linear-gradient(135deg, ${colors.dark.tertiary} 0%, ${colors.dark.quaternary} 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${typography.fontSize['2xl']};
  font-weight: ${typography.fontWeight.bold};
  color: ${colors.text.secondary};
  box-shadow: ${shadows.dark.lg};
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ChannelDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const ChannelName = styled.h1`
  color: ${colors.text.primary};
  font-size: ${typography.fontSize['5xl']};
  font-weight: ${typography.fontWeight.black};
  font-family: ${typography.fontFamily.system};
  margin: 0 0 ${spacing.md} 0;
  line-height: ${typography.lineHeight.tight};
`;

const ProgramHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.md};
  margin-bottom: ${spacing.sm};
  flex-wrap: wrap;
`;

const CurrentProgram = styled.h2`
  color: ${colors.text.primary};
  font-size: ${typography.fontSize['2xl']};
  font-weight: ${typography.fontWeight.semibold};
  font-family: ${typography.fontFamily.system};
  margin: 0;
  line-height: ${typography.lineHeight.snug};
`;

const ProgramDescription = styled.p`
  color: ${colors.text.secondary};
  font-size: ${typography.fontSize.lg};
  font-weight: ${typography.fontWeight.normal};
  font-family: ${typography.fontFamily.system};
  line-height: ${typography.lineHeight.relaxed};
  margin: 0 0 ${spacing.lg} 0;
`;

const Controls = styled.div`
  display: flex;
  gap: ${spacing.md};
  flex-wrap: wrap;
`;

const Section = styled.section`
  margin: ${spacing.xxxl} auto;
  max-width: 1200px;
`;

const SectionTitle = styled.h2`
  color: ${colors.text.primary};
  font-size: ${typography.fontSize['3xl']};
  font-weight: ${typography.fontWeight.bold};
  font-family: ${typography.fontFamily.system};
  margin: 0 0 ${spacing.xl} 0;
  line-height: ${typography.lineHeight.tight};
`;

const ScheduleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.md};
`;

const ProgramCard = styled(Card)`
  padding: ${spacing.lg};
`;

const ProgramCardContent = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${spacing.lg};
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${spacing.md};
  }
`;

const ProgramTime = styled.div`
  color: ${colors.primary[400]};
  font-size: ${typography.fontSize.lg};
  font-weight: ${typography.fontWeight.semibold};
  font-family: ${typography.fontFamily.system};
  min-width: 140px;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    min-width: auto;
  }
`;

const ProgramInfoContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ProgramTitle = styled.h3`
  color: ${colors.text.primary};
  font-size: ${typography.fontSize.xl};
  font-weight: ${typography.fontWeight.semibold};
  font-family: ${typography.fontFamily.system};
  margin: 0 0 ${spacing.xs} 0;
  line-height: ${typography.lineHeight.snug};
`;

const ProgramDesc = styled.p`
  color: ${colors.text.secondary};
  font-size: ${typography.fontSize.base};
  font-weight: ${typography.fontWeight.normal};
  font-family: ${typography.fontFamily.system};
  line-height: ${typography.lineHeight.relaxed};
  margin: 0;
`;

const MiniChannelCard = styled(Card)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${spacing.md};
  text-align: center;
  transition: all 0.3s ease;
`;

const MiniChannelLogo = styled.img`
  width: 80px;
  height: 80px;
  border-radius: ${borderRadius.lg};
  object-fit: cover;
  box-shadow: ${shadows.dark.sm};
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const MiniChannelLogoPlaceholder = styled.div`
  width: 80px;
  height: 80px;
  border-radius: ${borderRadius.lg};
  background: linear-gradient(135deg, ${colors.dark.tertiary} 0%, ${colors.dark.quaternary} 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${typography.fontSize.lg};
  font-weight: ${typography.fontWeight.bold};
  color: ${colors.text.secondary};
  box-shadow: ${shadows.dark.sm};
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const MiniChannelName = styled.h4`
  color: ${colors.text.primary};
  font-size: ${typography.fontSize.sm};
  font-weight: ${typography.fontWeight.semibold};
  font-family: ${typography.fontFamily.system};
  margin: 0;
  line-height: ${typography.lineHeight.snug};
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

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: ${spacing.lg};
`;

export const ChannelPage: React.FC = () => {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedElement, setFocusedElement] = useState<'play' | 'back' | number>(0);

  const { channels, getChannelWithSchedule, isLoading: channelsLoading } = useChannels({ autoFetch: true });
  
  const { videoRef, playerState, togglePlayPause, error: playerError } = usePlayer({
    src: channel?.streamUrl,
    autoPlay: false,
    onError: (error) => {
      // eslint-disable-next-line no-console
      console.error('Player error:', error);
    },
  });

  // Load channel data
  useEffect(() => {
    const loadChannel = async () => {
      if (!channelId) {
        setError('Channel ID не указан в URL');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Try to get channel with schedule using slug
        const channelWithSchedule = await getChannelWithSchedule(channelId);
        
        if (channelWithSchedule) {
          setChannel(channelWithSchedule);
        } else {
          // Fallback: find channel in loaded channels by ID or slug
          const foundChannel = channels.find(c => c.id === channelId || c.slug === channelId);
          if (foundChannel) {
            setChannel(foundChannel);
          } else {
            setError(`Канал '${channelId}' не найден в API`);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка API';
        setError(`Ошибка загрузки канала: ${errorMessage}`);
        // eslint-disable-next-line no-console
        console.error('Failed to load channel:', err);
      } finally {
        setLoading(false);
      }
    };

    // Wait for channels to load before trying to load specific channel
    if (!channelsLoading) {
      loadChannel();
    }
  }, [channelId, getChannelWithSchedule, channels, channelsLoading]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (loading || channelsLoading) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (typeof focusedElement === 'number') {
            const otherChannels = channels.filter(c => c.id !== channel?.id);
            setFocusedElement(prev => 
              typeof prev === 'number' && prev < otherChannels.length - 1 ? prev + 1 : prev
            );
          } else {
            setFocusedElement(0);
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (typeof focusedElement === 'number') {
            if (focusedElement > 0) {
              setFocusedElement(prev => typeof prev === 'number' ? prev - 1 : 0);
            } else {
              setFocusedElement('play');
            }
          } else {
            setFocusedElement('back');
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (focusedElement === 'play') {
            setFocusedElement('back');
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (focusedElement === 'back') {
            setFocusedElement('play');
          }
          break;
        case 'Enter':
          event.preventDefault();
          if (focusedElement === 'play') {
            togglePlayPause();
          } else if (focusedElement === 'back') {
            navigate('/');
          } else if (typeof focusedElement === 'number') {
            const otherChannels = channels.filter(c => c.id !== channel?.id);
            const selectedChannel = otherChannels[focusedElement];
            if (selectedChannel) {
              const identifier = selectedChannel.slug || selectedChannel.id;
              navigate(`/channel/${identifier}`);
            }
          }
          break;
        case 'Escape':
          event.preventDefault();
          navigate('/');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedElement, channels, channel, navigate, togglePlayPause, loading, channelsLoading]);

  const formatTime = (timeString: string) => {
    try {
      return new Date(timeString).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '--:--';
    }
  };

  const isLive = () => {
    if (!channel?.currentProgram?.startTime || !channel?.currentProgram?.endTime) {
      return false;
    }
    
    try {
      const now = new Date();
      const startTime = new Date(channel.currentProgram.startTime);
      const endTime = new Date(channel.currentProgram.endTime);
      return now >= startTime && now <= endTime;
    } catch (error) {
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

  const otherChannels = channels.filter(c => c.id !== channel?.id && c.isActive !== false);

  if (loading || channelsLoading) {
    return (
      <Container>
        <Content>
          <LoadingContainer>
            <LoadingSpinner size="large" />
            <div style={{ color: colors.text.secondary }}>
              {channelsLoading ? 'Загружаем список каналов...' : 'Загружаем данные канала...'}
            </div>
          </LoadingContainer>
        </Content>
      </Container>
    );
  }

  if (error || !channel) {
    return (
      <Container>
        <Content>
          <ErrorContainer>
            <ErrorMessage>
              {error || 'Канал не найден в API'}
            </ErrorMessage>
            <Button
              variant="primary"
              size="large"
              onClick={() => navigate('/')}
              focused
            >
              Вернуться к списку каналов
            </Button>
          </ErrorContainer>
        </Content>
      </Container>
    );
  }

  return (
    <Container>
      <Content>
        <PlayerSection>
          <VideoContainer>
            <VideoPlayer ref={videoRef} />
            <VideoOverlay className={playerError ? 'visible' : ''} />
          </VideoContainer>
          
          {playerError && (
            <ErrorMessage style={{ textAlign: 'center', marginTop: spacing.md }}>
              Ошибка воспроизведения: {playerError}
            </ErrorMessage>
          )}
          
          <ChannelInfo>
            <ChannelLogoContainer>
              {channel.logo ? (
                <ChannelLogo 
                  src={channel.logo} 
                  alt={channel.name}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                    if (placeholder) {
                      placeholder.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              
              <ChannelLogoPlaceholder 
                style={{ display: channel.logo ? 'none' : 'flex' }}
              >
                {getChannelInitials(channel.name)}
              </ChannelLogoPlaceholder>
            </ChannelLogoContainer>
            
            <ChannelDetails>
              <ChannelName>{channel.name}</ChannelName>
              
              <ProgramHeader>
                <CurrentProgram>
                  {channel.currentProgram?.title || 'Программа не указана'}
                </CurrentProgram>
                {isLive() && <Badge variant="live" pulse>В эфире</Badge>}
              </ProgramHeader>
              
              <ProgramDescription>
                {channel.currentProgram?.description || channel.description || 'Описание недоступно'}
              </ProgramDescription>
              
              <Controls>
                <Button
                  focused={focusedElement === 'play'}
                  onClick={togglePlayPause}
                  variant="primary"
                  size="large"
                  focusKey="play-button"
                >
                  {playerState.isPlaying ? 'Пауза' : 'Смотреть'}
                </Button>
                <Button
                  focused={focusedElement === 'back'}
                  onClick={() => navigate('/')}
                  variant="secondary"
                  size="large"
                  focusKey="back-button"
                >
                  Назад к каналам
                </Button>
              </Controls>
            </ChannelDetails>
          </ChannelInfo>
        </PlayerSection>

        {channel.schedule && channel.schedule.length > 1 && (
          <Section>
            <SectionTitle>Программа передач</SectionTitle>
            <ScheduleList>
              {channel.schedule.map((program: Program) => (
                <ProgramCard key={program.id} variant="elevated">
                  <ProgramCardContent>
                    <ProgramTime>
                      {formatTime(program.startTime)} - {formatTime(program.endTime)}
                    </ProgramTime>
                    <ProgramInfoContent>
                      <ProgramTitle>{program.title}</ProgramTitle>
                      {program.description && (
                        <ProgramDesc>{program.description}</ProgramDesc>
                      )}
                    </ProgramInfoContent>
                  </ProgramCardContent>
                </ProgramCard>
              ))}
            </ScheduleList>
          </Section>
        )}

        {otherChannels.length > 0 && (
          <Section>
            <SectionTitle>Другие каналы</SectionTitle>
            <Grid minItemWidth="200px" gap="md">
              {otherChannels.map((otherChannel, index) => (
                <MiniChannelCard
                  key={otherChannel.id}
                  focused={typeof focusedElement === 'number' && focusedElement === index}
                  onClick={() => {
                    const identifier = otherChannel.slug || otherChannel.id;
                    navigate(`/channel/${identifier}`);
                  }}
                  variant="glass"
                  interactive
                  data-focus-key={`other-channel-${otherChannel.id}`}
                >
                  {otherChannel.logo ? (
                    <MiniChannelLogo 
                      src={otherChannel.logo} 
                      alt={otherChannel.name}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                        if (placeholder) {
                          placeholder.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  
                  <MiniChannelLogoPlaceholder 
                    style={{ display: otherChannel.logo ? 'none' : 'flex' }}
                  >
                    {getChannelInitials(otherChannel.name)}
                  </MiniChannelLogoPlaceholder>
                  
                  <MiniChannelName>{otherChannel.name}</MiniChannelName>
                </MiniChannelCard>
              ))}
            </Grid>
          </Section>
        )}
      </Content>
    </Container>
  );
};
