import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './src/store/authContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { TaskListScreen } from './src/screens/TaskListScreen';
import { TaskDetailScreen } from './src/screens/TaskDetailScreen';
import { registerForPushNotificationsAsync } from './src/utils/notifications';

const Stack = createStackNavigator();

const NavigationRouter = () => {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Attempt to register for push notifications on boot
    registerForPushNotificationsAsync();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1E293B',
            shadowColor: 'transparent',
            elevation: 0,
          },
          headerTintColor: '#38BDF8',
          headerTitleStyle: {
            fontWeight: '700',
            color: '#F8FAFC',
          },
          cardStyle: { backgroundColor: '#0F172A' },
        }}
      >
        {user === null ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="TaskList"
              component={TaskListScreen}
              options={{ title: 'My Tasks' }}
            />
            <Stack.Screen
              name="TaskDetail"
              component={TaskDetailScreen}
              options={{ title: 'Task Details' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationRouter />
        <StatusBar style="light" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
