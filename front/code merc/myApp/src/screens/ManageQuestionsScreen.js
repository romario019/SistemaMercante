import React, { useState, useEffect } from "react";
import { 
  StyleSheet, Text, View, TouchableOpacity, FlatList, Alert, ActivityIndicator, 
  Platform, KeyboardAvoidingView, TextInput, Modal, StatusBar 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { SIZES } from "../colors/theme";
import { useTheme } from "../context/ThemeContext";

const API_URL = "/api"; 

const formatCategoryName = (text) => {
  if (!text) return "Sem Nome";
  return text
    .replace(/_/g, " ")
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function ManageQuestionsScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const styles = getStyles(theme, isDark);

  const [loading, setLoading] = useState(true);
  const [configData, setConfigData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [editableQuestions, setEditableQuestions] = useState([]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [tempText, setTempText] = useState("");
  const [tempGravity, setTempGravity] = useState("BAIXO");
  // 👇 Novo campo para as opções dos Coletores 👇
  const [tempOptions, setTempOptions] = useState(""); 

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [saveStatus, setSaveStatus] = useState("normal");

  useEffect(() => {
    fetchConfigData();
  }, []);

  const fetchConfigData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/config`);
      const data = await response.json();
      setConfigData(data);
      
      let catList = [];
      if (data.checklistsData) {
        Object.keys(data.checklistsData).forEach(key => {
          if (key) catList.push({ label: `Máquinas: ${key}`, value: `EQP|${key}` });
        });
      }
      if (data.data5S && data.data5S.questions) {
        Object.keys(data.data5S.questions).forEach(key => {
          if (key) catList.push({ label: `5S: ${formatCategoryName(key)}`, value: `5S|${key}` });
        });
      }
      
      // 👇 Adiciona os Coletores à lista do Painel Administrativo 👇
      catList.push({ label: `Coletores`, value: `COL|Coletores` });

      setCategories(catList);
      if (catList.length > 0) handleCategoryChange(catList[0].value, data);
    } catch (e) {
      Alert.alert("Erro", "Falha ao carregar configurações.");
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (catValue, data = configData) => {
    setSelectedCategory(catValue);
    if (!catValue) return;
    const [type, name] = catValue.split("|");
    let loadedQuestions = [];

    if (type === "EQP" && data.checklistsData[name]) {
      loadedQuestions = data.checklistsData[name].map(q => ({ text: q.text || "", gravity: q.gravity || "BAIXO" }));
    } else if (type === "5S" && data.data5S.questions[name]) {
      loadedQuestions = data.data5S.questions[name].map(text => ({ text: text || "", gravity: null }));
    } else if (type === "COL") {
      // 👇 Lógica de compatibilidade para converter o formato antigo dos Coletores 👇
      let colQ = data.collectorQuestions || {};
      if (!Array.isArray(colQ)) {
        const hardcodedSeverities = { TURNO: "BAIXO", GATILHO: "CRÍTICO", LEITOR: "CRÍTICO", SISTEMA: "CRÍTICO", CONEXÃO: "CRÍTICO", VIDRO: "MÉDIO", INTERFACE: "MÉDIO", CARCAÇA: "BAIXO", CAPA: "BAIXO", AÇÃO: "BAIXO" };
        loadedQuestions = Object.keys(colQ).map(key => ({
          text: key,
          options: Array.isArray(colQ[key]) ? colQ[key].join(", ") : "OK, NÃO OK",
          gravity: hardcodedSeverities[key] || "MÉDIO"
        }));
      } else {
        loadedQuestions = colQ.map(q => ({
          text: q.text,
          options: Array.isArray(q.options) ? q.options.join(", ") : (q.options || "OK, NÃO OK"),
          gravity: q.gravity || "BAIXO"
        }));
      }
    }
    setEditableQuestions(loadedQuestions);
  };

  const openModal = (index = -1) => {
    if (index >= 0) {
      setTempText(editableQuestions[index].text);
      setTempGravity(editableQuestions[index].gravity || "BAIXO");
      setTempOptions(editableQuestions[index].options || "OK, NÃO OK");
    } else {
      setTempText("");
      setTempGravity("BAIXO");
      setTempOptions("OK, NÃO OK"); // Opções por defeito
    }
    setEditingIndex(index);
    setModalVisible(true);
  };

  const saveModalQuestion = () => {
    if (!tempText.trim()) {
      setTempText("");
      return;
    }
    const [type] = selectedCategory.split("|");
    let updatedList = [...editableQuestions];
    
    const newQ = { 
      text: tempText.trim(), 
      gravity: (type === "EQP" || type === "COL") ? tempGravity : null,
      options: type === "COL" ? (tempOptions.trim() || "OK, NÃO OK") : null
    };

    if (editingIndex >= 0) {
      updatedList[editingIndex] = newQ;
    } else {
      updatedList.push(newQ);
    }
    setEditableQuestions(updatedList);
    setModalVisible(false);
  };

  const openDeleteModal = (index) => {
    setQuestionToDelete(index);
    setDeleteModalVisible(true);
  };

  const confirmDeleteQuestion = () => {
    if (questionToDelete !== null) {
      const updatedList = editableQuestions.filter((_, i) => i !== questionToDelete);
      setEditableQuestions(updatedList);
    }
    setDeleteModalVisible(false);
    setQuestionToDelete(null);
  };

  const saveToServer = async () => {
    setSaveStatus("saving");
    const [type, name] = selectedCategory.split("|");
    let newConfig = JSON.parse(JSON.stringify(configData));

    if (type === "EQP") {
      newConfig.checklistsData[name] = editableQuestions.map(q => ({ text: q.text, gravity: q.gravity }));
    } else if (type === "5S") {
      newConfig.data5S.questions[name] = editableQuestions.map(q => q.text);
    } else if (type === "COL") {
      // 👇 Guarda no novo formato do servidor 👇
      newConfig.collectorQuestions = editableQuestions.map(q => ({
        text: q.text,
        gravity: q.gravity,
        options: q.options ? q.options.split(",").map(s => s.trim()) : ["OK", "NÃO OK"]
      }));
    }

    try {
      const response = await fetch(`${API_URL}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      const data = await response.json();

      if (data.status === "success") {
        setConfigData(newConfig);
        setSaveStatus("saved");
        setTimeout(() => {
          setSaveStatus("normal");
        }, 3000);
      } else {
        setSaveStatus("normal");
        Alert.alert("Erro", "O servidor recusou a atualização.");
      }
    } catch (e) {
      setSaveStatus("normal");
      Alert.alert("Erro", "Não foi possível enviar os dados.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ marginTop: 15, color: theme.textSecondary }}>A carregar dados...</Text>
      </SafeAreaView>
    );
  }

  const isEqp = selectedCategory.startsWith("EQP|");
  const isCol = selectedCategory.startsWith("COL|");

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      
      <View style={styles.header}>
        <TouchableOpacity style={{ marginRight: 15 }} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perguntas</Text>
      </View>

      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Selecione o Checklist:</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedCategory}
            onValueChange={(val) => handleCategoryChange(val)}
            style={styles.pickerElement}
            dropdownIconColor={theme.primary}
          >
            {categories.map((cat, index) => (
              <Picker.Item key={index} label={cat.label} value={cat.value} color={theme.textPrimary} />
            ))}
          </Picker>
        </View>
      </View>

      <FlatList
        data={editableQuestions}
        keyExtractor={(_, index) => index.toString()}
        style={[{ flex: 1 }, Platform.OS === "web" && { overflow: "auto" }]}
        contentContainerStyle={{ padding: 15, paddingBottom: 30 }}
        renderItem={({ item, index }) => (
          <View style={styles.questionCard}>
            <View style={{ flex: 1, paddingRight: 5 }}>
              <Text style={styles.questionText}>{item.text}</Text>
              
              {(isEqp || isCol) && (
                <View style={[styles.severityBadge, { backgroundColor: item.gravity === "CRÍTICO" ? "rgba(239, 68, 68, 0.15)" : (item.gravity === "MÉDIO" ? "rgba(245, 124, 0, 0.15)" : "rgba(2, 136, 209, 0.15)") }]}>
                  <Text style={[styles.gravityText, { color: item.gravity === "CRÍTICO" ? theme.danger : (item.gravity === "MÉDIO" ? theme.warning : theme.primary) }]}>
                    {item.gravity}
                  </Text>
                </View>
              )}
              
              {/* Exibe as opções na lista para Coletores */}
              {isCol && item.options && (
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 8 }}>
                  Opções: {item.options}
                </Text>
              )}
            </View>
            
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={() => openModal(index)} style={styles.iconBtn}>
                <Ionicons name="pencil" size={20} color={theme.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openDeleteModal(index)} style={[styles.iconBtn, { backgroundColor: "rgba(239, 68, 68, 0.1)" }]}>
                <Ionicons name="trash-outline" size={20} color={theme.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnAdd} onPress={() => openModal(-1)}>
          <Ionicons name="add" size={24} color={theme.textPrimary} />
          <Text style={styles.btnText}>Adicionar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.btnSave, 
            saveStatus === "saved" && { backgroundColor: theme.success }
          ]} 
          onPress={saveToServer} 
          disabled={saveStatus !== "normal"}
        >
          {saveStatus === "saving" ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : saveStatus === "saved" ? (
            <>
              <Ionicons name="checkmark-done" size={24} color="#FFFFFF" />
              <Text style={[styles.btnText, { color: "#FFFFFF" }]}>Guardado!</Text>
            </>
          ) : (
            <>
              <Ionicons name="save-outline" size={22} color="#FFFFFF" />
              <Text style={[styles.btnText, { color: "#FFFFFF" }]}>Guardar Lista</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingIndex >= 0 ? "Editar Pergunta" : "Nova Pergunta"}</Text>
            
            <Text style={styles.inputLabel}>Pergunta / Verificação:</Text>
            <TextInput
              style={[styles.textInput, { minHeight: 60, marginBottom: 15 }]}
              multiline={Platform.OS !== "web"}
              blurOnSubmit={true}
              onSubmitEditing={saveModalQuestion}
              placeholder="Digita a pergunta aqui..."
              placeholderTextColor={theme.textSecondary}
              value={tempText}
              onChangeText={setTempText}
            />

            {(isEqp || isCol) && (
              <>
                <Text style={styles.inputLabel}>Nível de Gravidade:</Text>
                <View style={[styles.pickerWrapper, { marginBottom: 15 }]}>
                  <Picker 
                    selectedValue={tempGravity} 
                    onValueChange={setTempGravity} 
                    style={styles.pickerElement}
                    dropdownIconColor={theme.primary}
                  >
                    <Picker.Item label="Baixo" value="BAIXO" color={theme.textPrimary} />
                    <Picker.Item label="Médio" value="MÉDIO" color={theme.textPrimary} />
                    <Picker.Item label="Crítico" value="CRÍTICO" color={theme.textPrimary} />
                  </Picker>
                </View>
              </>
            )}

            {/* 👇 Campo exclusivo para Coletores 👇 */}
            {isCol && (
              <>
                <Text style={styles.inputLabel}>Opções de Resposta (separadas por vírgula):</Text>
                <TextInput
                  style={[styles.textInput, { minHeight: 60, marginBottom: 15 }]}
                  placeholderTextColor={theme.textSecondary}
                  blurOnSubmit={true}
                  placeholder="Ex: SIM, NÃO, RISCADO, TRINCADO"
                  value={tempOptions}
                  onChangeText={setTempOptions}
                />
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={saveModalQuestion}>
                <Text style={styles.confirmBtnText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingVertical: 30 }]}>
            <Ionicons name="warning-outline" size={60} color={theme.danger} style={{ alignSelf: 'center', marginBottom: 15 }} />
            <Text style={styles.modalTitle}>Excluir Pergunta</Text>
            <Text style={{ textAlign: 'center', marginBottom: 25, fontSize: 15, color: theme.textSecondary, lineHeight: 22 }}>
              Tem a certeza que deseja remover esta pergunta da lista?
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.danger }]} onPress={confirmDeleteQuestion}>
                <Text style={[styles.confirmBtnText, {color: "#FFFFFF"}]}>Excluir</Text>
              </TouchableOpacity>
            </View>
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
  
  pickerContainer: { padding: 20, backgroundColor: theme.cardBackground, borderBottomWidth: 1, borderColor: theme.lightGray, zIndex: 10 },
  pickerLabel: { fontSize: 13, fontWeight: "bold", color: theme.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  pickerWrapper: { borderWidth: 1, borderColor: theme.lightGray, borderRadius: 12, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", overflow: "hidden" },
  pickerElement: { width: "100%", height: 50, color: theme.textPrimary, backgroundColor: theme.cardBackground },
  
  questionCard: { backgroundColor: theme.cardBackground, padding: 18, borderRadius: 12, marginBottom: 12, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.03)" : theme.lightGray, elevation: isDark ? 1 : 2 },
  questionText: { fontSize: 15, color: theme.textPrimary, fontWeight: "600", marginBottom: 8, lineHeight: 22 },
  severityBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  gravityText: { fontSize: 10, fontWeight: "bold" },
  
  actionRow: { flexDirection: "row", marginLeft: 10 },
  iconBtn: { padding: 10, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", borderRadius: 10, marginLeft: 8 },
  
  footer: { flexDirection: "row", padding: 15, backgroundColor: theme.cardBackground, borderTopWidth: 1, borderColor: theme.lightGray },
  btnAdd: { flex: 1, backgroundColor: isDark ? theme.lightGray : "#E2E8F0", padding: 15, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", marginRight: 6 },
  btnSave: { flex: 1, backgroundColor: theme.primary, padding: 15, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", marginLeft: 6 },
  btnText: { color: theme.textPrimary, fontWeight: "bold", marginLeft: 8, fontSize: 15 },
  
  modalOverlay: { flex: 1, backgroundColor: isDark ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: theme.cardBackground, padding: 25, borderRadius: 20, borderWidth: 1, borderColor: theme.lightGray, elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 15, textAlign: "center", color: theme.textPrimary },
  
  inputLabel: { fontSize: 13, fontWeight: "bold", color: theme.textSecondary, marginBottom: 8, marginTop: 5, textTransform: "uppercase", letterSpacing: 0.5 },
  textInput: { borderWidth: 1, borderColor: theme.lightGray, borderRadius: 10, padding: 14, fontSize: 15, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", color: theme.textPrimary, textAlignVertical: "top" },
  
  modalActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  cancelBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: "center", marginHorizontal: 5, borderWidth: 1, borderColor: theme.lightGray, backgroundColor: "transparent" },
  cancelBtnText: { color: theme.textSecondary, fontWeight: "bold", fontSize: 15 },
  confirmBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: "center", marginHorizontal: 5, backgroundColor: theme.primary },
  confirmBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 15 },
});