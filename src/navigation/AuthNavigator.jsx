/**
 * navigation/AuthNavigator.jsx
 * Stack Navigator untuk alur autentikasi:
 * Login → Register → OTP → ProfileSetup
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import LoginScreen from '../screens/shared/LoginScreen';
import RegisterScreen from '../screens/shared/RegisterScreen';
import ForgotPasswordScreen from '../screens/shared/ForgotPasswordScreen';
import OtpVerificationScreen from '../screens/shared/OtpVerificationScreen';
import ResetPasswordScreen from '../screens/shared/ResetPasswordScreen';
import COLORS from '../constants/colors';
import { AUTH_SCREENS } from '../constants/screenNames';

export { AUTH_SCREENS }; // re-export untuk backward compatibility sementara

const AuthStack = createStackNavigator();

const AuthNavigator = () => {

  return (
    <AuthStack.Navigator
      initialRouteName={AUTH_SCREENS.LOGIN}
      screenOptions={{
        headerShown: false,     // Header dikustom di masing-masing screen
        cardStyle: { backgroundColor: COLORS.background },
        // Transisi halus antar layar auth
        cardStyleInterpolator: ({ current, layouts }) => ({
          cardStyle: {
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.width, 0],
                }),
              },
            ],
          },
        }),
      }}
    >
      <AuthStack.Screen name={AUTH_SCREENS.LOGIN} component={LoginScreen} />
      <AuthStack.Screen name={AUTH_SCREENS.REGISTER} component={RegisterScreen} />
      <AuthStack.Screen name={AUTH_SCREENS.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
      <AuthStack.Screen name={AUTH_SCREENS.OTP_VERIFICATION} component={OtpVerificationScreen} />
      <AuthStack.Screen name={AUTH_SCREENS.RESET_PASSWORD} component={ResetPasswordScreen} options={{ gestureEnabled: false }} />
    </AuthStack.Navigator>
  );
};

export default AuthNavigator;
