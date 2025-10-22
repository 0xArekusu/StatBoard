import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../src/config/supabase';
import { ServiceFactory } from '../services/ServiceFactory';
import { useAuth } from '../src/contexts/AuthContext';

export default function JoinClubScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [clubCode, setClubCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoinClub = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour rejoindre un club');
      return;
    }

    if (!clubCode.trim() || clubCode.length !== 6) {
      Alert.alert('Erreur', 'Veuillez entrer un code à 6 chiffres');
      return;
    }

    setLoading(true);

    try {
      // Find club by code
      const clubService = ServiceFactory.getClubService(supabase);
      const club = await clubService.getClubByCode(clubCode);

      if (!club) {
        Alert.alert('Erreur', 'Aucun club trouvé avec ce code');
        setLoading(false);
        return;
      }

      // Join the club
      const clubMemberService = ServiceFactory.getClubMemberService(supabase);
      const result = await clubMemberService.joinClub(club.id, user.id, user.email!);

      if (!result.success) {
        Alert.alert('Erreur', result.error || 'Impossible de rejoindre le club');
        setLoading(false);
        return;
      }

      Alert.alert(
        'Succès',
        `Vous avez rejoint le club "${club.name}" !`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error joining club:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const formatCode = (text: string) => {
    const numbers = text.replace(/[^0-9]/g, '');
    return numbers.slice(0, 6);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rejoindre un club</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="enter" size={80} color="#4CAF50" />
        </View>

        <Text style={styles.title}>Entrez le code du club</Text>
        <Text style={styles.subtitle}>
          Demandez le code à 6 chiffres à l'administrateur du club
        </Text>

        <TextInput
          style={styles.codeInput}
          placeholder="000000"
          value={clubCode}
          onChangeText={(text) => setClubCode(formatCode(text))}
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
        />

        <TouchableOpacity
          style={[styles.joinButton, loading && styles.joinButtonDisabled]}
          onPress={handleJoinClub}
          disabled={loading}
        >
          <Text style={styles.joinButtonText}>
            {loading ? 'Vérification...' : 'Rejoindre le club'}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.scanButton}>
          <Ionicons name="qr-code-outline" size={24} color="#666" />
          <Text style={styles.scanButtonText}>Scanner un QR code</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  codeInput: {
    width: '100%',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 10,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    color: '#333',
  },
  joinButton: {
    backgroundColor: '#4CAF50',
    width: '100%',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    backgroundColor: '#ccc',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#999',
    fontSize: 14,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 10,
  },
  scanButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
});
