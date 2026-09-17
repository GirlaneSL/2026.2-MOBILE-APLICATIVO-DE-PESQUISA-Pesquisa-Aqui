import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

function RootLayoutNav() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
                <ActivityIndicator size="large" color="#447762" />
            </View>
        );
    }

    // Se NÃO estiver logado, retorna apenas as telas públicas
    if (!isAuthenticated) {
        return (
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
            </Stack>
        );
    }

    // Se ESTIVER logado, retorna apenas o grupo protegido com as abas
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(app)" options={{ gestureEnabled: false }} />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <SafeAreaProvider>
                <RootLayoutNav />
            </SafeAreaProvider>
        </AuthProvider>
    );
}