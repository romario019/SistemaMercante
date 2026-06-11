import React, { useState, useCallback } from "react";
import {
  StyleSheet, Text, View, TouchableOpacity, StatusBar, FlatList,
  Alert, Image, ActivityIndicator, Platform, Modal
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native"; 
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

const USER_NAME_KEY = "@userName";

const CHECKLIST_ITEMS = [
  { key: "combustao", title: "Empilhadeira a Combustão", icon: "fuel" },
  { key: "eletrica", title: "Empilhadeira Elétrica", icon: "battery-charging" },
  { key: "transpaleteira", title: "Transpaleteira", imageUrl: require("../../assets/transpaleteira_menu.png") },
  { key: "paleteira", title: "Paleteira", imageUrl: require("../../assets/paleteira_menu.png") },
  { key: "coletores", title: "Coletores", icon: "barcode-scan" },
  { key: "5s", title: "Auditoria 5S", icon: "clipboard-check-outline" },
];

export default function MenuScreen({ navigation }) {
  const { theme, isDark, toggleTheme } = useTheme(); 
  const styles = getStyles(theme, isDark); 

  const [loading, setLoading] = useState(true);
  const [apiData, setApiData] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  
  // 👇 Estado para controlar a visibilidade do card do perfil 👇
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
      AsyncStorage.getItem("@userRole").then(role => setUserRole(role || ""));
      AsyncStorage.getItem(USER_NAME_KEY).then(name => setUserName(name || "Utilizador"));
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const { fetchConfig } = require("../services/api");
      const data = await fetchConfig();
      setApiData(data);
    } catch (e) {
      Alert.alert("Atenção", "Falha na ligação. Verifique a sua rede.");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (nameStr) => {
    if (!nameStr || nameStr === "Utilizador") return "US";
    const parts = nameStr.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleChecklistPress = async (itemTitle) => {
    if (!apiData) return;
    try {
      const currentUserName = await AsyncStorage.getItem(USER_NAME_KEY);
      const now = new Date();
      const date = now.toLocaleDateString("pt-BR");
      const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      if (itemTitle === "Auditoria 5S") {
        navigation.navigate("FiveSMenu", { userName: currentUserName, date, time, apiData });
        return;
      }
      if (itemTitle === "Coletores") {
        navigation.navigate("CollectorChecklist", {
          title: itemTitle, userName: currentUserName, date, time,
          collectorList: apiData.collectorList,
          collectorQuestions: apiData.collectorQuestions,
          apiData: apiData, 
        });
        return;
      }

      const questions = apiData.checklistsData[itemTitle] || [];
      let specificEquipmentList = null;
      if (apiData.forkliftsData && apiData.forkliftsData[itemTitle]) {
        specificEquipmentList = apiData.forkliftsData[itemTitle];
      }

      navigation.navigate("Checklist", {
        title: itemTitle, userName: currentUserName, date, time,
        items: questions, equipmentList: specificEquipmentList, apiData: apiData, 
      });
    } catch (e) {
      Alert.alert("Erro", "Não foi possível iniciar a inspeção.");
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem(USER_NAME_KEY);
    await AsyncStorage.removeItem("@userRole");
    navigation.replace("Login");
  };

  const renderGridItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleChecklistPress(item.title)}>
      <View style={styles.cardIconWrapper}>
        {item.imageUrl ? (
          <Image source={item.imageUrl} style={styles.cardImage} resizeMode="contain" />
        ) : (
          <MaterialCommunityIcons name={item.icon} size={32} color={theme.primary} />
        )}
      </View>
      <Text style={styles.cardText}>{item.title}</Text>
      <Ionicons name="chevron-forward" size={14} color={theme.lightGray} style={styles.cardChevron} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeContainer, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ marginTop: 20, color: theme.textSecondary }}>Sincronizando ambiente...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top", "bottom", "left", "right"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      
      <View style={styles.headerContainer}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerSystemText}>SISTEMA DE INSPEÇÃO</Text>
            <Text style={styles.headerTitle}>Dashboard</Text>
            {userRole ? (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{userRole}</Text>
              </View>
            ) : null}
          </View>
          
          <TouchableOpacity style={styles.profileBadge} onPress={() => setProfileMenuVisible(true)}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials(userName)}</Text>
            </View>
            <Text style={styles.profileName} numberOfLines={1}>{userName}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Online — dados sincronizados</Text>
        </View>
      </View>

      <FlatList
        data={CHECKLIST_ITEMS}
        renderItem={renderGridItem}
        keyExtractor={(item) => item.key}
        numColumns={2}
        contentContainerStyle={styles.gridContainer}
        style={{ flex: 1 }}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Checklists</Text>}
        ListFooterComponent={
          <View style={{ paddingBottom: 100 }}>
            <Text style={styles.sectionTitle}>Mais Opções</Text>
            
            <TouchableOpacity style={styles.optionRow} onPress={toggleTheme}>
              <View style={[styles.optionIconCircle, { backgroundColor: isDark ? "rgba(245, 124, 0, 0.1)" : "rgba(245, 124, 0, 0.2)" }]}>
                <Ionicons name={isDark ? "sunny" : "moon"} size={22} color={theme.warning} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>{isDark ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}</Text>
                <Text style={styles.optionSubtitle}>Alternar o tema visual do sistema</Text>
              </View>
              <Ionicons name="color-palette-outline" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            {(userRole === "Administrador" || userRole === "SuperAdmin") && (
              <TouchableOpacity style={styles.optionRow} onPress={() => navigation.navigate("AdminDashboard")}>
                <View style={[styles.optionIconCircle, { backgroundColor: "rgba(2, 136, 209, 0.1)" }]}>
                  <Ionicons name="shield-checkmark" size={22} color={theme.primary} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Painel Administrativo</Text>
                  <Text style={styles.optionSubtitle}>Gestão e configurações</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.lightGray} />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.optionRow} onPress={() => navigation.navigate("ReportsList")}>
              <View style={[styles.optionIconCircle, { backgroundColor: "rgba(76, 175, 80, 0.1)" }]}>
                <Ionicons name="document-text" size={22} color={theme.success} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Relatórios Salvos</Text>
                <Text style={styles.optionSubtitle}>Armazenados localmente</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.lightGray} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionRow} onPress={() => navigation.navigate("ChangePassword")}>
              <View style={[styles.optionIconCircle, { backgroundColor: "rgba(2, 136, 209, 0.1)" }]}>
                <Ionicons name="key" size={22} color={theme.primary} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Alterar Minha Senha</Text>
                <Text style={styles.optionSubtitle}>Segurança da conta</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.lightGray} />
            </TouchableOpacity>

          </View>
        }
      />

      {/* 👇 MODAL DE PERFIL (Dropdown Card) 👇 */}
      <Modal visible={profileMenuVisible} transparent={true} animationType="fade" onRequestClose={() => setProfileMenuVisible(false)}>
        <TouchableOpacity style={styles.profileMenuOverlay} activeOpacity={1} onPress={() => setProfileMenuVisible(false)}>
          <View style={styles.profileMenuCard}>
            
            <View style={styles.profileMenuHeader}>
              <Text style={styles.profileMenuName}>{userName}</Text>
              <Text style={styles.profileMenuRole}>{userRole}</Text>
            </View>
            
            <View style={styles.profileMenuDivider} />
            
            <TouchableOpacity 
              style={styles.profileMenuItem} 
              onPress={() => { 
                setProfileMenuVisible(false); 
                handleLogout(); 
              }}
            >
              <Ionicons name="log-out-outline" size={20} color={theme.danger} />
              <Text style={[styles.profileMenuItemText, { color: theme.danger }]}>Sair da Conta</Text>
            </TouchableOpacity>
            
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const getStyles = (theme, isDark) => StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: theme.background, ...(Platform.OS === "web" ? { maxHeight: "100vh", overflow: "hidden" } : {}) },
  
  headerContainer: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 20 },
  headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerSystemText: { fontSize: 11, fontWeight: "bold", color: theme.textSecondary, letterSpacing: 1, marginBottom: 2 },
  headerTitle: { fontSize: 28, fontWeight: "bold", color: theme.textPrimary },
  
  roleBadge: { alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(2, 136, 209, 0.5)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, marginTop: 8 },
  roleBadgeText: { fontSize: 12, fontWeight: "bold", color: theme.primary },
  
  profileBadge: { flexDirection: "row", alignItems: "center", backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", maxWidth: 160 },
  avatarCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.primary, justifyContent: "center", alignItems: "center", marginRight: 8 },
  avatarText: { fontSize: 13, fontWeight: "bold", color: "#FFFFFF" },
  profileName: { fontSize: 14, fontWeight: "600", color: theme.textPrimary, flex: 1 },
  
  statusBadge: { flexDirection: "row", alignItems: "center", backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", padding: 12, borderRadius: 10, marginTop: 15, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.success, marginRight: 10 },
  statusText: { fontSize: 13, color: theme.success, fontWeight: "500" },
  
  gridContainer: { paddingHorizontal: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "bold", color: theme.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginHorizontal: 10, marginTop: 25, marginBottom: 15 },
  
  card: { flex: 1, margin: 8, padding: 20, backgroundColor: theme.cardBackground, borderRadius: 12, justifyContent: "space-between", minHeight: 150, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.03)" : theme.lightGray, position: "relative", elevation: isDark ? 2 : 1 },
  cardIconWrapper: { width: 45, height: 45, justifyContent: "center", alignItems: "flex-start" },
  cardImage: { width: 40, height: 40, tintColor: theme.primary },
  cardText: { fontSize: 15, fontWeight: "600", color: theme.textPrimary, marginTop: 15, lineHeight: 20 },
  cardChevron: { position: "absolute", bottom: 15, right: 15 },
  
  optionRow: { backgroundColor: theme.cardBackground, padding: 16, borderRadius: 12, marginHorizontal: 10, marginBottom: 12, flexDirection: "row", alignItems: "center", borderLeftWidth: 4, borderLeftColor: theme.lightGray, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.02)" : theme.lightGray, elevation: isDark ? 0 : 1 },
  optionIconCircle: { width: 42, height: 42, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 15 },
  optionTextContainer: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: "bold", color: theme.textPrimary, marginBottom: 2 },
  optionSubtitle: { fontSize: 12, color: theme.textSecondary },

  // Estilos do Modal do Perfil (Dropdown)
  profileMenuOverlay: { flex: 1, backgroundColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.15)" },
  profileMenuCard: { position: "absolute", top: 80, right: 20, width: 220, backgroundColor: theme.cardBackground, borderRadius: 12, padding: 15, elevation: 5, shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 4, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.05)" : theme.lightGray },
  profileMenuHeader: { marginBottom: 12 },
  profileMenuName: { fontSize: 16, fontWeight: "bold", color: theme.textPrimary },
  profileMenuRole: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  profileMenuDivider: { height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : theme.lightGray, marginBottom: 10 },
  profileMenuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  profileMenuItemText: { fontSize: 15, fontWeight: "600", marginLeft: 10 },
});