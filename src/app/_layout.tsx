import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { FlightProvider } from '@/context/FlightContext';
import { Palette } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <FlightProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Palette.primary,
          tabBarInactiveTintColor: Palette.textMuted,
          tabBarStyle: {
            backgroundColor: Palette.surface,
            borderTopColor: Palette.border,
            borderTopWidth: 1,
            height: 62,
            paddingBottom: 8,
            paddingTop: 6,
            elevation: 3,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Radar',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'radio' : 'radio-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="airports"
          options={{
            title: 'Airports',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'business' : 'business-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="fares"
          options={{
            title: 'Fares',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'pricetag' : 'pricetag-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="alerts"
          options={{
            title: 'Alerts',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'notifications' : 'notifications-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="staff"
          options={{
            title: 'Staff Ops',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </FlightProvider>
  );
}
