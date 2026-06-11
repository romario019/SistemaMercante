import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Platform, KeyboardAvoidingView, TextInput, Modal, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SIZES } from "../colors/theme";
import { useTheme } from "../context/ThemeContext";

const API_URL = "/api";

export default function ChangePasswordScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const styles = getStyles(theme, isDark);

  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saveStatus, setSaveStatus] = useState("normal");
  
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: "", message: "", type: "error", onConfirm: null });

  useEffect(() => {
    const loadUser = async () => {
      const name = await AsyncStorage.getItem("@userName");
      if (name) setUsername(name);
    };
    loadUser();
  }, []);

  const showAlert = (title, message, type = "error", onConfirm = null) => {
    setAlertConfig({ visible: true, title, message, type, onConfirm });
  };

  const handleSave = async () => {
    if (!username) {
      showAlert("Erro de Sessão", "Por favor, saia do aplicativo e faça login novamente.", "warning");
      return;
    }

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      showAlert("Atenção", "Por favor, preencha todos os campos antes de continuar.", "warning");
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert("Senhas Incompatíveis", "A nova senha e a confirmação não batem. Verifique e tente novamente.", "error");
      return;
    }

    setSaveStatus("saving");

    try {
      const response = await fetch(`${API_URL}/mudar-minha-senha`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username,
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim()
        })
      });

      const data = await response.json();

      if (data.status === "success") {
        setSaveStatus("saved");
        showAlert("Sucesso!", "Sua senha foi alterada com segurança. Lembre-se de usá-la no seu próximo login.", "success", () => {
          navigation.goBack(); 
        });
      } else {
        setSaveStatus("normal");
        showAlert("Erro na Atualização", data.message, "error");
      }
    } catch (error) {
      setSaveStatus("normal");
      showAlert("Erro de Conexão", "Não foi possível se comunicar com o servidor.", "error");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      
      <View style={styles.header}>
        <TouchableOpacity style={{ marginRight: 15 }} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minha Conta</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, padding: SIZES.padding }}>
        <View style={styles.card}>
          <Text style={styles.cardSubtitle}>Atualize suas credenciais de acesso</Text>

          <Text style={styles.inputLabel}>Usuário Autenticado:</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={username} enabled={false} style={styles.pickerElement}>
              <Picker.Item label={username ? username : "Carregando perfil..."} value={username} color={theme.textSecondary} />
            </Picker>
          </View>

          <Text style={styles.inputLabel}>Senha Atual:</Text>
          <TextInput
            style={styles.textInput}
            placeholderTextColor={theme.textSecondary}
            blurOnSubmit={true}
            onSubmitEditing={handleSave}
            placeholder="Digite sua senha atual"
            secureTextEntry
            value={currentPassword}
            onChangeText={(txt) => { setCurrentPassword(txt); setSaveStatus("normal"); }}
          />

          <Text style={styles.inputLabel}>Nova Senha:</Text>
          <TextInput
            style={styles.textInput}
            placeholderTextColor={theme.textSecondary}
            blurOnSubmit={true}
            onSubmitEditing={handleSave}
            placeholder="Digite a nova senha"
            secureTextEntry
            value={newPassword}
            onChangeText={(txt) => { setNewPassword(txt); setSaveStatus("normal"); }}
          />

          <Text style={styles.inputLabel}>Confirmar Nova Senha:</Text>
          <TextInput
            style={styles.textInput}
            placeholderTextColor={theme.textSecondary}
            blurOnSubmit={true}
            onSubmitEditing={handleSave}
            placeholder="Repita a nova senha"
            secureTextEntry
            value={confirmPassword}
            onChangeText={(txt) => { setConfirmPassword(txt); setSaveStatus("normal"); }}
          />

          <TouchableOpacity 
            style={[
              styles.btnSave, 
              saveStatus === "saved" ? { backgroundColor: theme.success } : { backgroundColor: theme.primary }
            ]} 
            onPress={handleSave} 
            disabled={saveStatus !== "normal"}
          >
            {saveStatus === "saving" ? (
              <ActivityIndicator color={theme.cardBackground} />
            ) : saveStatus === "saved" ? (
              <>
                <Ionicons name="checkmark-done" size={20} color={theme.cardBackground} style={{ marginRight: 8 }} />
                <Text style={[styles.btnTextSave, { color: theme.cardBackground }]}>SENHA ATUALIZADA!</Text>
              </>
            ) : (
              <Text style={[styles.btnTextSave, { color: "#FFFFFF" }]}>CONFIRMAR ALTERAÇÃO</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={alertConfig.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons 
              name={alertConfig.type === "success" ? "checkmark-circle" : (alertConfig.type === "error" ? "close-circle-outline" : "warning-outline")} 
              size={65} 
              color={alertConfig.type === "success" ? theme.success : (alertConfig.type === "error" ? theme.danger : theme.warning)} 
              style={{ marginBottom: 15 }} 
            />
            <Text style={styles.modalTitle}>{alertConfig.title}</Text>
            <Text style={styles.modalMessage}>
              {alertConfig.message}
            </Text>
            
            <TouchableOpacity 
              style={[styles.btnSave, { width: '100%', backgroundColor: alertConfig.type === "success" ? theme.success : theme.primary, marginTop: 0 }]} 
              onPress={() => {
                setAlertConfig({ ...alertConfig, visible: false });
                if (alertConfig.onConfirm) alertConfig.onConfirm();
              }}
            >
              <Text style={[styles.btnTextSave, { color: "#FFFFFF" }]}>OK</Text>
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
  
  card: { backgroundColor: theme.cardBackground, padding: 25, borderRadius: SIZES.radius, elevation: isDark ? 2 : 1, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.03)" : theme.lightGray, marginTop: 10 },
  cardSubtitle: { fontSize: 15, color: theme.textSecondary, marginBottom: 20, textAlign: "center", fontWeight: "500" },
  
  pickerWrapper: { borderWidth: 1, borderColor: theme.lightGray, borderRadius: SIZES.radius, overflow: "hidden", marginBottom: 10, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" },
  // 👇 AQUI RESOLVEMOS O PROBLEMA DO PICKER NA WEB 👇
  pickerElement: { width: "100%", height: 50, color: theme.textSecondary, backgroundColor: theme.cardBackground },

  inputLabel: { fontSize: 13, fontWeight: "bold", color: theme.textSecondary, marginBottom: 8, marginTop: 15, textTransform: "uppercase", letterSpacing: 0.5 },
  textInput: { borderWidth: 1, borderColor: theme.lightGray, borderRadius: SIZES.radius, padding: 14, fontSize: 15, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", color: theme.textPrimary },
  
  btnSave: { padding: 15, borderRadius: SIZES.radius, alignItems: "center", justifyContent: "center", flexDirection: 'row', elevation: 2, marginTop: 30 },
  btnTextSave: { fontWeight: "bold", fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: isDark ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: theme.cardBackground, padding: 25, borderRadius: SIZES.radius, elevation: 5, alignItems: 'center', borderWidth: 1, borderColor: theme.lightGray },
  modalTitle: { fontSize: SIZES.h2, fontWeight: "bold", marginBottom: 10, textAlign: "center", color: theme.textPrimary },
  modalMessage: { textAlign: 'center', marginBottom: 25, fontSize: 15, color: theme.textSecondary, lineHeight: 22 }
});