import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';

export const OfflineBanner: React.FC = () => {
  const netInfo = useNetInfo();
  
  // Note: netInfo.isConnected can be null during initial detection.
  // We explicitly show the offline warning only when isConnected is false.
  if (netInfo.isConnected === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>⚠️ Showing cached data (Offline mode)</Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F59E0B', // Warm Amber/Orange
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.25,
  },
});
