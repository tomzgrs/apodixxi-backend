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
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import AppleSignInButton from '../src/components/AppleSignInButton';

WebBrowser.maybeCompleteAuthSession();

// Firebase Project: apodixxi-58736 (889769499922)
// For expo-auth-session, we use Web Client ID for all platforms (browser-based OAuth)
const GOOGLE_CLIENT_ID_WEB = '889769499922-mh96og0dig0nohhvgl6htv59qjqv147j.apps.googleusercontent.com';

type AuthMode = 'login' | 'signup' | 'phone' | 'phone-otp' | 'phone-email';

export default function LoginScreen() {
  const { signUp, signIn, signInWithGoogle, signInWithApple, requestPhoneOTP, verifyPhoneOTP, completePhoneAuth, isLoading } = useAuth();
  const { theme, isDark } = useTheme();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  // Google Sign-In configuration - use Web Client ID for expo-auth-session
  // expoClientId is required for production EAS builds
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: GOOGLE_CLIENT_ID_WEB,
    webClientId: GOOGLE_CLIENT_ID_WEB,
    scopes: ['profile', 'email'],
  });

  // Handle Google Sign-In response
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleGoogleSignIn(authentication.accessToken);
      }
    } else if (response?.type === 'error') {
      setError('Αποτυχία σύνδεσης με Google');
      setGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleSignIn = async (accessToken: string) => {
    try {
      setGoogleLoading(true);
      setError('');
      
      // Get user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (!userInfoResponse.ok) {
        throw new Error('Failed to get user info from Google');
      }
      
      const userInfo = await userInfoResponse.json();
      
      // Sign in with our backend
      await signInWithGoogle({
        email: userInfo.email,
        name: userInfo.name,
        googleId: userInfo.id,
        picture: userInfo.picture,
      });
    } catch (err: any) {
      setError(err.message || 'Αποτυχία σύνδεσης με Google');
    } finally {
      setGoogleLoading(false);
    }
  };

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
              style={[styles.socialButton, { backgroundColor: '#4285F4' }, (!request || googleLoading) && styles.buttonDisabled]}
              onPress={() => {
                setGoogleLoading(true);
                promptAsync();
              }}
              disabled={!request || googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#fff" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </>
              )}
            </TouchableOpacity>

            <AppleSignInButton
              onSignIn={signInWithApple}
              isLoading={appleLoading}
              setIsLoading={setAppleLoading}
              setError={setError}
            />

            <TouchableOpacity 
              style={[styles.socialButton, { backgroundColor: theme.primary }]}
              onPress={() => setMode('phone')}
            >
              <Ionicons name="call" size={20} color="#fff" />
              <Text style={styles.socialButtonText}>Τηλέφωνο</Text>
            </TouchableOpacity>
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
});
