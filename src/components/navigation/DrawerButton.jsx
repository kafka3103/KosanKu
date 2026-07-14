import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';
import COLORS from '../../constants/colors';

const DrawerButton = ({ color = "#FFFFFF", style }) => {
  const navigation = useNavigation();

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      activeOpacity={0.7}
    >
      <Ionicons name="menu" size={28} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DrawerButton;
