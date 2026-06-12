import { Platform } from 'react-native';

let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  Haptics = null;
}

const available = (Platform.OS === 'ios' || Platform.OS === 'android') && !!Haptics;

export function hapticLight() {
  if (!available) return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {}
}

export function hapticMedium() {
  if (!available) return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (e) {}
}

export function hapticSelection() {
  if (!available) return;
  try {
    Haptics.selectionAsync();
  } catch (e) {}
}

export function hapticSuccess() {
  if (!available) return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (e) {}
}

export function hapticWarning() {
  if (!available) return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (e) {}
}

export function hapticError() {
  if (!available) return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (e) {}
}
