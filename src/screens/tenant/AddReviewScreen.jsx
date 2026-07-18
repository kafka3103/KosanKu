import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../constants/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/typography';
import { SPACING, BORDER_RADIUS, SHADOW } from '../../constants/spacing';
import { submitReview } from '../../services/reviewService';
import useAuthStore from '../../store/authStore';
import { useTranslation } from 'react-i18next';

const RatingRow = ({ label, value, onChange }) => {
  return (
    <View style={styles.ratingRow}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => onChange(star)} activeOpacity={0.7} style={{ padding: 4 }}>
            <Ionicons
              name={star <= value ? 'star' : 'star-outline'}
              size={28}
              color={COLORS.warning}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const AddReviewScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuthStore();
  const propertyId = route.params?.propertyId;

  const [isLoading, setIsLoading] = useState(false);
  const [ratings, setRatings] = useState({
    cleanliness: 0,
    comfort: 0,
    security: 0,
    price: 0,
    roomFacilities: 0,
    publicFacilities: 0,
  });
  const [comment, setComment] = useState('');

  const updateRating = (key, val) => setRatings((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    // Validasi
    const values = Object.values(ratings);
    if (values.includes(0)) {
      Alert.alert('Incomplete', t('review.incompleteAlert', 'Mohon isi semua kategori rating (1-5 bintang).'));
      return;
    }

    setIsLoading(true);
    const result = await submitReview({
      propertyId,
      tenantId: currentUser.id,
      ...ratings,
      comment,
    });
    setIsLoading(false);

    if (result.success) {
      Alert.alert(t('common.success', 'Sukses'), t('review.successAlert', 'Ulasan Anda berhasil dikirim!'), [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } else {
      Alert.alert(t('common.error', 'Error'), result.error || t('review.errorAlert', 'Gagal mengirim ulasan.'));
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('review.title', 'Tulis Ulasan')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>
          {t('review.subtitle', 'Berikan penilaian jujur Anda untuk membantu pencari kosan lain.')}
        </Text>

        <View style={styles.card}>
          <RatingRow label={t('review.cleanliness', 'Kebersihan')} value={ratings.cleanliness} onChange={(v) => updateRating('cleanliness', v)} />
          <RatingRow label={t('review.comfort', 'Kenyamanan')} value={ratings.comfort} onChange={(v) => updateRating('comfort', v)} />
          <RatingRow label={t('review.security', 'Keamanan')} value={ratings.security} onChange={(v) => updateRating('security', v)} />
          <RatingRow label={t('review.price', 'Harga (Value for Money)')} value={ratings.price} onChange={(v) => updateRating('price', v)} />
          <RatingRow label={t('review.roomFacilities', 'Fasilitas Kamar')} value={ratings.roomFacilities} onChange={(v) => updateRating('roomFacilities', v)} />
          <RatingRow label={t('review.publicFacilities', 'Fasilitas Umum')} value={ratings.publicFacilities} onChange={(v) => updateRating('publicFacilities', v)} />
        </View>

        <Text style={styles.label}>{t('review.commentLabel', 'Komentar (Opsional)')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('review.commentPlaceholder', 'Ceritakan pengalaman Anda tinggal di kosan ini...')}
          placeholderTextColor={COLORS.textTertiary}
          multiline
          numberOfLines={4}
          value={comment}
          onChangeText={setComment}
          textAlignVertical="top"
        />

      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || SPACING[4] }]}>
        <TouchableOpacity
          style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
             <ActivityIndicator color={COLORS.white} />
          ) : (
             <Text style={styles.submitBtnText}>{t('review.submitButton', 'Kirim Ulasan')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.white,
    ...SHADOW.sm,
  },
  backBtn: { padding: SPACING[2], marginLeft: -SPACING[2] },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  scrollContent: { padding: SPACING[5] },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING[5],
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[5],
    ...SHADOW.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  ratingLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textPrimary,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  label: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING[2],
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING[4],
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  footer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING[5],
    paddingTop: SPACING[4],
    ...SHADOW.md,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING[4],
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
  }
});

export default AddReviewScreen;
