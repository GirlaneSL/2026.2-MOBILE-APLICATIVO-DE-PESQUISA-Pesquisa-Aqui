import { CustomTabBar } from '@/components/CustomTabBar';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
    return (
        <Tabs tabBar={(props) => <CustomTabBar {...props} />}>

            <Tabs.Screen
                name="(home)/index"
                options={{ title: 'Home', headerShown: false }}
            />

            <Tabs.Screen
                name="pesquisas/index"
                options={{ title: 'Pesquisas', headerShown: false }}
            />

            <Tabs.Screen
                name="sincronizacao/index"
                options={{ title: 'Sinc', headerShown: false }}
            />
            
            <Tabs.Screen
                name="usuario/index"
                options={{ title: 'Perfil', headerShown: false }}
            />

        </Tabs>
    );
}