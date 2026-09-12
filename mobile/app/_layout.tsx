import { CustomTabBar } from '@/components/CustomTabBar';
import { Tabs } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
export default function TabLayout() {
    return (
        <SafeAreaProvider>
            {/* posso mudar a cor da barra que fica na camera do celular */}
            <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
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
            </SafeAreaView>
        </SafeAreaProvider>
    );
}