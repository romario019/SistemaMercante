import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { SIZES } from "../colors/theme";
import { useTheme } from "../context/ThemeContext";

export default function AdminDashboardScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const styles = getStyles(theme, isDark);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      
      {/* HEADER DO PAINEL */}
      <View style={styles.header}>
        <TouchableOpacity style={{ marginRight: 15 }} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Painel Administrativo</Text>
      </View>

      {/* ÁREA DOS CARD-BOTÕES */}
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={Platform.OS === "web"}
      >
        <Text style={styles.sectionTitle}>Gerenciamento de Sistema</Text>

        {/* CARD: GERENCIAR USUÁRIOS */}
        <TouchableOpacity 
          style={[styles.menuCard, { borderLeftColor: theme.primary }]} 
          onPress={() => navigation.navigate("UserManagement")}
        >
          <View style={[styles.iconWrapper, { backgroundColor: "rgba(2, 136, 209, 0.1)" }]}>
            <Ionicons name="people" size={28} color={theme.primary} />
          </View>
          <View style={styles.cardTextWrapper}>
            <Text style={styles.cardTitle}>Gerenciar Usuários</Text>
            <Text style={styles.cardDescription}>Controle de acessos, permissões de cargo e senhas da equipe.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.lightGray} />
        </TouchableOpacity>

        {/* CARD: GERENCIAR PERGUNTAS */}
        <TouchableOpacity 
          style={[styles.menuCard, { borderLeftColor: theme.textSecondary }]} 
          onPress={() => navigation.navigate("ManageQuestions")}
        >
          <View style={[styles.iconWrapper, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]}>
            <Ionicons name="list" size={28} color={theme.textSecondary} />
          </View>
          <View style={styles.cardTextWrapper}>
            <Text style={styles.cardTitle}>Gerenciar Perguntas</Text>
            <Text style={styles.cardDescription}>Edite perguntas dos checklists de Máquinas e do programa 5S.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.lightGray} />
        </TouchableOpacity>

        {/* CARD: GERENCIAR EQUIPAMENTOS */}
        <TouchableOpacity 
          style={[styles.menuCard, { borderLeftColor: "#607D8B" }]} 
          onPress={() => navigation.navigate("ManageEquipment")}
        >
          <View style={[styles.iconWrapper, { backgroundColor: "rgba(96, 125, 139, 0.1)" }]}>
            <Ionicons name="construct" size={28} color="#607D8B" />
          </View>
          <View style={styles.cardTextWrapper}>
            <Text style={styles.cardTitle}>Gerenciar Equipamentos</Text>
            <Text style={styles.cardDescription}>Cadastre ou remova empilhadeiras, transpaleteiras e coletores.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.lightGray} />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background, ...(Platform.OS === "web" ? { maxHeight: "100vh", overflow: "hidden" } : {}) },
  header: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 15, flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: theme.textPrimary },
  
  scrollContent: { paddingHorizontal: 15, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: "bold", color: theme.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 15, marginTop: 15, marginLeft: 5 },
  
  menuCard: { backgroundColor: theme.cardBackground, borderRadius: 12, padding: 18, marginBottom: 15, flexDirection: "row", alignItems: "center", borderLeftWidth: 4, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.02)" : theme.lightGray, elevation: isDark ? 0 : 2 },
  iconWrapper: { width: 50, height: 50, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 15 },
  
  cardTextWrapper: { flex: 1, paddingRight: 10 },
  cardTitle: { fontSize: 17, fontWeight: "bold", color: theme.textPrimary, marginBottom: 4 },
  cardDescription: { fontSize: 13, color: theme.textSecondary, lineHeight: 18 }
});