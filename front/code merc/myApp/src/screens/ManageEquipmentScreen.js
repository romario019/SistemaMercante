import React, { useState, useEffect } from "react";
import { 
  StyleSheet, Text, View, TouchableOpacity, FlatList, ActivityIndicator, 
  Platform, KeyboardAvoidingView, TextInput, Modal, StatusBar 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { SIZES } from "../colors/theme";
import { useTheme } from "../context/ThemeContext";

const API_URL = "/api"; 

export default function ManageEquipmentScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const styles = getStyles(theme, isDark);

  const [loading, setLoading] = useState(true);
  const [configData, setConfigData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [editableEquipment, setEditableEquipment] = useState([]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [tempLabel, setTempLabel] = useState("");
  const [tempValue, setTempValue] = useState("");

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState(null);
  const [saveStatus, setSaveStatus] = useState("normal");

  const [alertConfig, setAlertConfig] = useState({ visible: false, title: "", message: "", type: "error" });

  useEffect(() => {
    fetchConfigData();
  }, []);

  const showAlert = (title, message, type = "error") => {
    setAlertConfig({ visible: true, title, message, type });
  };

  const fetchConfigData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/config`);
      const data = await response.json();
      setConfigData(data);
      
      let catList = [];
      if (data.forkliftsData) {
        Object.keys(data.forkliftsData).forEach(key => {
          if (key) catList.push({ label: `Máquinas: ${key}`, value: `EQP|${key}` });
        });
      }
      if (data.collectorList) {
        catList.push({ label: `Coletores: Lista Geral`, value: `COL|Coletores` });
      }
      
      setCategories(catList);
      if (catList.length > 0) handleCategoryChange(catList[0].value, data);
    } catch (e) {
      showAlert("Erro", "Falha ao carregar configurações.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (catValue, data = configData) => {
    setSelectedCategory(catValue);
    if (!catValue) return;
    const [type, name] = catValue.split("|");
    let loadedEqp = [];

    if (type === "EQP" && data.forkliftsData[name]) {
      loadedEqp = data.forkliftsData[name];
    } else if (type === "COL" && data.collectorList) {
      loadedEqp = data.collectorList;
    }
    setEditableEquipment(loadedEqp || []);
  };

  const openModal = (index = -1) => {
    if (index >= 0) {
      setTempLabel(editableEquipment[index].label);
      setTempValue(editableEquipment[index].value);
    } else {
      setTempLabel("");
      setTempValue("");
    }
    setEditingIndex(index);
    setModalVisible(true);
  };

  const saveModalEquipment = () => {
    if (!tempLabel.trim() || !tempValue.trim()) return; 
    
    let updatedList = [...editableEquipment];
    const newEq = { label: tempLabel.trim(), value: tempValue.trim() };

    if (editingIndex >= 0) {
      updatedList[editingIndex] = newEq;
    } else {
      updatedList.push(newEq);
    }
    setEditableEquipment(updatedList);
    setModalVisible(false);
  };

  const openDeleteModal = (index) => {
    setEquipmentToDelete(index);
    setDeleteModalVisible(true);
  };

  const confirmDeleteEquipment = () => {
    if (equipmentToDelete !== null) {
      const updatedList = editableEquipment.filter((_, i) => i !== equipmentToDelete);
      setEditableEquipment(updatedList);
    }
    setDeleteModalVisible(false);
    setEquipmentToDelete(null);
  };

  const saveToServer = async () => {
    setSaveStatus("saving");
    const [type, name] = selectedCategory.split("|");
    let newConfig = JSON.parse(JSON.stringify(configData));

    if (type === "EQP") {
      newConfig.forkliftsData[name] = editableEquipment;
    } else if (type === "COL") {
      newConfig.collectorList = editableEquipment;
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
        setSaveStatus("normal");
        showAlert("Sucesso!", "Lista de equipamentos guardada com êxito!", "success");
      } else {
        setSaveStatus("normal");
        showAlert("Ops!", "O servidor recusou a atualização.", "error");
      }
    } catch (e) {
      setSaveStatus("normal");
      showAlert("Erro de Ligação", "Não foi possível enviar os dados ao servidor.", "error");
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

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      
      <View style={styles.header}>
        <TouchableOpacity style={{ marginRight: 15 }} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Equipamentos</Text>
      </View>

      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Selecione a Categoria:</Text>
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
        data={editableEquipment}
        keyExtractor={(_, index) => index.toString()}
        style={[{ flex: 1 }, Platform.OS === "web" && { overflow: "auto" }]}
        contentContainerStyle={{ padding: 15, paddingBottom: 30 }}
        renderItem={({ item, index }) => (
          <View style={styles.questionCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.questionText}>{item.label}</Text>
              <Text style={styles.gravityText}>Cód/ID: {item.value}</Text>
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
        
        <TouchableOpacity style={styles.btnSave} onPress={saveToServer} disabled={saveStatus === "saving"}>
          {saveStatus === "saving" ? (
            <ActivityIndicator color="#FFFFFF" />
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
            <Text style={styles.modalTitle}>{editingIndex >= 0 ? "Editar Equipamento" : "Novo Equipamento"}</Text>
            
            <Text style={styles.inputLabel}>Nome Visível na Tela:</Text>
            <TextInput
              style={styles.textInput}
              placeholderTextColor={theme.textSecondary}
              blurOnSubmit={true}
              onSubmitEditing={saveModalEquipment}
              placeholder="Ex: Empilhadeira 05"
              value={tempLabel}
              onChangeText={setTempLabel}
            />

            <Text style={styles.inputLabel}>Código / ID Interno:</Text>
            <TextInput
              style={styles.textInput}
              placeholderTextColor={theme.textSecondary}
              blurOnSubmit={true}
              onSubmitEditing={saveModalEquipment}
              placeholder="Ex: 05"
              value={tempValue}
              onChangeText={setTempValue}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={saveModalEquipment}>
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
            <Text style={styles.modalTitle}>Excluir Equipamento</Text>
            <Text style={{ textAlign: 'center', marginBottom: 25, fontSize: 15, color: theme.textSecondary, lineHeight: 22 }}>
              Tem a certeza que deseja remover este item da lista?
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.danger }]} onPress={confirmDeleteEquipment}>
                <Text style={[styles.confirmBtnText, {color: "#FFFFFF"}]}>Excluir</Text>
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
              <Text style={[styles.confirmBtnText, { color: "#FFFFFF" }]}>OK</Text>
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
  
  pickerContainer: { padding: 20, backgroundColor: theme.cardBackground, borderBottomWidth: 1, borderColor: theme.lightGray, zIndex: 10 },
  pickerLabel: { fontSize: 13, fontWeight: "bold", color: theme.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  pickerWrapper: { borderWidth: 1, borderColor: theme.lightGray, borderRadius: 12, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", overflow: "hidden" },
  pickerElement: { width: "100%", height: 50, color: theme.textPrimary, backgroundColor: theme.cardBackground },
  
  questionCard: { backgroundColor: theme.cardBackground, padding: 18, borderRadius: 12, marginBottom: 12, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.03)" : theme.lightGray, elevation: isDark ? 1 : 2 },
  questionText: { fontSize: 16, color: theme.textPrimary, fontWeight: "bold", marginBottom: 4 },
  gravityText: { fontSize: 13, color: theme.textSecondary },
  
  actionRow: { flexDirection: "row", marginLeft: 10 },
  iconBtn: { padding: 10, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", borderRadius: 10, marginLeft: 8 },
  
  footer: { flexDirection: "row", padding: 15, backgroundColor: theme.cardBackground, borderTopWidth: 1, borderColor: theme.lightGray },
  btnAdd: { flex: 1, backgroundColor: isDark ? theme.lightGray : "#E2E8F0", padding: 15, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", marginRight: 6 },
  btnSave: { flex: 1, backgroundColor: theme.success, padding: 15, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", marginLeft: 6 },
  btnText: { color: theme.textPrimary, fontWeight: "bold", marginLeft: 8, fontSize: 15 },
  
  modalOverlay: { flex: 1, backgroundColor: isDark ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: theme.cardBackground, padding: 25, borderRadius: 20, borderWidth: 1, borderColor: theme.lightGray, elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 15, textAlign: "center", color: theme.textPrimary },
  
  inputLabel: { fontSize: 13, fontWeight: "bold", color: theme.textSecondary, marginBottom: 8, marginTop: 15, textTransform: "uppercase", letterSpacing: 0.5 },
  textInput: { borderWidth: 1, borderColor: theme.lightGray, borderRadius: 10, padding: 14, fontSize: 15, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", color: theme.textPrimary },
  
  modalActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 25 },
  cancelBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: "center", marginHorizontal: 5, borderWidth: 1, borderColor: theme.lightGray, backgroundColor: "transparent" },
  cancelBtnText: { color: theme.textSecondary, fontWeight: "bold", fontSize: 15 },
  confirmBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: "center", marginHorizontal: 5, backgroundColor: theme.primary },
  confirmBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 15 },
});