/**
 * ClubChoiceModal
 *
 * Modal presenting the choice between creating a new club or joining an existing one.
 * Entry point for club functionality from the main menu.
 *
 * Features:
 * - Two-card layout with distinct actions
 * - Create club: Opens club creation flow with customization (colors, logo)
 * - Join club: Opens club join flow with code entry
 * - Close button in header
 *
 * Navigation:
 * - Clicking outside modal or close button dismisses it
 * - Create/Join buttons trigger respective callback handlers
 */
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
import { useTheme } from '../src/contexts/ThemeContext';

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
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Overlay: clicking outside closes modal */}
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* Modal content: prevent click propagation to overlay */}
        <Pressable
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header with title and close button */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary }]}>Club</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Two-card layout: Create or Join */}
          <View style={styles.cardsContainer}>
            {/* Create club card */}
            <TouchableOpacity
              style={[styles.card, {
                backgroundColor: colors.surfaceVariant,
                borderColor: colors.border
              }]}
              onPress={onCreatePress}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="add-circle" size={48} color={colors.button.club} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Créer un club</Text>
              <Text style={[styles.cardDescription, { color: colors.text.secondary }]}>
                Créez votre propre club avec vos couleurs et votre logo
              </Text>
            </TouchableOpacity>

            {/* Join club card */}
            <TouchableOpacity
              style={[styles.card, {
                backgroundColor: colors.surfaceVariant,
                borderColor: colors.border
              }]}
              onPress={onJoinPress}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="enter" size={48} color={colors.button.secondary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Rejoindre un club</Text>
              <Text style={[styles.cardDescription, { color: colors.text.secondary }]}>
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
  },
  cardsContainer: {
    gap: 15,
  },
  card: {
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
  },
  iconContainer: {
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
