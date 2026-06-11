import React, { useState, useEffect } from "react";
import { 
  StyleSheet, Text, View, TouchableOpacity, FlatList, ActivityIndicator, 
  Platform, KeyboardAvoidingView, TextInput, Modal, StatusBar 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SIZES } from "../colors/theme";
import { useTheme } from "../context/ThemeContext";

const API_URL = "/api";

export default function UserManagementScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const styles = getStyles(theme, isDark);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatorRole, setCreatorRole] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("Operador");

  const [saving, setSaving] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: "", message: "", type: "error" });

  useEffect(() => {
    loadUsers();
    AsyncStorage.getItem("@userRole").then(r => setCreatorRole(r || ""));
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/usuarios`);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      showAlert("Erro de Ligação", "Não foi possível carregar a lista de utilizadores.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (title, message, type = "error") => {
    setAlertConfig({ visible: true, title, message, type });
  };

  const openModal = (user = null) => {
    if (user) {
      setEditingUserId(user.id);
      setUsername(user.username);
      setPassword("");
      setConfirmPassword("");
      setRole(user.role);
    } else {
      setEditingUserId(null);
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setRole("Operador");
    }
    setModalVisible(true);
  };

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setDeleteModalVisible(true);
  };

  const handleSave = async () => {
    if (!username.trim()) {
      showAlert("Atenção", "O nome de utilizador não pode ficar vazio.", "warning");
      return;
    }
    if (!editingUserId && !password.trim()) {
      showAlert("Atenção", "A password é obrigatória para criar um novo utilizador.", "warning");
      return;
    }
    if (password.trim() !== "" || confirmPassword.trim() !== "") {
      if (password !== confirmPassword) {
        showAlert("Passwords Incompatíveis", "As passwords digitadas não coincidem. Por favor, confirme os campos.", "error");
        return;
      }
    }

    setSaving(true);
    const endpoint = editingUserId ? `${API_URL}/usuarios/${editingUserId}` : `${API_URL}/usuarios`;
    const method = editingUserId ? "PUT" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          role,
          creatorRole
        })
      });

      const data = await response.json();

      if (data.status === "success") {
        setModalVisible(false);
        loadUsers();
        showAlert("Sucesso!", editingUserId ? "Alterações guardadas com sucesso!" : "Novo utilizador criado com êxito!", "success");
      } else {
        showAlert("Ops!", data.message, "error");
      }
    } catch (error) {
      showAlert("Erro de Ligação", "Não foi possível comunicar com o servidor.", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteModalVisible(false);
    
    try {
      const response = await fetch(`${API_URL}/usuarios/${userToDelete.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorRole })
      });
      
      const data = await response.json();
      
      if (data.status === "success") {
        loadUsers();
        showAlert("Eliminado!", "O utilizador foi removido do sistema.", "success");
      } else {
        showAlert("Erro", data.message, "error");
      }
    } catch (error) {
      showAlert("Erro de Ligação", "Não foi possível eliminar o utilizador.", "error");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ marginTop: 15, color: theme.textSecondary }}>A carregar acessos...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      
      <View style={styles.header}>
        <TouchableOpacity style={{ marginRight: 15 }} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Controlo de Acessos</Text>
      </View>

      <Text style={styles.listSubtitle}>Lista de utilizadores do sistema</Text>
      
      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        style={[{ flex: 1 }, Platform.OS === "web" && { overflow: "auto" }]}
        contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="person-circle" size={42} color={theme.primary} style={{ marginRight: 15 }} />
              <View style={styles.userInfo}>
                <Text style={styles.usernameText}>{item.username}</Text>
                <Text style={[styles.roleText, item.role === "SuperAdmin" && { color: theme.danger, fontWeight: "bold" }]}>
                  {item.role}
                </Text>
              </View>
            </View>
            
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={() => openModal(item)} style={styles.iconBtn}>
                <Ionicons name="pencil" size={20} color={theme.primary} />
              </TouchableOpacity>

              {(creatorRole === "Administrador" || creatorRole === "SuperAdmin") && (
                (item.role !== "SuperAdmin" || creatorRole === "SuperAdmin") && (
                  <TouchableOpacity onPress={() => openDeleteModal(item)} style={[styles.iconBtn, { backgroundColor: "rgba(239, 68, 68, 0.1)", marginLeft: 8 }]}>
                    <Ionicons name="trash-outline" size={20} color={theme.danger} />
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnAdd} onPress={() => openModal(null)}>
          <Ionicons name="person-add" size={24} color={theme.textPrimary} />
          <Text style={styles.btnTextAdd}>Criar Novo Utilizador</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingUserId ? "Editar Perfil" : "Criar Utilizador"}</Text>
            
            <Text style={styles.inputLabel}>Nome de Utilizador:</Text>
            <TextInput
              style={styles.textInput}
              placeholderTextColor={theme.textSecondary}
              blurOnSubmit={true}
              onSubmitEditing={handleSave}
              placeholder="Ex: nome.apelido"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>{editingUserId ? "Nova Password (vazio para manter):" : "Password de Acesso:"}</Text>
            <TextInput
              style={styles.textInput}
              placeholderTextColor={theme.textSecondary}
              blurOnSubmit={true}
              onSubmitEditing={handleSave}
              placeholder="Digita a password"
              secureTextEntry
              value={password}
              onChangeText={(txt) => { setPassword(txt); setConfirmPassword(""); }}
            />

            <Text style={styles.inputLabel}>Confirmar Password:</Text>
            <TextInput
              style={styles.textInput}
              placeholderTextColor={theme.textSecondary}
              blurOnSubmit={true}
              onSubmitEditing={handleSave}
              placeholder="Repete a password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            {creatorRole === "SuperAdmin" && (
              <>
                <Text style={styles.inputLabel}>Cargo no Sistema:</Text>
                <View style={styles.pickerWrapper}>
                  <Picker 
                    selectedValue={role} 
                    onValueChange={setRole} 
                    style={styles.pickerElement}
                    dropdownIconColor={theme.primary}
                  >
                    <Picker.Item label="Operador" value="Operador" color={theme.textPrimary} />
                    <Picker.Item label="Administrador" value="Administrador" color={theme.textPrimary} />
                    <Picker.Item label="SuperAdmin" value="SuperAdmin" color={theme.textPrimary} />
                  </Picker>
                </View>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmBtn} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={theme.textPrimary} />
                ) : (
                  <Text style={styles.confirmBtnText}>
                    {editingUserId ? "Guardar" : "Criar"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingVertical: 30 }]}>
            <Ionicons name="warning-outline" size={60} color={theme.danger} style={{ alignSelf: 'center', marginBottom: 15 }} />
            <Text style={styles.modalTitle}>Excluir Utilizador</Text>
            <Text style={{ textAlign: 'center', marginBottom: 25, fontSize: 15, color: theme.textSecondary, lineHeight: 22 }}>
              Tem a certeza que deseja remover o utilizador <Text style={{ color: theme.textPrimary, fontWeight: 'bold' }}>{userToDelete?.username}</Text>?
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.danger }]} onPress={confirmDeleteUser}>
                <Text style={[styles.confirmBtnText, {color: "#FFFFFF"}]}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={alertConfig.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingVertical: 30, alignItems: 'center' }]}>
            <Ionicons 
              name={alertConfig.type === "success" ? "checkmark-circle" : (alertConfig.type === "error" ? "close-circle-outline" : "warning-outline")} 
              size={65} 
              color={alertConfig.type === "success" ? theme.success : (alertConfig.type === "error" ? theme.danger : theme.warning)} 
              style={{ marginBottom: 15 }} 
            />
            <Text style={styles.modalTitle}>{alertConfig.title}</Text>
            <Text style={{ textAlign: 'center', marginBottom: 25, fontSize: 15, color: theme.textSecondary, lineHeight: 22 }}>
              {alertConfig.message}
            </Text>
            
            <TouchableOpacity 
              style={[styles.confirmBtn, { width: '100%', backgroundColor: alertConfig.type === "success" ? theme.success : theme.primary }]} 
              onPress={() => setAlertConfig({ ...alertConfig, visible: false })}
            >
              <Text style={[styles.confirmBtnText, alertConfig.type === "success" && { color: "#FFFFFF" }]}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const getStyles = (theme, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background, ...(Platform.OS === "web" ? { maxHeight: "100vh", overflow: "hidden" } : {}) },
  
  header: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 15, flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: theme.textPrimary },
  listSubtitle: { paddingHorizontal: 20, paddingBottom: 15, fontSize: 14, fontStyle: "italic", color: theme.textSecondary },
  
  userCard: { backgroundColor: theme.cardBackground, padding: 18, borderRadius: 12, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.03)" : theme.lightGray, elevation: isDark ? 1 : 2 },
  userInfo: { flex: 1 },
  usernameText: { fontSize: 16, color: theme.textPrimary, fontWeight: "bold", marginBottom: 3 },
  roleText: { fontSize: 14, color: theme.textSecondary },
  
  actionRow: { flexDirection: "row", alignItems: "center" },
  iconBtn: { padding: 10, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", borderRadius: 10 },
  
  footer: { padding: 15, backgroundColor: theme.cardBackground, borderTopWidth: 1, borderColor: theme.lightGray },
  btnAdd: { backgroundColor: theme.primary, padding: 15, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", elevation: 2 },
  btnTextAdd: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16, marginLeft: 10 },
  
  modalOverlay: { flex: 1, backgroundColor: isDark ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: theme.cardBackground, padding: 25, borderRadius: 20, borderWidth: 1, borderColor: theme.lightGray, elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 15, textAlign: "center", color: theme.textPrimary },
  
  inputLabel: { fontSize: 13, fontWeight: "bold", color: theme.textSecondary, marginBottom: 8, marginTop: 15, textTransform: "uppercase", letterSpacing: 0.5 },
  textInput: { borderWidth: 1, borderColor: theme.lightGray, borderRadius: 10, padding: 14, fontSize: 15, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", color: theme.textPrimary },
  
  pickerWrapper: { borderWidth: 1, borderColor: theme.lightGray, borderRadius: 10, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", overflow: "hidden" },
  pickerElement: { width: "100%", height: 50, color: theme.textPrimary, backgroundColor: theme.cardBackground },
  
  modalActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 25 },
  cancelBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: "center", marginHorizontal: 5, borderWidth: 1, borderColor: theme.lightGray, backgroundColor: "transparent" },
  cancelBtnText: { color: theme.textSecondary, fontWeight: "bold", fontSize: 15 },
  confirmBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: "center", marginHorizontal: 5, backgroundColor: theme.primary },
  confirmBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 15 }
});