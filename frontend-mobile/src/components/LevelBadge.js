import { Text, View, StyleSheet } from 'react-native';
import { levelStyles } from '../theme/colors';

const labels = {
  Normal: 'Normal band',
  'Pre-Diabetic': 'Elevated band',
  Diabetic: 'High band',
};

export default function LevelBadge({ level, small }) {
  const s = levelStyles[level] || levelStyles.Normal;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.border }, small && styles.small]}>
      <Text style={[styles.text, { color: s.color }, small && styles.textSmall]}>
        {labels[level] || level}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, alignSelf: 'flex-start' },
  small: { paddingHorizontal: 8, paddingVertical: 2 },
  text: { fontSize: 11, fontWeight: '700' },
  textSmall: { fontSize: 10 },
});
