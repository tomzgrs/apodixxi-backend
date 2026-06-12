import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockSignIn = jest.fn();
jest.mock('../src/AuthContext', () => ({
  __esModule: true,
  API_URL: 'http://test.local',
  useAuth: () => ({
    signUp: jest.fn(),
    signIn: mockSignIn,
    signInWithGoogle: jest.fn(),
    signInWithApple: jest.fn(),
    isLoading: false,
  }),
}));

jest.mock('../src/components/GoogleSignInButton', () => () => null);
jest.mock('../src/components/AppleSignInButton', () => () => null);

import LoginScreen from '../app/login';
import { ThemeProvider } from '../src/ThemeContext';

const renderLogin = () =>
  render(
    <ThemeProvider>
      <LoginScreen />
    </ThemeProvider>
  );

describe('LoginScreen email validation', () => {
  afterEach(() => jest.clearAllMocks());

  it('requires both fields', async () => {
    const { getByText } = renderLogin();
    fireEvent.press(getByText('Σύνδεση'));
    await waitFor(() =>
      expect(getByText('Παρακαλώ συμπληρώστε όλα τα πεδία')).toBeTruthy()
    );
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('rejects an invalid email', async () => {
    const { getByText, getByPlaceholderText } = renderLogin();
    fireEvent.changeText(getByPlaceholderText('Email'), 'not-an-email');
    fireEvent.changeText(getByPlaceholderText('Κωδικός'), 'password123');
    fireEvent.press(getByText('Σύνδεση'));
    await waitFor(() => expect(getByText('Μη έγκυρη διεύθυνση email')).toBeTruthy());
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('rejects a short password', async () => {
    const { getByText, getByPlaceholderText } = renderLogin();
    fireEvent.changeText(getByPlaceholderText('Email'), 'user@example.gr');
    fireEvent.changeText(getByPlaceholderText('Κωδικός'), 'short');
    fireEvent.press(getByText('Σύνδεση'));
    await waitFor(() =>
      expect(getByText('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες')).toBeTruthy()
    );
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('calls signIn with valid credentials', async () => {
    const { getByText, getByPlaceholderText } = renderLogin();
    fireEvent.changeText(getByPlaceholderText('Email'), 'user@example.gr');
    fireEvent.changeText(getByPlaceholderText('Κωδικός'), 'password123');
    fireEvent.press(getByText('Σύνδεση'));
    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith('user@example.gr', 'password123', true)
    );
  });
});
