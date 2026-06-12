import { connectivity } from '../src/services/connectivity';

describe('connectivity', () => {
  beforeEach(() => connectivity._reset());

  it('starts in the online state', () => {
    expect(connectivity.isOnline()).toBe(true);
  });

  it('notifies subscribers on change, dedupes, and unsubscribes', () => {
    const seen: boolean[] = [];
    const unsub = connectivity.subscribe((o) => seen.push(o));

    connectivity.notifyOffline();
    connectivity.notifyOffline(); // same state -> no extra notification
    connectivity.notifyOnline();
    unsub();
    connectivity.notifyOffline(); // no subscriber should be called now

    expect(seen).toEqual([false, true]);
    expect(connectivity.isOnline()).toBe(false);
  });

  it('probe() marks online when the server responds with any status', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 404 })) as any;
    connectivity.notifyOffline();

    const result = await connectivity.probe();

    expect(result).toBe(true);
    expect(connectivity.isOnline()).toBe(true);
  });

  it('probe() marks offline when the network rejects', async () => {
    global.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as any;

    const result = await connectivity.probe();

    expect(result).toBe(false);
    expect(connectivity.isOnline()).toBe(false);
  });
});
