import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Product IDs - these need to match your App Store / Google Play product IDs
const PRODUCT_IDS = {
  MONTHLY: 'apodixxi_plus_monthly',
  YEARLY: 'apodixxi_plus_yearly',
};

interface SubscriptionPlan {
  id: string;
  title: string;
  description: string;
  price: string;
  period: string;
  popular?: boolean;
}

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: PRODUCT_IDS.MONTHLY,
    title: 'apodixxi+ Μηνιαία',
    description: 'Ξεκλείδωσε όλες τις δυνατότητες',
    price: '€2.99',
    period: '/μήνα',
  },
  {
    id: PRODUCT_IDS.YEARLY,
    title: 'apodixxi+ Ετήσια',
    description: 'Εξοικονόμησε 40%!',
    price: '€19.99',
    period: '/έτος',
    popular: true,
  },
];

interface InAppPurchaseScreenProps {
  onClose?: () => void;
  onPurchaseComplete?: () => void;
}

export default function InAppPurchaseScreen({ onClose, onPurchaseComplete }: InAppPurchaseScreenProps) {
  const { theme, isDark } = useTheme();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);

  // Note: In-App Purchases require react-native-iap package for production
  // This is a placeholder UI until the proper IAP integration is implemented
  const handlePurchase = async (productId: string) => {
    setPurchaseLoading(productId);
    
    // Simulate purchase flow - in production, this would use react-native-iap
    Alert.alert(
      'In-App Purchases',
      'Οι αγορές μέσα στην εφαρμογή θα ενεργοποιηθούν σύντομα. Επικοινώνησε μαζί μας για να αναβαθμίσεις τον λογαριασμό σου.',
      [
        { text: 'Ακύρωση', style: 'cancel' },
        { 
          text: 'Επικοινωνία', 
          onPress: () => Linking.openURL('mailto:support@apodixxi.app?subject=Premium%20Αναβάθμιση')
        }
      ]
    );
    
    setPurchaseLoading(null);
  };

  const handleRestorePurchases = async () => {
    setLoading(true);
    
    // Check purchase status with backend
    try {
      if (user?.email) {
        const response = await fetch(`${API_URL}/api/purchases/status?user_email=${user.email}`);
        if (response.ok) {
          const data = await response.json();
          if (data.is_premium) {
            Alert.alert('Επιτυχία', 'Οι αγορές σου επαναφέρθηκαν!');
            refreshUser?.();
            onPurchaseComplete?.();
          } else {
            Alert.alert('Πληροφορία', 'Δεν βρέθηκαν προηγούμενες αγορές.');
          }
        }
      }
    } catch (error) {
      Alert.alert('Σφάλμα', 'Η επαναφορά αγορών απέτυχε.');
    }
    
    setLoading(false);
  };

  const styles = createStyles(theme, isDark);

  const features = [
    { icon: 'download-outline', text: 'Εξαγωγή σε Excel' },
    { icon: 'analytics-outline', text: 'Προηγμένα στατιστικά' },
    { icon: 'sparkles-outline', text: 'AI Προτάσεις εξοικονόμησης' },
    { icon: 'notifications-outline', text: 'Ειδοποιήσεις τιμών' },
    { icon: 'shield-checkmark-outline', text: 'Χωρίς διαφημίσεις' },
    { icon: 'cloud-upload-outline', text: 'Cloud backup' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>apodixxi+</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={24} color="#FFD700" />
          </View>
          <Text style={styles.heroTitle}>Αναβάθμισε στο Premium</Text>
          <Text style={styles.heroSubtitle}>
            Ξεκλείδωσε όλες τις δυνατότητες και πάρε τον πλήρη έλεγχο των εξόδων σου
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Τι περιλαμβάνει:</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons name={feature.icon as any} size={20} color={theme.primary} />
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Subscription Plans */}
        <View style={styles.plansSection}>
          {loading ? (
            <ActivityIndicator size="large" color={theme.primary} />
          ) : (
            SUBSCRIPTION_PLANS.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  plan.popular && styles.popularPlan,
                ]}
                onPress={() => handlePurchase(plan.id)}
                disabled={purchaseLoading !== null}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>Δημοφιλές</Text>
                  </View>
                )}
                <Text style={[styles.planTitle, plan.popular && styles.popularText]}>
                  {plan.title}
                </Text>
                <Text style={[styles.planDescription, plan.popular && styles.popularTextLight]}>
                  {plan.description}
                </Text>
                <View style={styles.priceContainer}>
                  <Text style={[styles.planPrice, plan.popular && styles.popularText]}>
                    {plan.price}
                  </Text>
                  <Text style={[styles.planPeriod, plan.popular && styles.popularTextLight]}>
                    {plan.period}
                  </Text>
                </View>
                {purchaseLoading === plan.id ? (
                  <ActivityIndicator color={plan.popular ? '#fff' : theme.primary} />
                ) : (
                  <View style={[styles.purchaseButton, plan.popular && styles.popularButton]}>
                    <Text style={[styles.purchaseButtonText, plan.popular && styles.popularButtonText]}>
                      Επιλογή
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Coming Soon Notice */}
        <View style={styles.noticeContainer}>
          <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
          <Text style={styles.noticeText}>
            Οι αγορές μέσα στην εφαρμογή έρχονται σύντομα. Επικοινώνησε μαζί μας για premium πρόσβαση.
          </Text>
        </View>

        {/* Restore Purchases */}
        <TouchableOpacity style={styles.restoreButton} onPress={handleRestorePurchases}>
          <Text style={styles.restoreButtonText}>Επαναφορά αγορών</Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={styles.terms}>
          Η συνδρομή ανανεώνεται αυτόματα εκτός αν ακυρωθεί τουλάχιστον 24 ώρες πριν τη λήξη. 
          Η χρέωση γίνεται μέσω του λογαριασμού σου {Platform.OS === 'ios' ? 'Apple' : 'Google Play'}.
        </Text>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  premiumBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: isDark ? '#333' : '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 16,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: theme.text,
    flex: 1,
  },
  plansSection: {
    gap: 16,
    marginBottom: 20,
  },
  planCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.border,
    backgroundColor: isDark ? '#1a1a1a' : '#fff',
  },
  popularPlan: {
    borderColor: theme.primary,
    backgroundColor: theme.primary,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 12,
  },
  popularText: {
    color: '#fff',
  },
  popularTextLight: {
    color: 'rgba(255,255,255,0.8)',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.text,
  },
  planPeriod: {
    fontSize: 16,
    color: theme.textSecondary,
    marginLeft: 4,
  },
  purchaseButton: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: theme.primary,
    alignItems: 'center',
  },
  popularButton: {
    backgroundColor: '#fff',
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  popularButtonText: {
    color: '#0d9488',
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
    borderRadius: 8,
    marginBottom: 16,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 18,
  },
  restoreButton: {
    alignItems: 'center',
    padding: 16,
  },
  restoreButtonText: {
    fontSize: 14,
    color: theme.primary,
  },
  terms: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 20,
  },
});
