import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { Sentry, sentryEnabled } from '../sentry';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// Top-level error boundary: catches render errors anywhere in the tree and
// shows a friendly fallback instead of a blank/white screen, then reports the
// error to crash monitoring. Intentionally self-contained (no theme/i18n
// context) so it still renders even if a provider is what crashed.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (sentryEnabled) {
      Sentry.captureException(error, {
        contexts: { react: { componentStack: info.componentStack ?? undefined } },
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container} testID="error-boundary-fallback">
        <View style={styles.iconCircle}>
          <AlertTriangle size={36} color="#EF4444" />
        </View>
        <Text style={styles.title}>Κάτι πήγε στραβά</Text>
        <Text style={styles.message}>
          Παρουσιάστηκε ένα απρόσμενο σφάλμα. Δοκιμάστε ξανά.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={this.handleRetry}
          accessibilityRole="button"
          accessibilityLabel="Δοκιμάστε ξανά"
          testID="error-retry-btn"
        >
          <Text style={styles.buttonText}>Δοκιμάστε ξανά</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F8FAFC',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#0D9488',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
