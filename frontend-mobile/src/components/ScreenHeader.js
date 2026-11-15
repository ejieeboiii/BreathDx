import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLogout } from '../hooks/useLogout';

export default function ScreenHeader({
  title,
  subtitle,
  accent = '#dceaff',
  showLogout = true,
  headerStyle,
  titleStyle,
  subtitleStyle,
  userStyle,
  logoutStyle,
  logoutTextStyle,
  logoutColor = '#fff',
}) {
  const { user } = useAuth();
  const { handleLogout, loggingOut } = useLogout();

  return (
    <View style={[styles.wrap, headerStyle]}>
      <View style={styles.left}>
        <Text style={[styles.title, titleStyle]}>{title}</Text>
        {subtitle ? <Text style={[styles.sub, subtitleStyle]}>{subtitle}</Text> : null}
        {user?.full_name ? (
          <Text style={[styles.user, { color: accent }, userStyle]}>{user.full_name}</Text>
        ) : null}
      </View>
      {showLogout && (
        <TouchableOpacity
          onPress={handleLogout}
          disabled={loggingOut}
          style={[styles.logout, loggingOut && styles.logoutDisabled, logoutStyle]}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color={logoutColor} />
          ) : (
            <Text style={[styles.logoutText, logoutTextStyle]}>Logout</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#1556ad',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 28,
    borderBottomLeftRadius: 38,
    borderBottomRightRadius: 22,
  },
  left: { flex: 1, paddingRight: 12 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.82)', marginTop: 8 },
  user: { fontSize: 12, marginTop: 10, fontWeight: '600' },
  logout: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 24,
    minWidth: 88,
    alignItems: 'center',
    marginTop: 6,
  },
  logoutDisabled: { opacity: 0.6 },
  logoutText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
