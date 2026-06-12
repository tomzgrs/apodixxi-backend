import React, { useState, useEffect, useContext } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, API_URL } from '../src/AuthContext';
import { useTheme } from '../src/ThemeContext';
import * as WebBrowser from 'expo-web-browser';
import AppleSignInButton from '../src/components/AppleSignInButton';
import GoogleSignInButton from '../src/components/GoogleSignInButton';
import { I18nContext } from './_layout';

WebBrowser.maybeCompleteAuthSession();

// App version - hardcoded for production stability
const APP_VERSION = '1.0.0';
const BUILD_NUMBER = '33';

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password';

export default function LoginScreen() {
  const { signUp, signIn, signInWithGoogle, signInWithApple, isLoading } = useAuth();
  const { theme, isDark } = useTheme();
  const { t } = useContext(I18nContext);
  
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
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('rememberMe').then(val => {
      if (val !== null) setRememberMe(val !== '0');
    });
    AsyncStorage.getItem('savedEmail').then(val => {
      if (val) setEmail(val);
    });
  }, []);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleEmailAuth = async () => {
    setError('');
    
    if (!email || !password) {
      setError(t('fill_all_fields'));
      return;
    }

    if (!validateEmail(email)) {
      setError(t('invalid_email'));
      return;
    }

    if (password.length < 8) {
      setError(t('password_min_8'));
      return;
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError(t('passwords_no_match'));
        return;
      }
    }

    try {
      if (mode === 'signup') {
        await signUp(email, password, name);
      } else {
        await signIn(email, password, rememberMe);
        if (rememberMe) {
          await AsyncStorage.setItem('savedEmail', email);
        } else {
          await AsyncStorage.removeItem('savedEmail');
        }
      }
    } catch (err: any) {
      setError(err.message || t('something_went_wrong'));
    }
  };

  const styles = createStyles(theme, isDark);

  if (mode === 'forgot-password') {
    const handleForgotPassword = async () => {
      setError('');
      if (!email) {
        setError(t('enter_your_email'));
        return;
      }
      if (!validateEmail(email)) {
        setError(t('invalid_email'));
        return;
      }
      
      setForgotPasswordLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        let data: any = {};
        try {
          data = await response.json();
        } catch {
          if (!response.ok) {
            setError(t('server_error_retry'));
            return;
          }
        }
        if (response.ok) {
          setForgotPasswordSuccess(true);
        } else {
          setError(data.detail || t('something_went_wrong'));
        }
      } catch (err: any) {
        setError(t('connection_error'));
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
              <Text style={styles.title}>{t('check_your_email')}</Text>
              <Text style={styles.subtitle}>
                {t('reset_email_sent')}
              </Text>
            </View>
            
            <View style={styles.form}>
              <TouchableOpacity 
                style={styles.primaryButton}
                accessibilityRole="button"
                accessibilityLabel={t('have_reset_code')}
                onPress={() => {
                  setMode('reset-password');
                  setForgotPasswordSuccess(false);
                }}
              >
                <Text style={styles.primaryButtonText}>{t('have_reset_code')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.primaryButton, { backgroundColor: theme.card, marginTop: 12 }]}
                accessibilityRole="button"
                accessibilityLabel={t('back_to_login')}
                onPress={() => {
                  setMode('login');
                  setForgotPasswordSuccess(false);
                  setEmail('');
                }}
              >
                <Text style={[styles.primaryButtonText, { color: theme.text }]}>{t('back_to_login')}</Text>
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
              <TouchableOpacity
                onPress={() => setMode('login')}
                style={styles.backButton}
                accessibilityRole="button"
                accessibilityLabel={t('back')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={24} color={theme.text} />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <Ionicons name="key" size={40} color={theme.primary} />
              </View>
              <Text style={styles.title}>{t('forgot_password_title')}</Text>
              <Text style={styles.subtitle}>{t('forgot_password_desc')}</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="mail" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={theme.textSecondary}
                  accessibilityLabel={t('email')}
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
                accessibilityRole="button"
                accessibilityLabel={t('send_code')}
              >
                {forgotPasswordLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>{t('send_code')}</Text>
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
        setError(t('enter_reset_code'));
        return;
      }
      if (!newPassword || newPassword.length < 8) {
        setError(t('password_min_8'));
        return;
      }
      
      setForgotPasswordLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, new_password: newPassword })
        });
        let data: any = {};
        try {
          data = await response.json();
        } catch {
          if (!response.ok) {
            setError(t('server_error_retry'));
            return;
          }
        }
        if (response.ok) {
          Alert.alert(
            t('success'),
            t('password_changed'),
            [{ text: 'OK', onPress: () => {
              setMode('login');
              setResetToken('');
              setNewPassword('');
            }}]
          );
        } else {
          setError(data.detail || t('something_went_wrong'));
        }
      } catch (err: any) {
        setError(t('connection_error'));
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
              <TouchableOpacity
                onPress={() => setMode('forgot-password')}
                style={styles.backButton}
                accessibilityRole="button"
                accessibilityLabel={t('back')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={24} color={theme.text} />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <Ionicons name="lock-open" size={40} color={theme.primary} />
              </View>
              <Text style={styles.title}>{t('new_password_title')}</Text>
              <Text style={styles.subtitle}>{t('enter_code_from_email')}</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="keypad" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { letterSpacing: 4, fontWeight: '600', fontSize: 18 }]}
                  placeholder="000000"
                  placeholderTextColor={theme.textSecondary}
                  accessibilityLabel={t('enter_reset_code')}
                  value={resetToken}
                  onChangeText={setResetToken}
                  autoCapitalize="none"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('new_password')}
                  placeholderTextColor={theme.textSecondary}
                  accessibilityLabel={t('new_password')}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  accessibilityRole="button"
                  accessibilityLabel={t('toggle_password_visibility')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity 
                style={[styles.primaryButton, forgotPasswordLoading && styles.buttonDisabled]} 
                onPress={handleResetPassword}
                disabled={forgotPasswordLoading}
                accessibilityRole="button"
                accessibilityLabel={t('change_password')}
              >
                {forgotPasswordLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>{t('change_password')}</Text>
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
              {mode === 'login' ? t('welcome') : t('create_account')}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {mode === 'signup' && (
              <View style={styles.inputContainer}>
                <Ionicons name="person" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('full_name')}
                  placeholderTextColor={theme.textSecondary}
                  accessibilityLabel={t('full_name')}
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
                accessibilityLabel={t('email')}
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
                placeholder={t('password')}
                placeholderTextColor={theme.textSecondary}
                accessibilityLabel={t('password')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                accessibilityRole="button"
                accessibilityLabel={t('toggle_password_visibility')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {mode === 'signup' && (
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('confirm_password')}
                  placeholderTextColor={theme.textSecondary}
                  accessibilityLabel={t('confirm_password')}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* Remember Me - only show on login */}
            {mode === 'login' && (
              <TouchableOpacity
                style={styles.rememberMeRow}
                onPress={() => setRememberMe(v => !v)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('remember_me')}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
                <Text style={[styles.rememberMeText, { color: theme.textSecondary }]}>
                  {t('remember_me')}
                </Text>
              </TouchableOpacity>
            )}

            {/* Forgot Password Link - only show on login */}
            {mode === 'login' && (
              <TouchableOpacity 
                style={styles.forgotPasswordContainer}
                onPress={() => setMode('forgot-password' as AuthMode)}
                accessibilityRole="button"
                accessibilityLabel={t('forgot_my_password')}
              >
                <Text style={styles.forgotPasswordText}>{t('forgot_my_password')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]} 
              onPress={handleEmailAuth}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel={mode === 'login' ? t('login') : t('signup')}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {mode === 'login' ? t('login') : t('signup')}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('or_continue_with')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialButtons}>
            <GoogleSignInButton
              onSignIn={(idToken, email) => signInWithGoogle(idToken, email, rememberMe)}
              isLoading={googleLoading}
              setIsLoading={setGoogleLoading}
              setError={setError}
              style={styles.socialButton}
            />

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
              {mode === 'login' ? t('no_account') : t('have_account')}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError('');
              }}
              accessibilityRole="button"
              accessibilityLabel={mode === 'login' ? t('signup') : t('login')}
            >
              <Text style={styles.toggleLink}>
                {mode === 'login' ? t('signup') : t('login')}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* App Version */}
          <Text style={styles.versionText}>
            {t('version')} {APP_VERSION} ({BUILD_NUMBER})
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
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#6b7280',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  rememberMeText: {
    fontSize: 14,
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
