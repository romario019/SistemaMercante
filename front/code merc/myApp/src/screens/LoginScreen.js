import React, { useState, useEffect } from "react";
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, Platform, 
  KeyboardAvoidingView, ScrollView, StatusBar, Image, ActivityIndicator 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { SIZES } from "../colors/theme";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

const API_URL = "http://10.77.1.165:3000/api";

export default function LoginScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const styles = getStyles(theme, isDark);

  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) checkSavedUser();
  }, [isFocused]);

  const checkSavedUser = async () => {
    const savedUser = await AsyncStorage.getItem("@userName");
    if (savedUser) navigation.replace("Menu");
  };

  const handleLogin = async () => {
    setErrorMessage(""); 

    if (!userName.trim() || !password.trim()) {
      setErrorMessage("Por favor, preencha utilizador e senha.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://10.77.1.165:3000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: userName, password }),
      });
      
      const data = await response.json();

      if (data.status === "success") {
        await AsyncStorage.setItem("@userName", data.user.username);
        await AsyncStorage.setItem("@userRole", data.user.role);
        navigation.replace("Menu");
      } else {
        setErrorMessage("Utilizador ou senha incorretos.");
      }
    } catch (e) {
      setErrorMessage("Erro de ligação com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top", "bottom", "left", "right"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          
          <View style={styles.logoContainer}>
            <Image source={{ uri: "https://i.ibb.co/wFtMkbHg/mercante-logo.png" }} style={styles.logoImage} resizeMode="contain" />
          </View>

          <Text style={styles.title}>Bem-vindo(a)</Text>
          <Text style={styles.subtitle}>Faça login para iniciar o checklist</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={22} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="Nome de utilizador" 
              placeholderTextColor={theme.textSecondary} 
              value={userName} 
              onChangeText={(text) => { setUserName(text); setErrorMessage(""); }} 
              autoCapitalize="none" 
              onSubmitEditing={handleLogin}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={22} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="Senha" 
              placeholderTextColor={theme.textSecondary} 
              value={password} 
              onChangeText={(text) => { setPassword(text); setErrorMessage(""); }} 
              secureTextEntry 
              onSubmitEditing={handleLogin}
            />
          </View>

          {errorMessage !== "" && (
            <Text style={styles.errorText}>
              {errorMessage}
            </Text>
          )}

          <TouchableOpacity style={styles.continueButton} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.continueButtonText}>Entrar</Text>}
          </TouchableOpacity>
        
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (theme, isDark) => StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: theme.background },
  scrollContainer: { flexGrow: 1, padding: SIZES.padding, justifyContent: "center" },
  
  logoContainer: { alignItems: "center", marginBottom: SIZES.padding * 2 },
  logoImage: { width: "70%", height: 180, tintColor: theme.primary },
  
  title: { fontSize: 28, fontWeight: "bold", textAlign: "center", color: theme.textPrimary, marginBottom: 5 },
  subtitle: { fontSize: 15, textAlign: "center", color: theme.textSecondary, marginBottom: 35 },
  
  inputContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", 
    borderRadius: 12, 
    marginBottom: 15, 
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: theme.lightGray
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: Platform.OS === "web" ? 16 : 14, fontSize: 15, color: theme.textPrimary },
  
  errorText: { color: theme.danger, fontSize: 14, fontWeight: 'bold', marginTop: 5, textAlign: 'center', marginBottom: 10 },
  
  continueButton: { 
    backgroundColor: theme.primary, 
    paddingVertical: 15, 
    borderRadius: 12, 
    alignItems: "center", 
    elevation: isDark ? 0 : 3,
    marginTop: 10,
    borderWidth: 1,
    borderColor: isDark ? "rgba(255,255,255,0.05)" : "transparent"
  },
  continueButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold", letterSpacing: 1 },
});