import React, { useState } from 'react';
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

type BattleRoyaleViewProps = {
  account: UserAccount;
  onBack: () => void;
  onStartBattle: (room: BattleRoyaleRoom) => void;
};

const BattleRoyaleView = ({
  account,
  onBack,
  onStartBattle,
}: BattleRoyaleViewProps) => {
  const [theme, setTheme] = useState('Culture générale');
  const [battleMode, setBattleMode] = useState<'classic' | 'timed_mcq'>(
    'classic',
  );
  const [maxPlayers, setMaxPlayers] = useState('10');
  const [questionCount, setQuestionCount] = useState('5');
  const [eliminationScore, setEliminationScore] = useState('20');
  const [timeLimitSeconds, setTimeLimitSeconds] = useState('15');
  const [joinCode, setJoinCode] = useState('');
  const [room, setRoom] = useState<BattleRoyaleRoom | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const startBattle = async () => {
    if (!room) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const activeRoom = await BattleRoyaleController.startRoom(room);
      setRoom(activeRoom);
      onStartBattle(activeRoom);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demarrage impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Battle Royale</Text>
      <Text style={styles.subtitle}>
        Configure une salle, invite les joueurs avec le code, puis lance le
        quiz.
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Créer une salle</Text>
        <TextInput
          style={styles.input}
          placeholder="Thème"
          placeholderTextColor="#6B778C"
          value={theme}
          onChangeText={setTheme}
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
          <TextInput
            style={[styles.input, styles.smallInput]}
            keyboardType="numeric"
            placeholder="Joueurs"
            placeholderTextColor="#6B778C"
            value={maxPlayers}
            onChangeText={setMaxPlayers}
          />
          <TextInput
            style={[styles.input, styles.smallInput]}
            keyboardType="numeric"
            placeholder="Nombre de questions"
            placeholderTextColor="#6B778C"
            value={questionCount}
            onChangeText={value => setQuestionCount(clampNumber(value, 3, 20))}
          />
        </View>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder="Score minimum pour survivre"
          placeholderTextColor="#6B778C"
          value={eliminationScore}
          onChangeText={setEliminationScore}
        />
        {battleMode === 'timed_mcq' ? (
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="Secondes par question"
            placeholderTextColor="#6B778C"
            value={timeLimitSeconds}
            onChangeText={setTimeLimitSeconds}
          />
        ) : null}
        <TouchableOpacity style={styles.primaryButton} onPress={createRoom}>
          <Text style={styles.primaryButtonText}>Créer la salle</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Rejoindre une salle</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="characters"
          placeholder="Code de salle"
          placeholderTextColor="#6B778C"
          value={joinCode}
          onChangeText={setJoinCode}
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={joinRoom}>
          <Text style={styles.secondaryButtonText}>Rejoindre</Text>
        </TouchableOpacity>
      </View>

      {room ? (
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
          {room.players.map(player => (
            <Text key={player.userId} style={styles.playerLine}>
              {player.displayName} -{' '}
              {player.finished ? `${player.score} pts` : 'en attente'}
            </Text>
          ))}
          <TouchableOpacity style={styles.primaryButton} onPress={startBattle}>
            <Text style={styles.primaryButtonText}>Lancer le battle</Text>
          </TouchableOpacity>
        </View>
      ) : null}

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
});

export default BattleRoyaleView;
