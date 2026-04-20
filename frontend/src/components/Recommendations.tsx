import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { Typography, Spacing, Radius, Shadows } from '../theme';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Recommendation {
  id: string;
  type: 'promotion' | 'price_alert' | 'price_comparison' | 'insight';
  title: string;
  description: string;
  product_name?: string;
  price?: number;
  original_price?: number;
  store_name?: string;
  image_url?: string;
  barcode_code?: string;
  savings?: number;
  is_sponsored: boolean;
}

interface RecommendationsProps {
  deviceId: string;
  location: 'dashboard' | 'after_save' | 'compare';
  receiptId?: string;
  limit?: number;
  onPress?: (rec: Recommendation) => void;
}

export function Recommendations({ deviceId, location, receiptId, limit = 3, onPress }: RecommendationsProps) {
  const { theme, isDark } = useTheme();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [deviceId, location, receiptId]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/api/recommendations?device_id=${deviceId}&limit=${limit}&location=${location}`;
      
      if (location === 'after_save' && receiptId) {
        url = `${API_URL}/api/recommendations/after-save?device_id=${deviceId}&receipt_id=${receiptId}&limit=${limit}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      setRecommendations(data.recommendations || []);
      
      // Track views
      data.recommendations?.forEach((rec: Recommendation) => {
        if (rec.is_sponsored) {
          fetch(`${API_URL}/api/recommendations/${rec.id}/view`, { method: 'POST' });
        }
      });
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = async (rec: Recommendation) => {
    // Track click
    if (rec.is_sponsored) {
      fetch(`${API_URL}/api/recommendations/${rec.id}/click`, { method: 'POST' });
    }
    onPress?.(rec);
  };

  const styles = createStyles(theme, isDark);

  if (loading) {
    return null; // Don't show loading spinner for recommendations
  }

  if (recommendations.length === 0) {
    return null;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'promotion': return 'pricetag';
      case 'price_alert': return 'trending-down';
      case 'price_comparison': return 'swap-horizontal';
      case 'insight': return 'bulb';
      default: return 'star';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'promotion': return '#f59e0b';
      case 'price_alert': return '#10b981';
      case 'price_comparison': return '#3b82f6';
      case 'insight': return '#8b5cf6';
      default: return theme.primary;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bulb-outline" size={18} color={theme.primary} />
        <Text style={styles.headerTitle}>
          {location === 'after_save' ? 'Ήξερες ότι...' : 'Προτάσεις για εσάς'}
        </Text>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {recommendations.map((rec) => (
          <TouchableOpacity
            key={rec.id}
            style={styles.card}
            onPress={() => handlePress(rec)}
            activeOpacity={0.8}
          >
            {/* Header with icon and type */}
            <View style={styles.cardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: getIconColor(rec.type) + '20' }]}>
                <Ionicons name={getIcon(rec.type)} size={16} color={getIconColor(rec.type)} />
              </View>
              {rec.is_sponsored && (
                <Text style={styles.sponsoredBadge}>Προσφορά</Text>
              )}
            </View>
            
            {/* Title */}
            <Text style={styles.cardTitle} numberOfLines={2}>{rec.title}</Text>
            
            {/* Description */}
            {rec.description && (
              <Text style={styles.cardDescription} numberOfLines={2}>{rec.description}</Text>
            )}
            
            {/* Price info */}
            {rec.price && (
              <View style={styles.priceRow}>
                <Text style={styles.currentPrice}>€{rec.price.toFixed(2)}</Text>
                {rec.original_price && rec.original_price > rec.price && (
                  <>
                    <Text style={styles.originalPrice}>€{rec.original_price.toFixed(2)}</Text>
                    <View style={styles.savingsBadge}>
                      <Text style={styles.savingsText}>
                        -{Math.round((1 - rec.price / rec.original_price) * 100)}%
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}
            
            {/* Store */}
            {rec.store_name && (
              <View style={styles.storeRow}>
                <Ionicons name="location-outline" size={12} color={theme.textSecondary} />
                <Text style={styles.storeName}>{rec.store_name}</Text>
              </View>
            )}
            
            {/* Barcode indicator */}
            {rec.barcode_code && (
              <View style={styles.barcodeIndicator}>
                <Ionicons name="barcode-outline" size={14} color={theme.primary} />
                <Text style={styles.barcodeText}>Με κουπόνι</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// Compact version for after-save popup
export function RecommendationCard({ recommendation, onPress }: { recommendation: Recommendation; onPress?: () => void }) {
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme, isDark);

  return (
    <TouchableOpacity 
      style={styles.compactCard} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.compactIcon}>
        <Ionicons 
          name={recommendation.type === 'price_comparison' ? 'trending-down' : 'bulb'} 
          size={24} 
          color="#10b981" 
        />
      </View>
      <View style={styles.compactContent}>
        <Text style={styles.compactTitle}>{recommendation.title}</Text>
        <Text style={styles.compactDescription} numberOfLines={2}>
          {recommendation.description}
        </Text>
        {recommendation.savings && (
          <Text style={styles.compactSavings}>
            Εξοικονόμηση €{recommendation.savings.toFixed(2)}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
    </TouchableOpacity>
  );
}

const createStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  headerTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: theme.text,
    marginLeft: Spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  card: {
    width: 200,
    backgroundColor: theme.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sponsoredBadge: {
    fontSize: 10,
    color: '#f59e0b',
    fontWeight: Typography.semibold,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: theme.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: Typography.xs,
    color: theme.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  currentPrice: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: theme.primary,
  },
  originalPrice: {
    fontSize: Typography.sm,
    color: theme.textMuted,
    textDecorationLine: 'line-through',
    marginLeft: Spacing.xs,
  },
  savingsBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: Spacing.xs,
  },
  savingsText: {
    fontSize: 10,
    fontWeight: Typography.bold,
    color: '#16a34a',
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  storeName: {
    fontSize: Typography.xs,
    color: theme.textSecondary,
    marginLeft: 4,
  },
  barcodeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  barcodeText: {
    fontSize: Typography.xs,
    color: theme.primary,
    marginLeft: 4,
    fontWeight: Typography.medium,
  },
  
  // Compact card styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
  },
  compactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  compactTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: theme.text,
  },
  compactDescription: {
    fontSize: Typography.xs,
    color: theme.textSecondary,
    marginTop: 2,
  },
  compactSavings: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: '#10b981',
    marginTop: 4,
  },
});

export default Recommendations;
