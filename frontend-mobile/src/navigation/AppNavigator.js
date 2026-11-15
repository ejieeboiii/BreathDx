import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import LoadingView from '../components/LoadingView';

import AuthScreen from '../screens/AuthScreen';

import MedicalDashboardScreen from '../screens/medical/DashboardScreen';
import PatientsScreen from '../screens/medical/PatientsScreen';
import ReadingsScreen from '../screens/medical/ReadingsScreen';
import LiveScanScreen from '../screens/medical/LiveScanScreen';
import TrendsScreen from '../screens/medical/TrendsScreen';

import PatientDashboardScreen from '../screens/patient/DashboardScreen';
import MyResultsScreen from '../screens/patient/MyResultsScreen';
import MyTrendScreen from '../screens/patient/MyTrendScreen';
import HealthTipsScreen from '../screens/patient/HealthTipsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, color }) {
  const icons = {
    Dashboard: '⌂',
    Patients: '●',
    Readings: '■',
    Trends: '📈',
    'Live Scan': '⚡',
    Results: '▤',
    Trend: '▥',
    Tips: '♧',
  };
  return (
    <Text style={{ fontSize: 20, color }}>
      {icons[name] || '•'}
    </Text>
  );
}

const tabScreenOptions = (activeColor) => ({
  headerShown: false,
  tabBarStyle: styles.appTabBar,
  tabBarActiveTintColor: activeColor,
  tabBarInactiveTintColor: '#78889a',
  tabBarLabelStyle: styles.tabLabel,
  tabBarItemStyle: styles.tabItem,
});

const styles = StyleSheet.create({
  appTabBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    height: 88,
    backgroundColor: '#fff',
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: '#e3eaf1',
    borderRadius: 30,
    paddingTop: 8,
    paddingBottom: 10,
    shadowColor: '#17324d',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 8,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  tabItem: { paddingVertical: 3 },
});

function MedicalTabs() {
  const active = '#1d5fd0';
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...tabScreenOptions(active),
        tabBarIcon: ({ color }) => <TabIcon name={route.name} color={color} />,
      })}
    >
      <Tab.Screen name="Dashboard" component={MedicalDashboardScreen} />
      <Tab.Screen name="Patients" component={PatientsScreen} />
      <Tab.Screen name="Readings" component={ReadingsScreen} />
      <Tab.Screen name="Trends" component={TrendsScreen} />
      <Tab.Screen name="Live Scan" component={LiveScanScreen} options={{ tabBarLabel: 'Scan' }} />
    </Tab.Navigator>
  );
}

function PatientTabs() {
  const active = '#1d5fd0';
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...tabScreenOptions(active),
        tabBarIcon: ({ color }) => <TabIcon name={route.name} color={color} />,
      })}
    >
      <Tab.Screen name="Dashboard" component={PatientDashboardScreen} />
      <Tab.Screen name="Results" component={MyResultsScreen} />
      <Tab.Screen name="Trend" component={MyTrendScreen} />
      <Tab.Screen name="Tips" component={HealthTipsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, role, loading } = useAuth();

  if (loading) return <LoadingView />;

  return (
    <NavigationContainer>
      {user ? (
        <Stack.Navigator key={role || 'main'} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={role === 'patient' ? PatientTabs : MedicalTabs} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator key="auth" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
