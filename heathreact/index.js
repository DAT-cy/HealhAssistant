import { registerRootComponent } from 'expo';
import '@/global.css';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from '@/routes/RootNavigator';

registerRootComponent(function App() {
  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
});
