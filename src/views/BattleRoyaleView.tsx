import React, { useState, useEffect } from 'react';
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
  BattleRoyaleRoom,
} from '../controllers/BattleRoyaleController';
import { UserAccount } from '../controllers/AuthController';
import { COLORS, SPACING } from '../utils/theme';
import { pickThemeMedia, ThemeMedia } from '../utils/themeMediaPicker';
import {
  buildThemeMediaPayload,
  themeLabelFromMedia,
} from '../utils/themeMediaPayload';
import { ThemeMediaSection } from '../components/ThemeMediaSection';
import VoiceController from '../controllers/VoiceController';

type BattleRoyaleViewProps = {
  account: UserAccount;
  navigation: any;
  onBack: () => void;
  onStartBattle: (room: BattleRoyaleRoom) => void;
};

const BattleRoyaleView = ({
  account,
  navigation,
  onBack,
  onStartBattle,
}: BattleRoyaleViewProps) => {
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

  const joinRoom = async () => {
    if (!joinCode.trim()) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const nextRoom = await BattleRoyaleController.joinRoom(joinCode, account);
      setRoom(nextRoom);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Connexion salle impossible.',
      );
    } finally {
      setLoading(false);
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {room ? `Salle : ${room.code}` : 'Battle Royale'}
      </Text>
      <Text style={styles.subtitle}>
        {room
          ? 'Attends que tous les joueurs soient connectés dans le lobby, discute dans le chat et prépare-toi !'
          : 'Configure une salle, invite les joueurs avec le code, puis lance le quiz.'}
      </Text>

      {!room ? (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Créer une salle</Text>
            <FieldLabel label="Thème du jeu">
              <TextInput
                style={styles.input}
                placeholder="Ex: React Native, capitales, sport..."
                placeholderTextColor="#6B778C"
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
                  placeholderTextColor="#6B778C"
                  value={maxPlayers}
                  onChangeText={setMaxPlayers}
                />
              </FieldLabel>
              <FieldLabel label="Nombre de questions" style={styles.smallInput}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="5"
                  placeholderTextColor="#6B778C"
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
                placeholderTextColor="#6B778C"
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
                  placeholderTextColor="#6B778C"
                  value={timeLimitSeconds}
                  onChangeText={setTimeLimitSeconds}
                />
              </FieldLabel>
            ) : null}
            <TouchableOpacity style={styles.primaryButton} onPress={createRoom}>
              <Text style={styles.primaryButtonText}>Créer la salle</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Rejoindre une salle</Text>
            <FieldLabel label="Code de salle à rejoindre">
              <TextInput
                style={styles.input}
                autoCapitalize="characters"
                placeholder="Ex: A1B2C3"
                placeholderTextColor="#6B778C"
                value={joinCode}
                onChangeText={setJoinCode}
              />
            </FieldLabel>
            <TouchableOpacity style={styles.secondaryButton} onPress={joinRoom}>
              <Text style={styles.secondaryButtonText}>Rejoindre</Text>
            </TouchableOpacity>
          </View>
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
            const isHost = player.userId === room.hostId;
            let statusText = 'en attente';
            if (room.status === 'waiting') {
              statusText = isHost ? 'dans le lobby (créateur)' : 'dans le lobby';
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

          {room.hostId === account.id ? (
            <>
              <TouchableOpacity style={styles.primaryButton} onPress={startBattle}>
                <Text style={styles.primaryButtonText}>Lancer le battle</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dangerButton} onPress={deleteLobby}>
                <Text style={styles.primaryButtonText}>Supprimer le lobby</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.waitingForHostContainer}>
                <Text style={styles.waitingForHostText}>
                  En attente du lancement par le créateur de la salle...
                </Text>
              </View>
              <TouchableOpacity style={styles.dangerButton} onPress={() => setRoom(null)}>
                <Text style={styles.primaryButtonText}>Quitter la salle</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {loading ? (
        <ActivityIndicator color="white" style={styles.loader} />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>Retour</Text>
      </TouchableOpacity>
    </ScrollView>
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
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.modeChip, active && styles.modeChipActive]}
    onPress={onPress}
  >
    <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
    flexGrow: 1,
    padding: SPACING.lg,
  },
  title: {
    color: 'white',
    fontSize: 36,
    fontWeight: '900',
    marginTop: 32,
    textAlign: 'center',
  },
  eyebrow: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.6,
    marginTop: 32,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  subtitle: {
    color: COLORS.secondary,
    lineHeight: 21,
    marginBottom: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 18,
    gap: 12,
    marginBottom: 16,
    padding: SPACING.lg,
  },
  roomCard: {
    backgroundColor: '#EAF2FF',
    borderRadius: 18,
    gap: 10,
    marginBottom: 16,
    padding: SPACING.lg,
  },
  lobbyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chatCard: {
    backgroundColor: '#EFEAE2',
    borderColor: '#DFE1E6',
    borderRadius: 16,
    borderWidth: 1,
    height: 400,
    overflow: 'hidden',
  },
  chatHeader: {
    backgroundColor: '#075E54',
    padding: 12,
  },
  chatTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
  chatHint: {
    color: '#D1D7DB',
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
    backgroundColor: '#DCF8C6',
    alignSelf: 'flex-end',
    borderTopRightRadius: 0,
  },
  chatMessageOther: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    borderTopLeftRadius: 0,
  },
  chatAuthor: {
    color: '#075E54',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  chatText: {
    color: '#111B21',
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
    backgroundColor: '#F0F2F5',
    gap: 8,
  },
  chatInputWhatsApp: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111B21',
  },
  sendButtonWhatsApp: {
    backgroundColor: '#00A884',
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
  segmentedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeChip: {
    borderColor: '#DFE1E6',
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
    backgroundColor: '#FAFBFC',
    borderColor: '#DFE1E6',
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
    borderColor: COLORS.secondary,
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
    color: 'white',
    fontWeight: '700',
    marginVertical: 12,
    textAlign: 'center',
  },
  backButton: {
    alignSelf: 'center',
    padding: 12,
  },
  backText: {
    color: 'white',
    textDecorationLine: 'underline',
  },
  waitingForHostContainer: {
    backgroundColor: '#F4F5F7',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    alignItems: 'center',
  },
  waitingForHostText: {
    color: '#5E6C84',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default BattleRoyaleView;
