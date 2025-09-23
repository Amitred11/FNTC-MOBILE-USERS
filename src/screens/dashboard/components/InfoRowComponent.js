import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts';

const getStyles = (theme) =>
  StyleSheet.create({
    infoRow: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      marginBottom: 20,
    },
    infoIcon: { marginRight: 15, marginTop: 2 },
    infoLabel: { color: theme.textSecondary, fontSize: 12 },
    infoValue: { color: theme.text, fontSize: 16, fontWeight: '500' },
    infoValueNotSet: {
      color: theme.textSecondary,
      fontSize: 16,
      fontStyle: 'italic',
      fontWeight: '500',
    },
  });

const InfoRowComponent = React.memo(({ icon, label, value }) => {
  const { theme } = useTheme(); // Consume theme directly
  const styles = useMemo(() => getStyles(theme), [theme]); // Memoize styles

  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={24} color={theme.primary} style={styles.infoIcon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={value ? styles.infoValue : styles.infoValueNotSet}>{value || 'Not set'}</Text>
      </View>
    </View>
  );
});

export default InfoRowComponent;