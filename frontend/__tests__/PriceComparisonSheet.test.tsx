import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import PriceComparisonSheet from '../src/components/PriceComparisonSheet';
import { ThemeProvider } from '../src/ThemeContext';
import { api } from '../src/api';

const renderSheet = () =>
  render(
    <ThemeProvider>
      <PriceComparisonSheet
        visible
        description="ΓΑΛΑ"
        currentPrice={2}
        onClose={() => {}}
      />
    </ThemeProvider>
  );

describe('PriceComparisonSheet', () => {
  afterEach(() => jest.restoreAllMocks());

  it('renders the free tier with min/max prices', async () => {
    jest.spyOn(api, 'getProductPrices').mockResolvedValue({
      description: 'ΓΑΛΑ',
      tier: 'free',
      found: true,
      min_price: 1,
      max_price: 2,
      sample_count: 5,
    });
    const { getByText } = renderSheet();
    await waitFor(() => expect(getByText('Χαμηλότερη')).toBeTruthy());
    expect(getByText('Υψηλότερη')).toBeTruthy();
    expect(getByText('Free')).toBeTruthy();
  });

  it('renders the paid tier with store rows', async () => {
    jest.spyOn(api, 'getProductPrices').mockResolvedValue({
      description: 'ΓΑΛΑ',
      tier: 'paid',
      found: true,
      store_count: 2,
      results: [
        {
          store_name: 'LIDL',
          last_price: 1,
          last_date: '2026-01-01',
          mainCategory: '',
          subCategory: '',
          price_history: [],
        },
        {
          store_name: 'AB',
          last_price: 3,
          last_date: '2026-01-02',
          mainCategory: '',
          subCategory: '',
          price_history: [],
        },
      ],
    });
    const { getByText } = renderSheet();
    await waitFor(() => expect(getByText('apodixxi+')).toBeTruthy());
    expect(getByText('LIDL')).toBeTruthy();
    expect(getByText('AB')).toBeTruthy();
  });

  it('shows a connection error when the request fails', async () => {
    jest.spyOn(api, 'getProductPrices').mockRejectedValue(new Error('boom'));
    const { getByText } = renderSheet();
    await waitFor(() => expect(getByText('Σφάλμα σύνδεσης')).toBeTruthy());
  });
});
