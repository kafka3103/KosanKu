import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Set up the notification handler for heads-up notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // This enables heads-up / pop-up
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request permission for notifications and get the native FCM token.
 * We use getDevicePushTokenAsync() because we are sending natively to Firebase,
 * instead of getExpoPushTokenAsync() which routes through Expo's servers.
 *
 * @returns {Promise<string|null>} The FCM push token, or null if failed.
 */
export async function registerForPushNotificationsAsync() {
  let token = null;

  if (Platform.OS === 'android') {
    // Android requires a notification channel for heads-up notifications (Importance MAX)
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    // Get the native device token (FCM for Android, APNs for iOS)
    // NOTE: To get FCM token on iOS requires configuring Firebase natively, 
    // but typically APNs token is returned on iOS here. 
    // If Supabase uses FCM HTTP v1, it can send to both if FCM is fully integrated on iOS.
    const tokenData = await Notifications.getDevicePushTokenAsync();
    token = tokenData.data;
    console.log('Native Push Token:', token);
  } catch (error) {
    console.warn('Error getting push token (Firebase may not be configured):', error.message);
  }

  return token;
}

/**
 * Schedule a local notification to be shown after a certain delay.
 * @param {string} title - The title of the notification.
 * @param {string} body - The body message of the notification.
 * @param {object} data - Optional data payload to pass with the notification.
 * @param {number} delaySeconds - Delay in seconds before showing the notification.
 */
export async function scheduleLocalNotification(title, body, data = {}, delaySeconds = 2) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: title,
      body: body,
      data: data,
      sound: true,
    },
    trigger: {
      seconds: delaySeconds,
      channelId: 'default',
    },
  });
}

/**
 * Setup listeners for foreground notifications and background/terminated notification interactions.
 * @param {function} onNotificationReceived - Callback when a notification is received in foreground.
 * @param {function} onNotificationResponse - Callback when a user taps a notification (background/terminated).
 * @returns {function} Cleanup function to remove listeners.
 */
export function setupNotificationListeners(onNotificationReceived, onNotificationResponse) {
  // Listener untuk Foreground Notification
  const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Foreground Notification Received:', notification);
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // Listener untuk interaksi pengguna (saat menekan banner notifikasi dari Background/Terminated)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification Response Received (Tapped):', response);
    if (onNotificationResponse) {
      onNotificationResponse(response);
    }
  });

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}
