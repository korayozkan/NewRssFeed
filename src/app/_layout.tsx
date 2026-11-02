import { Stack } from "expo-router";
import "../global.css";

import '@/src/global.css';

export default function Layout() {
  return (
    
    
      <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="login"
        options={{
          headerShown: false,
          animation: "slide_from_bottom",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: "Şifremi Unuttum",
          headerTintColor: "#2563EB",
          headerBackTitle: "Geri",
        }}
      />
    </Stack>
    
  
  );
}
