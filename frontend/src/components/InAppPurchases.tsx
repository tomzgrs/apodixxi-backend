import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as InAppPurchases from 'expo-in-app-purchases';
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
  const [products, setProducts] = useState<InAppPurchases.IAPItemDetails[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    initializeIAP();
    return () => {
      InAppPurchases.disconnectAsync().catch(() => {});
    };
  }, []);

  const initializeIAP = async () => {
    try {
      setLoading(true);
      
      // Connect to the store
      await InAppPurchases.connectAsync();
      setIsConnected(true);
      
      // Get available products
      const { results } = await InAppPurchases.getProductsAsync(Object.values(PRODUCT_IDS));
      if (results) {
        setProducts(results);
      }
      
      // Set up purchase listener
      InAppPurchases.setPurchaseListener(async ({ responseCode, results, errorCode }) => {
        if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
          for (const purchase of results) {
            if (!purchase.acknowledged) {
              // Verify purchase with backend
              await verifyPurchase(purchase);
              
              // Finish the transaction
              await InAppPurchases.finishTransactionAsync(purchase, true);
            }
          }
        } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
          console.log('User cancelled purchase');
        } else {
          console.error('Purchase error:', errorCode);
          Alert.alert('Σφάλμα', 'Η αγορά απέτυχε. Δοκίμασε ξανά.');
        }
        setPurchaseLoading(null);
      });
      
    } catch (error) {
      console.error('IAP initialization error:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const verifyPurchase = async (purchase: InAppPurchases.InAppPurchase) => {
    try {
      const response = await fetch(`${API_URL}/api/purchases/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receipt: Platform.OS === 'ios' ? purchase.transactionReceipt : purchase.purchaseToken,
          product_id: purchase.productId,
          platform: Platform.OS,
          user_email: user?.email,
        }),
      });
      
      if (response.ok) {
        Alert.alert(
          'Επιτυχία!', 
          'Καλωσήρθες στο apodixxi+! Απολαμβάνεις τώρα όλες τις premium δυνατότητες.',
          [{ text: 'Τέλεια!', onPress: () => {
            refreshUser?.();
            onPurchaseComplete?.();
          }}]
        );
      }
    } catch (error) {
      console.error('Purchase verification error:', error);
    }
  };

  const handlePurchase = async (productId: string) => {
    if (!isConnected) {
      Alert.alert('Σφάλμα', 'Δεν είναι δυνατή η σύνδεση με το κατάστημα. Δοκίμασε ξανά.');
      return;
    }
    
    try {
      setPurchaseLoading(productId);
      await InAppPurchases.purchaseItemAsync(productId);
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Σφάλμα', 'Η αγορά απέτυχε. Δοκίμασε ξανά.');
      setPurchaseLoading(null);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setLoading(true);
      const { results } = await InAppPurchases.getPurchaseHistoryAsync();
      
      if (results && results.length > 0) {
        // Verify restored purchases with backend
        for (const purchase of results) {
          await verifyPurchase(purchase);
        }
        Alert.alert('Επιτυχία', 'Οι αγορές σου επαναφέρθηκαν!');
      } else {
        Alert.alert('Πληροφορία', 'Δεν βρέθηκαν προηγούμενες αγορές.');
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Σφάλμα', 'Η επαναφορά αγορών απέτυχε.');
    } finally {
      setLoading(false);
    }
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
            SUBSCRIPTION_PLANS.map((plan) => {
              const productInfo = products.find(p => p.productId === plan.id);
              return (
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
                  <Text style={styles.planTitle}>{plan.title}</Text>
                  <Text style={styles.planDescription}>{plan.description}</Text>
                  <View style={styles.priceContainer}>
                    <Text style={styles.planPrice}>
                      {productInfo?.price || plan.price}
                    </Text>
                    <Text style={styles.planPeriod}>{plan.period}</Text>
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
              );
            })
          )}
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
    color: theme.primary,
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
