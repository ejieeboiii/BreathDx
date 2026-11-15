import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export default function PatientCredentialsBanner({ email, password, onDismiss, title = 'Login credentials (shown once)' }) {
  if (!email || !password) return null;

  const copy = () => {
    const text = `Email: ${email}\nPassword: ${password}`;
    Alert.alert('Patient login credentials', text, [{ text: 'OK' }]);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.close}>×</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.hint}>Share with the patient. Password cannot be viewed again after dismiss.</Text>
      <View style={styles.row}>
        <View style={styles.box}>
          <Text style={styles.label}>EMAIL</Text>
          <Text style={styles.value}>{email}</Text>
        </View>
        <View style={styles.box}>
          <Text style={styles.label}>PASSWORD</Text>
          <Text style={styles.value}>{password}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.btn} onPress={copy}>
        <Text style={styles.btnText}>Copy credentials</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dce8f6',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#17324d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { color: '#1d5fd0', fontWeight: '700', fontSize: 14, flex: 1 },
  close: { color: '#728297', fontSize: 22, lineHeight: 22 },
  hint: { color: '#66788a', fontSize: 11, marginTop: 6, marginBottom: 12 },
  row: { gap: 8 },
  box: { backgroundColor: '#f3f6fb', borderRadius: 12, padding: 12, marginBottom: 8 },
  label: { fontSize: 10, color: '#728297', fontWeight: '600' },
  value: { color: '#263b50', fontSize: 13, marginTop: 4 },
  btn: { backgroundColor: '#1d5fd0', borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
