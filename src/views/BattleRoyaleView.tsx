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
  const [maxPlayers, setMaxPlayers] = useState('10');
  const [questionCount, setQuestionCount] = useState('5');
  const [eliminationScore, setEliminationScore] = useState('20');
  const [joinCode, setJoinCode] = useState('');
  const [room, setRoom] = useState<BattleRoyaleRoom | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createRoom = async () => {
    setLoading(true);
    setError('');
    try {
      const nextRoom = await BattleRoyaleController.createRoom(account, {
        theme,
        maxPlayers: Number(maxPlayers),
        questionCount: Number(questionCount),
        eliminationScore: Number(eliminationScore),
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
      <Text style={styles.eyebrow}>Mode multijoueur</Text>
      <Text style={styles.title}>Battle Royale</Text>
      <Text style={styles.subtitle}>
        Crée une salle synchronisée dans Firestore, partage le code et démarre
        un quiz éliminatoire quand tout le monde est prêt.
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Créer une salle</Text>
        <Text style={styles.helpText}>
          Le thème génère les questions via l'API IA. Le score minimum décide
          qui survit à la fin de la partie.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Thème"
          placeholderTextColor="#6B778C"
          value={theme}
          onChangeText={setTheme}
        />
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
            placeholder="Questions"
            placeholderTextColor="#6B778C"
            value={questionCount}
            onChangeText={setQuestionCount}
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
        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.disabledButton]}
          disabled={loading}
          onPress={createRoom}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Création...' : 'Créer la salle'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Rejoindre une salle</Text>
        <Text style={styles.helpText}>
          Entre le code partagé par l'hôte. Les joueurs restent en attente tant
          que la partie n'est pas lancée.
        </Text>
        <TextInput
          style={styles.input}
          autoCapitalize="characters"
          placeholder="Code de salle"
          placeholderTextColor="#6B778C"
          value={joinCode}
          onChangeText={setJoinCode}
        />
        <TouchableOpacity
          style={[
            styles.secondaryButton,
            (loading || !joinCode.trim()) && styles.disabledButton,
          ]}
          disabled={loading || !joinCode.trim()}
          onPress={joinRoom}
        >
          <Text style={styles.secondaryButtonText}>Rejoindre</Text>
        </TouchableOpacity>
      </View>

      {room ? (
        <View style={styles.roomCard}>
          <Text style={styles.roomCode}>Code: {room.code}</Text>
          <Text style={styles.roomStatus}>
            {room.status === 'waiting'
              ? 'Salle en attente de joueurs'
              : 'Partie en cours'}
          </Text>
          <Text style={styles.roomInfo}>
            Thème: {room.config.theme} | Questions: {room.config.questionCount}
          </Text>
          <Text style={styles.roomInfo}>
            Survivre si score {'>='} {room.config.eliminationScore}
          </Text>
          <Text style={styles.sectionTitle}>Joueurs</Text>
          {room.players.map(player => (
            <Text key={player.userId} style={styles.playerLine}>
              {player.displayName} -{' '}
              {player.finished ? `${player.score} pts` : 'en attente'}
            </Text>
          ))}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabledButton]}
            disabled={loading}
            onPress={startBattle}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'Préparation...' : 'Lancer le battle'}
            </Text>
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
