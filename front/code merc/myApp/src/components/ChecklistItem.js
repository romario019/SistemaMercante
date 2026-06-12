import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function ChecklistItem({ itemText, gravity, onSelect, selectedOption, positiveLabel = "SIM", negativeLabel = "NÃO" }) {
  const { theme, isDark } = useTheme();
  const styles = getStyles(theme, isDark);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.questionText}>{itemText}</Text>
        
        {gravity && (
           <View style={[styles.badge, { 
             backgroundColor: gravity === 'CRÍTICO' ? 'rgba(239, 68, 68, 0.15)' : (gravity === 'MÉDIO' ? 'rgba(245, 124, 0, 0.15)' : 'rgba(2, 136, 209, 0.15)') 
           }]}>
              <Text style={[styles.badgeText, { 
                color: gravity === 'CRÍTICO' ? theme.danger : (gravity === 'MÉDIO' ? theme.warning : theme.primary) 
              }]}>{gravity}</Text>
           </View>
        )}
      </View>

      <View style={styles.buttonRow}>
        {/* Botão Positivo: Forçando o visual para "SIM" */}
        <TouchableOpacity
          style={[styles.btn, selectedOption === positiveLabel && styles.btnOkSelected]}
          onPress={() => onSelect(itemText, positiveLabel)}
        >
          <Text style={[styles.btnText, selectedOption === positiveLabel && styles.btnTextSelected]}>
            SIM
          </Text>
        </TouchableOpacity>
        
        {/* Botão Negativo: Forçando o visual para "NÃO" */}
        <TouchableOpacity
          style={[styles.btn, selectedOption === negativeLabel && styles.btnNokSelected]}
          onPress={() => onSelect(itemText, negativeLabel)}
        >
          <Text style={[styles.btnText, selectedOption === negativeLabel && styles.btnTextSelected]}>
            NÃO
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (theme, isDark) => StyleSheet.create({
  card: {
    backgroundColor: theme.cardBackground,
    padding: 18,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? "rgba(255,255,255,0.03)" : theme.lightGray,
    elevation: isDark ? 1 : 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.textPrimary,
    marginRight: 15,
    lineHeight: 22,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  btn: {
    flex: 0.48,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.lightGray,
    alignItems: 'center',
    backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
  },
  btnOkSelected: {
    backgroundColor: "rgba(0, 230, 118, 0.15)",
    borderColor: theme.success,
  },
  btnNokSelected: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: theme.danger,
  },
  btnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.textSecondary,
  },
  btnTextSelected: {
    color: theme.textPrimary,
  }
});