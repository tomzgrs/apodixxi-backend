import { classifyReceiptUrl } from '../src/services/receiptUrl';

describe('classifyReceiptUrl', () => {
  it('classifies directly-supported providers as "supported"', () => {
    expect(classifyReceiptUrl('https://www1.e-invoicing.gr/abc')).toBe('supported');
    expect(classifyReceiptUrl('https://einvoice.impact.gr/x')).toBe('supported');
    expect(classifyReceiptUrl('https://app.entersoftone.gr/y')).toBe('supported');
  });

  it('classifies Epsilon providers as "epsilon"', () => {
    expect(classifyReceiptUrl('https://www.epsilondigital.gr/z')).toBe('epsilon');
    expect(classifyReceiptUrl('https://einvoice.epsilonnet.gr/q')).toBe('epsilon');
  });

  it('classifies any other URL as "http"', () => {
    expect(classifyReceiptUrl('https://example.com/receipt')).toBe('http');
    expect(classifyReceiptUrl('http://foo.bar')).toBe('http');
  });

  it('classifies non-URL payloads as "invalid"', () => {
    expect(classifyReceiptUrl('just some text')).toBe('invalid');
    expect(classifyReceiptUrl('')).toBe('invalid');
    expect(classifyReceiptUrl('ftp://foo')).toBe('invalid');
  });

  it('prioritises "supported" over "epsilon" when both substrings appear', () => {
    expect(
      classifyReceiptUrl('https://e-invoicing.gr/redirect?to=epsilondigital')
    ).toBe('supported');
  });
});
