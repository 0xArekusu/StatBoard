import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ClubChoiceModalProps {
  visible: boolean;
  onClose: () => void;
  onCreatePress: () => void;
  onJoinPress: () => void;
}

export default function ClubChoiceModal({
  visible,
  onClose,
  onCreatePress,
  onJoinPress,
}: ClubChoiceModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Club</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.cardsContainer}>
            <TouchableOpacity
              style={styles.card}
              onPress={onCreatePress}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="add-circle" size={48} color="#9C27B0" />
              </View>
              <Text style={styles.cardTitle}>Créer un club</Text>
              <Text style={styles.cardDescription}>
                Créez votre propre club avec vos couleurs et votre logo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={onJoinPress}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="enter" size={48} color="#4CAF50" />
              </View>
              <Text style={styles.cardTitle}>Rejoindre un club</Text>
              <Text style={styles.cardDescription}>
                Entrez le code d'un club existant pour le rejoindre
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  cardsContainer: {
    gap: 15,
  },
  card: {
    backgroundColor: '#f8f8f8',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconContainer: {
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
