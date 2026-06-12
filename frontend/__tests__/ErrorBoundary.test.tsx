import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

function Boom(): React.ReactElement {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    const { getByText, queryByTestId } = render(
      <ErrorBoundary>
        <Text>safe content</Text>
      </ErrorBoundary>
    );
    expect(getByText('safe content')).toBeTruthy();
    expect(queryByTestId('error-boundary-fallback')).toBeNull();
  });

  it('shows the fallback UI when a child throws', () => {
    const { getByTestId, getByText } = render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(getByTestId('error-boundary-fallback')).toBeTruthy();
    expect(getByText('Κάτι πήγε στραβά')).toBeTruthy();
    expect(getByTestId('error-retry-btn')).toBeTruthy();
  });

  it('clears the error state when retry is pressed', () => {
    let shouldThrow = true;
    function Maybe(): React.ReactElement {
      if (shouldThrow) throw new Error('boom');
      return <Text>recovered</Text>;
    }
    const { getByTestId, getByText } = render(
      <ErrorBoundary>
        <Maybe />
      </ErrorBoundary>
    );
    expect(getByTestId('error-boundary-fallback')).toBeTruthy();
    shouldThrow = false;
    fireEvent.press(getByTestId('error-retry-btn'));
    expect(getByText('recovered')).toBeTruthy();
  });
});
