import './src/global.css';

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Home, Compass, User } from 'lucide-react-native';
import * as Linking from 'expo-linking';

import { AuthProvider, useAuth } from './src/lib/store/AuthContext';
import { AppProvider, useApp }   from './src/lib/store/AppContext';
import { createSessionFromUrl }  from './src/lib/auth';

import HomeScreen       from './src/screens/HomeScreen';
import DiscoverScreen   from './src/screens/DiscoverScreen';
import ProfileScreen    from './src/screens/ProfileScreen';
import LoginScreen      from './src/screens/LoginScreen';
import RegisterScreen   from './src/screens/RegisterScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

// ── Tab Navigator ──────────────────────────────────────────────────────────
export type RootTabParamList = {
  Anasayfa: undefined;
  Keşfet:   undefined;
  Profil:   undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const COLORS = {
  bg:       '#0a0a0a',
  border:   '#1a1a1a',
  active:   '#5b9cf6',
  inactive: '#555555',
  text:     '#dddddd',
};

// ── Ana tab navigatoru ────────────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bg,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor:   COLORS.active,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tab.Screen
        name="Anasayfa"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="Keşfet"
        component={DiscoverScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Compass color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="Profil"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ── Deep link handler — e-posta doğrulama + OAuth callback'leri yakalar ────
function useDeepLinkHandler() {
  const { session } = useAuth();

  const handleUrl = useCallback(async (url: string | null) => {
    if (!url) return;
    // Zaten giriş yapmışsa tekrar işleme
    if (session) return;
    // URL'de auth parametresi yoksa geç — normal sayfa yüklemesi
    if (!url.includes('access_token') && !url.includes('refresh_token') && !url.includes('error')) {
      return;
    }
    console.log('[DeepLink] Auth URL yakalandı:', url);
    try {
      const result = await createSessionFromUrl(url);
      if (result) {
        console.log('[DeepLink] Session oluşturuldu ✓');
      } else {
        console.log('[DeepLink] Token bulunamadı');
      }
    } catch (err) {
      console.warn('[DeepLink] Session oluşturulamadı:', err);
    }
  }, [session]);

  useEffect(() => {
    // 1) Uygulama bir linkten açıldıysa (cold start)
    Linking.getInitialURL().then(handleUrl);

    // 2) Uygulama açıkken gelen linkler (email doğrulama, OAuth redirect)
    const sub = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    // 3) Uygulama arka plana gidip geri geldiğinde pending URL kontrolü
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        Linking.getInitialURL().then(handleUrl);
      }
    });

    return () => {
      sub.remove();
      appStateSub.remove();
    };
  }, [handleUrl]);
}

// ── Giriş sonrası ana yönlendirici (Onboarding kontrolü) ─────────────────
function MainApp() {
  const { state } = useApp();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  // Kullanıcı henüz ilgi alanlarını ve kurulumu tamamlamamışsa Onboarding göster
  if (!state.onboardingCompleted && !onboardingDismissed) {
    return <OnboardingScreen onComplete={() => setOnboardingDismissed(true)} />;
  }

  return (
    <NavigationContainer>
      <MainTabs />
    </NavigationContainer>
  );
}

// ── Auth / Ana router ─────────────────────────────────────────────────────
function RootNavigator() {
  const { session, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  // Deep link'leri dinle (e-posta doğrulama + OAuth)
  useDeepLinkHandler();

  // Session yükleniyor
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#5b9cf6" size="large" />
      </View>
    );
  }

  // Giriş yapılmamış → Login veya Register
  if (!session) {
    if (showRegister) {
      return <RegisterScreen onGoLogin={() => setShowRegister(false)} />;
    }
    return <LoginScreen onGoRegister={() => setShowRegister(true)} />;
  }

  // Giriş yapılmış → Ana uygulama ve Onboarding kontrolü
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

// ── Kök bileşen ───────────────────────────────────────────────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
