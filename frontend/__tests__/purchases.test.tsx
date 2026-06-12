import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useFocusEffect: (cb: any) => {
    const r = require('react');
    r.useEffect(() => {
      cb();
    }, []);
  },
}));

import PurchasesScreen from '../app/(tabs)/purchases';
import { ThemeProvider } from '../src/ThemeContext';
import { api } from '../src/api';

const renderScreen = () =>
  render(
    <ThemeProvider>
      <PurchasesScreen />
    </ThemeProvider>
  );

describe('PurchasesScreen', () => {
  afterEach(() => jest.restoreAllMocks());

  it('shows the empty state when there are no receipts', async () => {
    jest.spyOn(api, 'getReceipts').mockResolvedValue({ receipts: [], total: 0 });
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('Δεν υπάρχουν αποδείξεις')).toBeTruthy());
  });

  it('renders receipt cards with store name and total', async () => {
    jest.spyOn(api, 'getReceipts').mockResolvedValue({
      receipts: [
        { id: 'r1', store_name: 'LIDL', date: '2026-01-01', total: 12.5, items: [{}, {}] },
      ],
      total: 1,
    });
    const { getByText, getByTestId } = renderScreen();
    await waitFor(() => expect(getByText('LIDL')).toBeTruthy());
    expect(getByText('12.50€')).toBeTruthy();
    expect(getByTestId('receipt-card-r1')).toBeTruthy();
  });
});
