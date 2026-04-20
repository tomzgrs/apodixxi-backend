import React, { useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { I18nContext } from './_layout';
import { useTheme } from '../src/ThemeContext';
import { Typography, Spacing, Radius, Shadows } from '../src/theme';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function AdminScreen() {
  const { lang } = useContext(I18nContext);
  const { theme, isDark } = useTheme();
  const router = useRouter();
  
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('pending');

  const fetchData = useCallback(async () => {
    if (!adminKey) return;
    
    try {
      // Fetch reviews
      const reviewsRes = await fetch(`${API_BASE}/api/admin/store-reviews?admin_key=${adminKey}&status=${statusFilter}`);
      if (reviewsRes.status === 403) {
        Alert.alert('Σφάλμα', 'Λάθος κωδικός admin');
        setIsAuthenticated(false);
        return;
      }
      const reviewsData = await reviewsRes.json();
      setReviews(reviewsData.reviews || []);
      
      // Fetch stats
      const statsRes = await fetch(`${API_BASE}/api/admin/stats?admin_key=${adminKey}`);
      const statsData = await statsRes.json();
      setStats(statsData);
    } catch (e) {
      console.log('Admin fetch error:', e);
    }
  }, [adminKey, statusFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, statusFilter, fetchData]);

  const handleLogin = async () => {
    if (!adminKey.trim()) {
      Alert.alert('Σφάλμα', 'Εισάγετε τον κωδικό admin');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/stats?admin_key=${adminKey}`);
      if (res.status === 403) {
        Alert.alert('Σφάλμα', 'Λάθος κωδικός admin');
      } else {
        setIsAuthenticated(true);
      }
    } catch (e) {
      Alert.alert('Σφάλμα', 'Αποτυχία σύνδεσης');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reviewId: string, storeName: string) => {
    Alert.alert(
      'Έγκριση Καταστήματος',
      `Θέλετε να εγκρίνετε το κατάστημα "${storeName}";`,
      [
        { text: 'Άκυρο', style: 'cancel' },
        {
          text: 'Έγκριση',
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE}/api/admin/store-reviews/${reviewId}/approve?admin_key=${adminKey}`, {
                method: 'POST'
              });
              if (res.ok) {
                Alert.alert('Επιτυχία', 'Το κατάστημα εγκρίθηκε');
                fetchData();
              }
            } catch (e) {
              Alert.alert('Σφάλμα', 'Αποτυχία έγκρισης');
            }
          }
        }
      ]
    );
  };

  const handleReject = async (reviewId: string, storeName: string) => {
    Alert.alert(
      'Απόρριψη Καταστήματος',
      `Θέλετε να απορρίψετε το κατάστημα "${storeName}";`,
      [
        { text: 'Άκυρο', style: 'cancel' },
        {
          text: 'Απόρριψη',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE}/api/admin/store-reviews/${reviewId}/reject?admin_key=${adminKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'Rejected by admin' })
              });
              if (res.ok) {
                Alert.alert('Επιτυχία', 'Το κατάστημα απορρίφθηκε');
                fetchData();
              }
            } catch (e) {
              Alert.alert('Σφάλμα', 'Αποτυχία απόρριψης');
            }
          }
        }
      ]
    );
  };

  const handleDelete = async (reviewId: string) => {
    Alert.alert(
      'Διαγραφή Αίτησης',
      'Θέλετε να διαγράψετε αυτήν την αίτηση;',
      [
        { text: 'Άκυρο', style: 'cancel' },
        {
          text: 'Διαγραφή',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE}/api/admin/store-reviews/${reviewId}?admin_key=${adminKey}`, {
                method: 'DELETE'
              });
              if (res.ok) {
                fetchData();
              }
            } catch (e) {
              Alert.alert('Σφάλμα', 'Αποτυχία διαγραφής');
            }
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  };

  const styles = createStyles(theme, isDark);

  // Login Screen
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.loginContainer}>
          <View style={styles.loginIconWrap}>
            <Ionicons name="shield-checkmark" size={48} color={theme.primary} />
          </View>
          <Text style={styles.loginTitle}>Admin Login</Text>
          <Text style={styles.loginDesc}>Εισάγετε τον κωδικό διαχειριστή</Text>
          
          <TextInput
            style={styles.loginInput}
            placeholder="Κωδικός Admin"
            placeholderTextColor={theme.textMuted}
            value={adminKey}
            onChangeText={setAdminKey}
            secureTextEntry
            autoCapitalize="none"
          />
          
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loginBtnText}>Σύνδεση</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Admin Dashboard
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <TouchableOpacity onPress={() => setIsAuthenticated(false)} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color={theme.error} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="phone-portrait-outline" size={24} color={theme.primary} />
              <Text style={styles.statValue}>{stats.total_devices}</Text>
              <Text style={styles.statLabel}>Συσκευές</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="receipt-outline" size={24} color={theme.accent} />
              <Text style={styles.statValue}>{stats.total_receipts}</Text>
              <Text style={styles.statLabel}>Αποδείξεις</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="cube-outline" size={24} color={theme.success} />
              <Text style={styles.statValue}>{stats.total_products}</Text>
              <Text style={styles.statLabel}>Προϊόντα</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={24} color={theme.warning} />
              <Text style={styles.statValue}>{stats.pending_reviews}</Text>
              <Text style={styles.statLabel}>Εκκρεμείς</Text>
            </View>
          </View>
        )}

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {['pending', 'approved', 'rejected', 'all'].map(status => (
            <TouchableOpacity
              key={status}
              style={[styles.filterTab, statusFilter === status && styles.filterTabActive]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[styles.filterTabText, statusFilter === status && styles.filterTabTextActive]}>
                {status === 'pending' ? 'Εκκρεμείς' :
                 status === 'approved' ? 'Εγκεκριμένα' :
                 status === 'rejected' ? 'Απορριφθέντα' : 'Όλα'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reviews List */}
        <Text style={styles.sectionTitle}>
          Αιτήσεις Καταστημάτων ({reviews.length})
        </Text>

        {reviews.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={48} color={theme.textMuted} />
            <Text style={styles.emptyText}>Δεν υπάρχουν αιτήσεις</Text>
          </View>
        ) : (
          reviews.map((review, i) => (
            <View key={review.id || i} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={[styles.statusBadge, 
                  review.status === 'approved' && styles.statusApproved,
                  review.status === 'rejected' && styles.statusRejected,
                  review.status === 'pending' && styles.statusPending
                ]}>
                  <Text style={styles.statusText}>
                    {review.status === 'pending' ? 'Εκκρεμεί' :
                     review.status === 'approved' ? 'Εγκρίθηκε' : 'Απορρίφθηκε'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(review.id)}>
                  <Ionicons name="trash-outline" size={20} color={theme.error} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.reviewStoreName}>{review.store_name || 'Άγνωστο'}</Text>
              <Text style={styles.reviewVat}>ΑΦΜ: {review.vat}</Text>
              <Text style={styles.reviewDate}>
                {new Date(review.created_at).toLocaleDateString('el-GR')}
              </Text>
              
              {review.receipt_url && (
                <TouchableOpacity 
                  style={styles.linkBtn}
                  onPress={() => Linking.openURL(review.receipt_url)}
                >
                  <Ionicons name="link-outline" size={16} color={theme.primary} />
                  <Text style={styles.linkText}>Άνοιγμα Link</Text>
                </TouchableOpacity>
              )}
              
              {review.status === 'pending' && (
                <View style={styles.actionBtns}>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleApprove(review.id, review.store_name)}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                    <Text style={styles.approveBtnText}>Έγκριση</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleReject(review.id, review.store_name)}
                  >
                    <Ionicons name="close" size={18} color="#FFF" />
                    <Text style={styles.rejectBtnText}>Απόρριψη</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}

        {/* Top Stores */}
        {stats && stats.top_stores && stats.top_stores.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Top Καταστήματα</Text>
            <View style={styles.topStoresCard}>
              {stats.top_stores.map((store: any, i: number) => (
                <View key={i} style={styles.topStoreRow}>
                  <Text style={styles.topStoreRank}>#{i + 1}</Text>
                  <Text style={styles.topStoreName}>{store.name}</Text>
                  <Text style={styles.topStoreCount}>{store.count}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: theme.text,
  },
  placeholder: { width: 40 },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: theme.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  scroll: { padding: Spacing.base, paddingBottom: Spacing['3xl'] },
  
  // Login
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loginIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  loginTitle: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: theme.text,
    marginBottom: Spacing.sm,
  },
  loginDesc: {
    fontSize: Typography.sm,
    color: theme.textSecondary,
    marginBottom: Spacing.xl,
  },
  loginInput: {
    width: '100%',
    backgroundColor: theme.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    fontSize: Typography.base,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: Spacing.lg,
  },
  loginBtn: {
    width: '100%',
    backgroundColor: theme.primary,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    alignItems: 'center',
  },
  loginBtnText: {
    color: '#FFF',
    fontSize: Typography.base,
    fontWeight: Typography.bold,
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  statValue: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: theme.text,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.xs,
    color: theme.textSecondary,
    marginTop: 2,
  },
  
  // Filter Tabs
  filterTabs: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  filterTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: theme.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  filterTabActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  filterTabText: {
    fontSize: Typography.xs,
    fontWeight: Typography.medium,
    color: theme.textSecondary,
  },
  filterTabTextActive: {
    color: '#FFF',
  },
  
  // Section
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: theme.textSecondary,
    marginBottom: Spacing.md,
  },
  
  // Empty
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyText: {
    fontSize: Typography.base,
    color: theme.textMuted,
    marginTop: Spacing.md,
  },
  
  // Review Card
  reviewCard: {
    backgroundColor: theme.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusApproved: { backgroundColor: '#D1FAE5' },
  statusRejected: { backgroundColor: '#FEE2E2' },
  statusText: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
  },
  reviewStoreName: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: theme.text,
  },
  reviewVat: {
    fontSize: Typography.sm,
    color: theme.textSecondary,
    marginTop: 2,
  },
  reviewDate: {
    fontSize: Typography.xs,
    color: theme.textMuted,
    marginTop: 4,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  linkText: {
    fontSize: Typography.sm,
    color: theme.primary,
  },
  actionBtns: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.success,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: 4,
  },
  approveBtnText: {
    color: '#FFF',
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.error,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: 4,
  },
  rejectBtnText: {
    color: '#FFF',
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  
  // Top Stores
  topStoresCard: {
    backgroundColor: theme.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  topStoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  topStoreRank: {
    width: 30,
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: theme.primary,
  },
  topStoreName: {
    flex: 1,
    fontSize: Typography.sm,
    color: theme.text,
  },
  topStoreCount: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: theme.textSecondary,
  },
});
