import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('⚠️ Failed to get push token for push notification!');
    return null;
  }

  try {
    // In newer Expo versions, getExpoPushTokenAsync needs a projectId.
    // If not supplied, it tries to fetch it from app.json. We try catch it.
    const tokenData = await Notifications.getExpoPushTokenAsync();
    token = tokenData.data;
    console.log('🚀 Registered Push Token:', token);
  } catch (error) {
    console.log('⚠️ Could not obtain Expo Push Token (might be simulator or missing projectId):', error);
  }

  return token;
}
