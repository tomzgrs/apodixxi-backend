import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/AuthContext';
import { useTheme } from '../src/ThemeContext';
import * as WebBrowser from 'expo-web-browser';
import AppleSignInButton from '../src/components/AppleSignInButton';

WebBrowser.maybeCompleteAuthSession();

// App version - hardcoded for production stability
const APP_VERSION = '1.0.0';
const BUILD_NUMBER = '33';

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password';

export default function LoginScreen() {
  const { signUp, signIn, signInWithGoogle, signInWithApple, isLoading } = useAuth();
  const { theme, isDark } = useTheme();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleEmailAuth = async () => {
    setError('');
    
    if (!email || !password) {
      setError('Παρακαλώ συμπληρώστε όλα τα πεδία');
      return;
    }

    if (!validateEmail(email)) {
      setError('Μη έγκυρη διεύθυνση email');
      return;
    }

    if (password.length < 8) {
      setError('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες');
      return;
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Οι κωδικοί δεν ταιριάζουν');
        return;
      }
    }

    try {
      if (mode === 'signup') {
        await signUp(email, password, name);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Κάτι πήγε στραβά');
    }
  };

  const handleRequestOTP = async () => {
    setError('');
    
    if (!phone) {
      setError('Παρακαλώ εισάγετε τον αριθμό τηλεφώνου');
      return;
    }

    // Format phone number
    let formattedPhone = phone;
    if (!phone.startsWith('+')) {
      formattedPhone = '+30' + phone; // Default to Greece
    }

    try {
      const mockCode = await requestPhoneOTP(formattedPhone);
      setPhone(formattedPhone);
      setMode('phone-otp');
      Alert.alert('OTP Στάλθηκε', 'Ένα SMS με κωδικό επαλήθευσης στάλθηκε στο τηλέφωνό σας.');
    } catch (err: any) {
      setError(err.message || 'Αποτυχία αποστολής OTP');
    }
  };

  const handleVerifyOTP = async () => {
    setError('');
    
    if (!otp || otp.length !== 6) {
      setError('Παρακαλώ εισάγετε τον 6ψήφιο κωδικό');
      return;
    }

    try {
      await verifyPhoneOTP(phone, otp);
      setMode('phone-email');
    } catch (err: any) {
      setError(err.message || 'Μη έγκυρος κωδικός OTP');
    }
  };

  const handleCompletePhoneAuth = async () => {
    setError('');
    
    if (!email) {
      setError('Παρακαλώ εισάγετε το email σας');
      return;
    }

    if (!validateEmail(email)) {
      setError('Μη έγκυρη διεύθυνση email');
      return;
    }

    try {
      await completePhoneAuth(phone, email);
    } catch (err: any) {
      setError(err.message || 'Αποτυχία ολοκλήρωσης εγγραφής');
    }
  };

  const styles = createStyles(theme, isDark);

  // Phone OTP Step
  if (mode === 'phone-otp') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setMode('phone')} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={styles.title}>Επαλήθευση</Text>
              <Text style={styles.subtitle}>Εισάγετε τον 6ψήφιο κωδικό</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="keypad" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="000000"
                  placeholderTextColor={theme.textSecondary}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity 
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]} 
                onPress={handleVerifyOTP}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Επαλήθευση</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleRequestOTP} style={styles.linkButton}>
                <Text style={styles.linkText}>Αποστολή νέου κωδικού</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Forgot Password Screen
  if (mode === 'forgot-password') {
    const handleForgotPassword = async () => {
      setError('');
      if (!email) {
        setError('Παρακαλώ εισάγετε το email σας');
        return;
      }
      if (!validateEmail(email)) {
        setError('Μη έγκυρη διεύθυνση email');
        return;
      }
      
      setForgotPasswordLoading(true);
      try {
        const response = await fetch(`${require('../src/AuthContext').API_URL}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (response.ok) {
          setForgotPasswordSuccess(true);
        } else {
          setError(data.detail || 'Κάτι πήγε στραβά');
        }
      } catch (err: any) {
        setError(err.message || 'Κάτι πήγε στραβά');
      } finally {
        setForgotPasswordLoading(false);
      }
    };

    if (forgotPasswordSuccess) {
      return (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Ionicons name="mail-open" size={40} color={theme.primary} />
              </View>
              <Text style={styles.title}>Ελέγξτε το Email σας</Text>
              <Text style={styles.subtitle}>
                Αν υπάρχει λογαριασμός με αυτό το email, θα λάβετε οδηγίες για επαναφορά κωδικού.
              </Text>
            </View>
            
            <View style={styles.form}>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={() => {
                  setMode('reset-password');
                  setForgotPasswordSuccess(false);
                }}
              >
                <Text style={styles.primaryButtonText}>Έχω τον κωδικό επαναφοράς</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.primaryButton, { backgroundColor: theme.card, marginTop: 12 }]}
                onPress={() => {
                  setMode('login');
                  setForgotPasswordSuccess(false);
                  setEmail('');
                }}
              >
                <Text style={[styles.primaryButtonText, { color: theme.text }]}>Επιστροφή στη σύνδεση</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setMode('login')} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.text} />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <Ionicons name="key" size={40} color={theme.primary} />
              </View>
              <Text style={styles.title}>Ξέχασα τον κωδικό</Text>
              <Text style={styles.subtitle}>Εισάγετε το email σας για να λάβετε κωδικό επαναφοράς</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="mail" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={theme.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity 
                style={[styles.primaryButton, forgotPasswordLoading && styles.buttonDisabled]} 
                onPress={handleForgotPassword}
                disabled={forgotPasswordLoading}
              >
                {forgotPasswordLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Αποστολή κωδικού</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Reset Password Screen
  if (mode === 'reset-password') {
    const handleResetPassword = async () => {
      setError('');
      if (!resetToken) {
        setError('Παρακαλώ εισάγετε τον κωδικό επαναφοράς');
        return;
      }
      if (!newPassword || newPassword.length < 8) {
        setError('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες');
        return;
      }
      
      setForgotPasswordLoading(true);
      try {
        const response = await fetch(`${require('../src/AuthContext').API_URL}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, new_password: newPassword })
        });
        const data = await response.json();
        if (response.ok) {
          Alert.alert(
            'Επιτυχία!',
            'Ο κωδικός σας άλλαξε. Μπορείτε τώρα να συνδεθείτε.',
            [{ text: 'OK', onPress: () => {
              setMode('login');
              setResetToken('');
              setNewPassword('');
            }}]
          );
        } else {
          setError(data.detail || 'Κάτι πήγε στραβά');
        }
      } catch (err: any) {
        setError(err.message || 'Κάτι πήγε στραβά');
      } finally {
        setForgotPasswordLoading(false);
      }
    };

    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setMode('forgot-password')} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.text} />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <Ionicons name="lock-open" size={40} color={theme.primary} />
              </View>
              <Text style={styles.title}>Νέος Κωδικός</Text>
              <Text style={styles.subtitle}>Εισάγετε τον κωδικό που λάβατε στο email</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="keypad" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { letterSpacing: 4, fontWeight: '600', fontSize: 18 }]}
                  placeholder="XXXXXX"
                  placeholderTextColor={theme.textSecondary}
                  value={resetToken}
                  onChangeText={(text) => setResetToken(text.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={6}
                  autoFocus
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Νέος κωδικός"
                  placeholderTextColor={theme.textSecondary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity 
                style={[styles.primaryButton, forgotPasswordLoading && styles.buttonDisabled]} 
                onPress={handleResetPassword}
                disabled={forgotPasswordLoading}
              >
                {forgotPasswordLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Αλλαγή κωδικού</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Phone Email Step
  if (mode === 'phone-email') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setMode('phone-otp')} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={styles.title}>Σχεδόν έτοιμο!</Text>
              <Text style={styles.subtitle}>Εισάγετε το email σας για να ολοκληρώσετε</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="mail" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={theme.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity 
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]} 
                onPress={handleCompletePhoneAuth}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Ολοκλήρωση</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Phone Number Input
  if (mode === 'phone') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setMode('login')} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={styles.title}>Σύνδεση με Τηλέφωνο</Text>
              <Text style={styles.subtitle}>Θα σας στείλουμε κωδικό επαλήθευσης</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="call" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="+30 697 xxx xxxx"
                  placeholderTextColor={theme.textSecondary}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoFocus
                />
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity 
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]} 
                onPress={handleRequestOTP}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Αποστολή Κωδικού</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Main Login/Signup Screen
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Logo & Title */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="receipt" size={48} color={theme.primary} />
            </View>
            <Text style={styles.title}>apodixxi</Text>
            <Text style={styles.subtitle}>
              {mode === 'login' ? 'Καλώς ήρθατε!' : 'Δημιουργία λογαριασμού'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {mode === 'signup' && (
              <View style={styles.inputContainer}>
                <Ionicons name="person" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ονοματεπώνυμο"
                  placeholderTextColor={theme.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="mail" size={20} color={theme.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={theme.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed" size={20} color={theme.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Κωδικός"
                placeholderTextColor={theme.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {mode === 'signup' && (
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Επιβεβαίωση κωδικού"
                  placeholderTextColor={theme.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* Forgot Password Link - only show on login */}
            {mode === 'login' && (
              <TouchableOpacity 
                style={styles.forgotPasswordContainer}
                onPress={() => setMode('forgot-password' as AuthMode)}
              >
                <Text style={styles.forgotPasswordText}>Ξέχασα τον κωδικό μου</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]} 
              onPress={handleEmailAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {mode === 'login' ? 'Σύνδεση' : 'Εγγραφή'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ή συνεχίστε με</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialButtons}>
            <TouchableOpacity 
              style={[styles.socialButton, { backgroundColor: '#4285F4', opacity: 0.6 }]}
              onPress={() => {
                Alert.alert(
                  'Google Sign-In',
                  'Η σύνδεση με Google δεν είναι διαθέσιμη προσωρινά. Παρακαλώ χρησιμοποιήστε email.',
                  [{ text: 'OK' }]
                );
              }}
            >
              <Ionicons name="logo-google" size={20} color="#fff" />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>

            <AppleSignInButton
              onSignIn={signInWithApple}
              isLoading={appleLoading}
              setIsLoading={setAppleLoading}
              setError={setError}
            />
          </View>

          {/* Toggle Login/Signup */}
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {mode === 'login' ? 'Δεν έχετε λογαριασμό;' : 'Έχετε ήδη λογαριασμό;'}
            </Text>
            <TouchableOpacity onPress={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError('');
            }}>
              <Text style={styles.toggleLink}>
                {mode === 'login' ? 'Εγγραφή' : 'Σύνδεση'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* App Version */}
          <Text style={styles.versionText}>
            Έκδοση {APP_VERSION} ({BUILD_NUMBER})
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(13, 148, 136, 0.1)' : 'rgba(13, 148, 136, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.text,
  },
  eyeButton: {
    padding: 8,
  },
  error: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  forgotPasswordText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  mockOtp: {
    color: theme.primary,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
    backgroundColor: isDark ? 'rgba(13, 148, 136, 0.1)' : 'rgba(13, 148, 136, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.border,
  },
  dividerText: {
    color: theme.textSecondary,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  socialButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 140,
    justifyContent: 'center',
  },
  socialButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  toggleText: {
    color: theme.textSecondary,
    fontSize: 14,
  },
  toggleLink: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: theme.primary,
    fontSize: 14,
  },
  versionText: {
    textAlign: 'center',
    color: theme.textSecondary,
    fontSize: 12,
    marginTop: 24,
    marginBottom: 16,
    opacity: 0.7,
  },
});
