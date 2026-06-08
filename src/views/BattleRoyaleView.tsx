import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BattleRoyaleController, {
  BattleLobbySummary,
  BattleRoyaleRoom,
} from '../controllers/BattleRoyaleController';
import { UserAccount } from '../controllers/AuthController';
import { COLORS, PLACEHOLDER, SPACING } from '../utils/theme';
import { LAYOUT, RADIUS, SHADOW, UI } from '../utils/ui';
import { ScreenHeader, ScreenScroll } from '../components/ScreenLayout';
import { pickThemeMedia, ThemeMedia } from '../utils/themeMediaPicker';
import {
  buildThemeMediaPayload,
  themeLabelFromMedia,
} from '../utils/themeMediaPayload';
import { ThemeMediaSection } from '../components/ThemeMediaSection';
import VoiceController from '../controllers/VoiceController';
import { MAX_VOICE_RECORD_MS } from '../utils/voiceRecorder';
import { resolveRoomHostId } from '../utils/battleRoomHost';
import { getApiMode } from '../utils/api';

type BattleRoyaleViewProps = {
  account: UserAccount;
  navigation: any;
  onBack?: () => void;
  embedded?: boolean;
  onStartBattle: (room: BattleRoyaleRoom) => void;
};

const BattleRoyaleView = ({
  account,
  navigation,
  onBack,
  embedded = false,
  onStartBattle,
}: BattleRoyaleViewProps) => {
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [theme, setTheme] = useState('Culture générale');
  const [themeMedia, setThemeMedia] = useState<ThemeMedia | null>(null);
  const [battleMode, setBattleMode] = useState<'classic' | 'timed_mcq'>(
    'classic',
  );
  const [maxPlayers, setMaxPlayers] = useState('10');
  const [questionCount, setQuestionCount] = useState('5');
  const [eliminationScore, setEliminationScore] = useState('20');
  const [timeLimitSeconds, setTimeLimitSeconds] = useState('15');
  const [joinCode, setJoinCode] = useState('');
  const [battleTab, setBattleTab] = useState<'create' | 'join'>('create');
  const [activeLobbies, setActiveLobbies] = useState<BattleLobbySummary[]>([]);
  const [lobbiesLoading, setLobbiesLoading] = useState(false);
  const [room, setRoom] = useState<BattleRoyaleRoom | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);

  const normalizedQuestionCount = Math.max(
    3,
    Math.min(20, Math.floor(Number(questionCount) || 5)),
  );

  useEffect(() => {
    if (isRecording && recordMs >= MAX_VOICE_RECORD_MS) {
      handleStopRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordMs, isRecording]);

  useEffect(() => {
    getApiMode().then(mode => setIsOfflineMode(mode === 'local'));
  }, []);

  const createRoom = async () => {
    setLoading(true);
    setError('');
    try {
      const nextRoom = await BattleRoyaleController.createRoom(account, {
        mode: battleMode,
        theme,
        maxPlayers: Number(maxPlayers),
        questionCount: normalizedQuestionCount,
        eliminationScore: Number(eliminationScore),
        timeLimitSeconds: Number(timeLimitSeconds),
      });
      setRoom(nextRoom);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation impossible.');
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (codeOverride?: string) => {
    const code = (codeOverride || joinCode).trim().toUpperCase();
    if (!code) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const nextRoom = await BattleRoyaleController.joinRoom(code, account);
      setRoom(nextRoom);
      setJoinCode(code);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Connexion salle impossible.',
      );
    } finally {
      setLoading(false);
    }
  };

  const loadActiveLobbies = async () => {
    setLobbiesLoading(true);
    try {
      setActiveLobbies(await BattleRoyaleController.listActiveRooms(account));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de charger les lobbies actifs.',
      );
    } finally {
      setLobbiesLoading(false);
    }
  };

  const handleStartRecording = async () => {
    setError('');
    try {
      setRecordMs(0);
      setIsRecording(true);
      await VoiceController.startRecording(ms => setRecordMs(ms));
    } catch (err) {
      setIsRecording(false);
      setError(
        err instanceof Error ? err.message : 'Microphone indisponible.',
      );
    }
  };

  const handleStopRecording = async () => {
    setLoading(true);
    setError('');
    try {
      const media = await VoiceController.stopRecording();
      setThemeMedia(media);
      if (!theme.trim() || theme === 'Culture générale') {
        setTheme(themeLabelFromMedia(media));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Enregistrement vocal impossible.',
      );
    } finally {
      setIsRecording(false);
      setLoading(false);
    }
  };

  const handleBattleThemeMedia = async () => {
    setError('');
    try {
      const media = await pickThemeMedia('audio');
      if (!media) return;
      setThemeMedia(media);
      if (!theme.trim() || theme === 'Culture générale') {
        setTheme(themeLabelFromMedia(media));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Chargement audio impossible.',
      );
    }
  };

  const startBattle = async () => {
    if (!room) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const mediaPayload = await buildThemeMediaPayload(themeMedia);
      const activeRoom = await BattleRoyaleController.startRoom(
        room,
        account,
        mediaPayload,
      );
      setRoom(activeRoom);
      onStartBattle(activeRoom);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demarrage impossible.');
    } finally {
      setLoading(false);
    }
  };


  const refreshRoom = async () => {
    if (!room) return;
    setLoading(true);
    setError('');
    try {
      const updatedRoom = await BattleRoyaleController.getRoom(room.code, account);
      setRoom(updatedRoom);
      if (room.status === 'waiting' && updatedRoom.status === 'active') {
        onStartBattle(updatedRoom);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Actualisation impossible.');
    } finally {
      setLoading(false);
    }
  };

  const sendChatMessage = async () => {
    const cleanText = chatText.trim();
    if (!room || !cleanText || loading) return;
    setLoading(true);
    setError('');
    try {
      setRoom(
        await BattleRoyaleController.sendChatMessage(room, account, cleanText),
      );
      setChatText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Message impossible.');
    } finally {
      setLoading(false);
    }
  };

  const deleteLobby = async () => {
    if (!room || loading) return;
    setLoading(true);
    setError('');
    try {
      await BattleRoyaleController.deleteRoom(room, account);
      setRoom(null);
      setChatOpen(false);
      setChatText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (room || battleTab !== 'join') return;
    loadActiveLobbies();
    const interval = setInterval(loadActiveLobbies, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, battleTab, account.id]);

  useEffect(() => {
    if (!room) return;
    if (room.status === 'finished') return;

    const interval = setInterval(async () => {
      try {
        const updatedRoom = await BattleRoyaleController.getRoom(room.code, account);
        if (room.status === 'waiting' && updatedRoom.status === 'active') {
          setRoom(updatedRoom);
          onStartBattle(updatedRoom);
        } else {
          setRoom(updatedRoom);
        }
      } catch {
        // Silently ignore background fetch errors to avoid UI spam
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [room, account, onStartBattle, navigation]);

  return (
    <ScreenScroll contentStyle={styles.container}>
      <ScreenHeader
        title={room ? `Salle ${room.code}` : 'Battle Royale'}
        onBack={onBack}
        showBack={!embedded && Boolean(onBack)}
      />
      <Text style={styles.subtitle}>
        {room
          ? 'Attends que tous les joueurs soient connectés dans le lobby, discute dans le chat et prépare-toi !'
          : battleTab === 'create'
          ? 'Mode classique : configure ton lobby et invite les joueurs avec le code.'
          : 'Rejoins un lobby existant ou choisis-en un dans la liste des parties actives.'}
      </Text>

      {!room ? (
        <>
          <View style={styles.tabRow}>
            <ModeChip
              active={battleTab === 'create'}
              label="Créer un lobby"
              onPress={() => setBattleTab('create')}
              style={styles.tabChip}
            />
            <ModeChip
              active={battleTab === 'join'}
              label="Rejoindre"
              onPress={() => setBattleTab('join')}
              style={styles.tabChip}
            />
          </View>

          {battleTab === 'create' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Lobby classique</Text>
            <FieldLabel label="Thème du jeu">
              <TextInput
                style={styles.input}
                placeholder="Ex: React Native, capitales, sport..."
                placeholderTextColor={PLACEHOLDER}
                value={theme}
                onChangeText={setTheme}
              />
            </FieldLabel>
            <ThemeMediaSection
              themeMedia={themeMedia}
              loading={loading}
              isRecording={isRecording}
              recordDurationLabel={VoiceController.formatDuration(recordMs)}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              onPickAudio={handleBattleThemeMedia}
              onPickImage={handleBattleThemeMedia}
              onPickDocument={handleBattleThemeMedia}
              onPickAny={handleBattleThemeMedia}
              onRemove={() => setThemeMedia(null)}
            />
            <Text style={styles.optionLabel}>Mode de jeu</Text>
            <View style={styles.segmentedRow}>
              <ModeChip
                active={battleMode === 'classic'}
                label="Classique"
                onPress={() => setBattleMode('classic')}
              />
              <ModeChip
                active={battleMode === 'timed_mcq'}
                label="QCM chronométré"
                onPress={() => setBattleMode('timed_mcq')}
              />
            </View>
            <View style={styles.row}>
              <FieldLabel label="Nombre maximum de joueurs" style={styles.smallInput}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor={PLACEHOLDER}
                  value={maxPlayers}
                  onChangeText={setMaxPlayers}
                />
              </FieldLabel>
              <FieldLabel label="Nombre de questions" style={styles.smallInput}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="5"
                  placeholderTextColor={PLACEHOLDER}
                  value={questionCount}
                  onChangeText={value => setQuestionCount(clampNumber(value, 3, 20))}
                />
              </FieldLabel>
            </View>
            <FieldLabel label="Score minimum pour survivre">
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="20"
                placeholderTextColor={PLACEHOLDER}
                value={eliminationScore}
                onChangeText={setEliminationScore}
              />
            </FieldLabel>
            {battleMode === 'timed_mcq' ? (
              <FieldLabel label="Temps par question (secondes)">
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="15"
                  placeholderTextColor={PLACEHOLDER}
                  value={timeLimitSeconds}
                  onChangeText={setTimeLimitSeconds}
                />
              </FieldLabel>
            ) : null}
            <TouchableOpacity style={styles.primaryButton} onPress={createRoom}>
              <Text style={styles.primaryButtonText}>Créer la salle</Text>
            </TouchableOpacity>
          </View>
          ) : (
          <View style={styles.card}>
            <View style={styles.joinHeader}>
              <Text style={styles.sectionTitle}>Rejoindre un lobby</Text>
              <TouchableOpacity
                style={styles.refreshChip}
                onPress={loadActiveLobbies}
                disabled={lobbiesLoading}
              >
                <Text style={styles.refreshChipText}>
                  {lobbiesLoading ? '...' : 'Actualiser'}
                </Text>
              </TouchableOpacity>
            </View>
            <FieldLabel label="Code de salle">
              <TextInput
                style={styles.input}
                autoCapitalize="characters"
                placeholder="Ex: A1B2C3"
                placeholderTextColor={PLACEHOLDER}
                value={joinCode}
                onChangeText={setJoinCode}
              />
            </FieldLabel>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => joinRoom()}
            >
              <Text style={styles.secondaryButtonText}>Rejoindre avec le code</Text>
            </TouchableOpacity>

            <Text style={styles.lobbyListTitle}>Lobbies actifs</Text>
            {lobbiesLoading && !activeLobbies.length ? (
              <ActivityIndicator color={COLORS.primary} style={styles.loader} />
            ) : null}
            {!lobbiesLoading && !activeLobbies.length ? (
              <Text style={styles.lobbyEmpty}>
                Aucun lobby en attente ou en cours pour le moment.
              </Text>
            ) : null}
            {activeLobbies.map(lobby => (
              <TouchableOpacity
                key={lobby.code}
                style={[
                  styles.lobbyCard,
                  lobby.status === 'active' && styles.lobbyCardDisabled,
                ]}
                onPress={() => {
                  if (lobby.status !== 'waiting') {
                    setError('Cette partie a déjà commencé. Choisis un lobby en attente.');
                    return;
                  }
                  joinRoom(lobby.code);
                }}
              >
                <View style={styles.lobbyCardTop}>
                  <Text style={styles.lobbyTheme} numberOfLines={1}>
                    {lobby.theme}
                  </Text>
                  <Text
                    style={[
                      styles.lobbyStatus,
                      lobby.status === 'active'
                        ? styles.lobbyStatusActive
                        : styles.lobbyStatusWaiting,
                    ]}
                  >
                    {lobby.status === 'active' ? 'En cours' : 'En attente'}
                  </Text>
                </View>
                <Text style={styles.lobbyMeta}>
                  Code {lobby.code} · {lobby.playerCount}/{lobby.maxPlayers}{' '}
                  joueurs
                </Text>
                <Text style={styles.lobbyMeta}>
                  Hôte {lobby.hostName} ·{' '}
                  {lobby.mode === 'timed_mcq' ? 'QCM chrono' : 'Classique'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          )}
        </>
      ) : (
        <View style={styles.roomCard}>
          <Text style={styles.roomCode}>Code: {room.code}</Text>
          <Text style={styles.roomInfo}>Statut: {room.status}</Text>
          <Text style={styles.roomInfo}>
            Thème: {room.config.theme} | Questions prévues: {room.config.questionCount}
          </Text>
          <Text style={styles.roomInfo}>
            Mode: {room.config.mode === 'timed_mcq' ? 'QCM chronométré' : 'Classique'}
          </Text>
          <Text style={styles.roomInfo}>
            Survivre si score {'>='} {room.config.eliminationScore}
            {room.config.mode === 'timed_mcq'
              ? ` · ${room.config.timeLimitSeconds}s/question`
              : ''}
          </Text>
          <Text style={styles.sectionTitle}>Joueurs</Text>
          {room.players.map(player => {
            const hostId = resolveRoomHostId(room);
            const isHost = player.userId === hostId;
            let statusText = 'en attente';
            if (room.status === 'waiting') {
              statusText = isHost ? 'dans le lobby (propriétaire)' : 'dans le lobby';
            } else if (room.status === 'active') {
              statusText = player.finished ? `${player.score} pts` : 'en cours de jeu';
            } else if (room.status === 'finished') {
              statusText = `${player.score} pts`;
            }
            return (
              <Text key={player.userId} style={styles.playerLine}>
                {player.displayName} - {statusText}
              </Text>
            );
          })}
          <View style={styles.lobbyActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={refreshRoom}>
              <Text style={styles.secondaryButtonText}>Actualiser lobby</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setChatOpen(previous => !previous)}
            >
              <Text style={styles.secondaryButtonText}>
                {chatOpen ? 'Fermer le chat' : 'Ouvrir le chat'}
              </Text>
            </TouchableOpacity>
          </View>

          {chatOpen && room.status === 'waiting' ? (
            <View style={styles.chatCard}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatTitle}>Chat du lobby</Text>
                <Text style={styles.chatHint}>
                  L'historique est remis à zéro quand le jeu démarre.
                </Text>
              </View>
              <ScrollView style={styles.chatScrollView} contentContainerStyle={styles.chatScrollContent}>
                {(room.chatMessages || []).length ? (
                  (room.chatMessages || []).map(message => {
                    const isMe = message.userId === account.id;
                    return (
                      <View key={message.id} style={[styles.chatMessage, isMe ? styles.chatMessageMe : styles.chatMessageOther]}>
                        {!isMe && <Text style={styles.chatAuthor}>{message.displayName}</Text>}
                        <Text style={styles.chatText}>{message.text}</Text>
                        <Text style={styles.chatTime}>
                          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.chatEmpty}>Aucun message pour le moment.</Text>
                )}
              </ScrollView>
              <View style={styles.chatInputRow}>
                <TextInput
                  style={styles.chatInputWhatsApp}
                  maxLength={500}
                  placeholder="Message..."
                  placeholderTextColor="#8696A0"
                  value={chatText}
                  onChangeText={setChatText}
                />
                <TouchableOpacity
                  style={[styles.sendButtonWhatsApp, !chatText.trim() && styles.disabledButton]}
                  disabled={!chatText.trim()}
                  onPress={sendChatMessage}
                >
                  <Text style={styles.sendButtonWhatsAppText}>▶</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
          {chatOpen && room.status !== 'waiting' ? (
            <Text style={styles.chatHint}>
              Le chat est fermé car la partie a déjà démarré.
            </Text>
          ) : null}

          {(() => {
            const hostId = resolveRoomHostId(room);
            const isHost = hostId === account.id;
            const isPlayer = room.players.some(
              player => player.userId === account.id,
            );
            const canLaunch =
              room.status === 'waiting' &&
              (isOfflineMode ? isPlayer : isHost);
            const waitingForHost =
              room.status === 'waiting' && isPlayer && !isHost && !isOfflineMode;

            return (
              <>
                {canLaunch ? (
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={startBattle}
                  >
                    <Text style={styles.primaryButtonText}>
                      Lancer le battle
                    </Text>
                  </TouchableOpacity>
                ) : waitingForHost ? (
                  <View style={styles.waitingForHostContainer}>
                    <Text style={styles.waitingForHostText}>
                      En attente du lancement par le créateur de la salle...
                    </Text>
                  </View>
                ) : null}
                {isHost ? (
                  <TouchableOpacity
                    style={styles.dangerButton}
                    onPress={deleteLobby}
                  >
                    <Text style={styles.primaryButtonText}>
                      Supprimer le lobby
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.dangerButton}
                    onPress={() => setRoom(null)}
                  >
                    <Text style={styles.primaryButtonText}>
                      Quitter la salle
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            );
          })()}
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScreenScroll>
  );
};


const FieldLabel = ({
  children,
  label,
  style,
}: {
  children: React.ReactNode;
  label: string;
  style?: object;
}) => (
  <View style={[styles.fieldGroup, style]}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {children}
  </View>
);

const clampNumber = (value: string, min: number, max: number) => {
  const numeric = Math.max(min, Math.min(max, Math.floor(Number(value) || min)));
  return String(numeric);
};

const ModeChip = ({
  active,
  label,
  onPress,
  style,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  style?: object;
}) => (
  <TouchableOpacity
    style={[styles.modeChip, active && styles.modeChipActive, style]}
    onPress={onPress}
  >
    <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: LAYOUT.screenPaddingH,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: LAYOUT.sectionGap,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: UI.line,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 12,
    marginBottom: LAYOUT.sectionGap,
    padding: SPACING.lg,
    ...SHADOW.card,
  },
  roomCard: {
    backgroundColor: COLORS.backgroundSoft,
    borderColor: UI.chipBorder,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 10,
    marginBottom: LAYOUT.sectionGap,
    padding: SPACING.lg,
    ...SHADOW.soft,
  },
  lobbyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chatCard: {
    backgroundColor: '#eef3ff',
    borderColor: '#dfe7f5',
    borderRadius: 16,
    borderWidth: 1,
    height: 400,
    overflow: 'hidden',
  },
  chatHeader: {
    backgroundColor: '#1d4ed8',
    padding: 12,
  },
  chatTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
  chatHint: {
    color: '#c9d9f7',
    fontSize: 12,
    lineHeight: 18,
  },
  chatScrollView: {
    flex: 1,
  },
  chatScrollContent: {
    padding: 12,
    gap: 8,
  },
  chatMessage: {
    borderRadius: 12,
    padding: 8,
    paddingHorizontal: 12,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  chatMessageMe: {
    backgroundColor: '#d8e4fb',
    alignSelf: 'flex-end',
    borderTopRightRadius: 0,
  },
  chatMessageOther: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    borderTopLeftRadius: 0,
  },
  chatAuthor: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  chatText: {
    color: '#0f1c44',
    fontSize: 14,
  },
  chatTime: {
    color: '#667781',
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  chatEmpty: {
    color: '#5E6C84',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 12,
    alignSelf: 'center',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#e2ecff',
    gap: 8,
  },
  chatInputWhatsApp: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f1c44',
  },
  sendButtonWhatsApp: {
    backgroundColor: '#2563eb',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonWhatsAppText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 2,
  },
  dangerButton: {
    alignItems: 'center',
    backgroundColor: COLORS.error,
    borderRadius: 10,
    padding: 15,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  helpText: {
    color: '#5E6C84',
    lineHeight: 20,
  },
  optionLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: LAYOUT.sectionGap,
  },
  tabChip: {
    flex: 1,
  },
  joinHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  refreshChip: {
    backgroundColor: UI.chipBg,
    borderColor: UI.chipBorder,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  refreshChipText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  lobbyListTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  lobbyEmpty: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  lobbyCard: {
    backgroundColor: COLORS.backgroundSoft,
    borderColor: UI.line,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  lobbyCardDisabled: {
    opacity: 0.72,
  },
  lobbyCardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  lobbyTheme: {
    color: COLORS.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  lobbyStatus: {
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  lobbyStatusWaiting: {
    backgroundColor: UI.chipBg,
    color: COLORS.primary,
  },
  lobbyStatusActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    color: COLORS.primarySoft,
  },
  lobbyMeta: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  segmentedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeChip: {
    borderColor: '#dfe7f5',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  modeChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modeChipText: {
    color: COLORS.text,
    fontWeight: '800',
  },
  modeChipTextActive: {
    color: COLORS.textOnDark,
  },
  fieldGroup: {
    gap: 7,
  },
  fieldLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderColor: UI.line,
    borderRadius: 10,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: 16,
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  smallInput: {
    flex: 1,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    padding: 15,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: COLORS.primary,
    borderRadius: 10,
    borderWidth: 1,
    padding: 15,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.55,
  },
  roomCode: {
    color: COLORS.primary,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  roomInfo: {
    color: COLORS.text,
  },
  roomStatus: {
    color: COLORS.success,
    fontWeight: '900',
    textAlign: 'center',
  },
  playerLine: {
    color: COLORS.text,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 12,
  },
  error: {
    color: COLORS.error,
    fontWeight: '700',
    marginVertical: 12,
    textAlign: 'center',
  },
  waitingForHostContainer: {
    backgroundColor: UI.surfaceSoft,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    alignItems: 'center',
  },
  waitingForHostText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default BattleRoyaleView;
