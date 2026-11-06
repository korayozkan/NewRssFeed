import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DiscoverScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-row items-center px-4 py-3 border-b border-card-border">
        <Text className="text-white text-xl font-bold">Keşfet</Text>
      </View>
      <View className="flex-1 items-center justify-center">
        <Text className="text-muted text-base">Yakında</Text>
      </View>
    </SafeAreaView>
  );
}
