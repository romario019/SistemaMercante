import React, { useState, useMemo, useCallback } from "react";
import {
  StyleSheet, View, Text, Modal, ScrollView, TouchableOpacity, Alert,
  StatusBar, TextInput, ActivityIndicator, Image, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "@react-navigation/native";
import { SIZES } from "../colors/theme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { sendReport } from "../services/api";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useTheme } from "../context/ThemeContext";

const KeyboardWrapper = ({ children }) => {
  if (Platform.OS === "web") {
    return <View style={{ flex: 1, overflow: "hidden" }}>{children}</View>;
  }
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      {children}
    </KeyboardAvoidingView>
  );
};

const MultiButtonSelector = ({ title, options, selected, onSelect, severity, theme, isDark, styles }) => {
  let badgeColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", textColor = theme.textSecondary;
  
  if (severity === "CRÍTICO") {
    badgeColor = "rgba(239, 68, 68, 0.15)";
    textColor = theme.danger;
  } else if (severity === "MÉDIO") {
    badgeColor = "rgba(245, 124, 0, 0.15)";
    textColor = theme.warning;
  } else if (severity === "BAIXO") {
    badgeColor = "rgba(2, 136, 209, 0.15)";
    textColor = theme.primary;
  }

  return (
    <View style={styles.questionCard}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionTitle}>{title}</Text>
        {severity && (
          <View style={[styles.severityBadge, { backgroundColor: badgeColor }]}>
            <Text style={{ fontSize: 10, fontWeight: "bold", color: textColor }}>{severity}</Text>
          </View>
        )}
      </View>
      <View style={styles.optionsContainer}>
        {options && options.map((option) => {
          const isSelected = selected === option;
          return (
            <TouchableOpacity
              key={option}
              style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
              onPress={() => onSelect(option)}
            >
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default function CollectorChecklistScreen({ route, navigation }) {
  const { theme, isDark } = useTheme();
  const styles = getStyles(theme, isDark);

  const { title, userName, date, time, collectorList, collectorQuestions, apiData } = route.params;
  const [modalVisible, setModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentCollector, setCurrentCollector] = useState(null);
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState([]);
  const [completedInShift, setCompletedInShift] = useState([]);
  const [observacao, setObservacao] = useState("");
  
  // 👇 As respostas agora são 100% dinâmicas 👇
  const [responses, setResponses] = useState({});

  // Lógica de compatibilidade ( Lê o objeto antigo ou o novo array do servidor)
  const normalizedQuestions = useMemo(() => {
    if (Array.isArray(collectorQuestions)) {
       return collectorQuestions; 
    } else if (collectorQuestions && typeof collectorQuestions === "object") {
       const hardcodedSeverities = { TURNO: "BAIXO", GATILHO: "CRÍTICO", LEITOR: "CRÍTICO", SISTEMA: "CRÍTICO", CONEXÃO: "CRÍTICO", VIDRO: "MÉDIO", INTERFACE: "MÉDIO", CARCAÇA: "BAIXO", CAPA: "BAIXO", AÇÃO: "BAIXO" };
       return Object.keys(collectorQuestions).map(key => ({
          text: key,
          options: collectorQuestions[key],
          gravity: hardcodedSeverities[key] || "MÉDIO"
       }));
    }
    return [];
  }, [collectorQuestions]);

  const totalRequiredItems = normalizedQuestions.length;
  const answeredItemsCount = Object.keys(responses).length;
  const isComplete = answeredItemsCount === totalRequiredItems;

  const handleSelectOption = (itemText, option) => {
    setResponses(prev => ({ ...prev, [itemText]: option }));
  };

  const getShiftKeyFromAppFormat = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return "";
    const [day, month, year] = dateStr.split("/");
    const [hour, minute] = timeStr.split(":");

    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    let d = new Date(year, month - 1, day);

    if (h < 8) d.setDate(d.getDate() - 1);

    const pDay = String(d.getDate()).padStart(2, "0");
    const pMonth = String(d.getMonth() + 1).padStart(2, "0");

    // 👇 NOVA REGRA: 17:40 em diante já conta como NOTURNO 👇
    const isNight = h > 17 || (h === 17 && m >= 40) || h < 8;

    return `${pDay}/${pMonth}/${d.getFullYear()}_${isNight ? "NOTURNO" : "DIURNO"}`;
  };

  useFocusEffect(
    useCallback(() => {
      const loadCompleted = async () => {
        const serverCompleted = apiData?.completedThisShift?.collectors || [];
        const currentShiftKey = getShiftKeyFromAppFormat(date, time);
        const keys = await AsyncStorage.getAllKeys();
        const savedReports = await AsyncStorage.multiGet(keys.filter((k) => k.startsWith("@report_")));
        
        const localCompleted = [];
        savedReports.forEach(([key, value]) => {
          const report = JSON.parse(value);
          if (report.collectorNumber && getShiftKeyFromAppFormat(report.date, report.time) === currentShiftKey) {
            localCompleted.push(report.collectorNumber);
          }
        });
        setCompletedInShift([...new Set([...serverCompleted, ...localCompleted])]);
      };
      loadCompleted();
    }, [apiData]),
  );

  const handleStartChecklist = () => {
    if (completedInShift.includes(currentCollector)) {
      Alert.alert("Turno Concluído", `O coletor ${currentCollector} já foi inspecionado neste turno!`);
      return;
    }
    setStep(2);
  };

  const handleTakePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });
    if (!result.canceled) {
      const manipResult = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      setPhotos([...photos, manipResult]);
    }
  };

  const handleRemovePhoto = (i) => setPhotos(photos.filter((_, index) => index !== i));
  const handleOpenReport = () => setModalVisible(true);

  const handleSaveAndExit = async () => {
    setSending(true);
    const finalResponses = { ...responses, OBSERVAÇÃO: observacao || "Nenhuma" };
    try {
      const timestamp = new Date().toISOString();
      const uniqueId = `ID-${Date.now()}`;
      const photosBase64 = photos.map((p) => p.base64);
      const reportData = {
        id: uniqueId, timestamp, equipmentTitle: title, userName, date, time,
        collectorNumber: currentCollector, responses: finalResponses, photosBase64,
      };
      await sendReport(reportData);
      
      const localReport = { ...reportData, photosBase64: [], hasPhotos: photos.length > 0 };
      await AsyncStorage.setItem(`@report_${timestamp}`, JSON.stringify(localReport));
      
      setModalVisible(false);
      setSuccessModalVisible(true);
    } catch (e) {
      Alert.alert("Erro ao enviar a auditoria.");
    } finally {
      setSending(false);
    }
  };

  const handleBackToMenu = () => {
    setSuccessModalVisible(false);
    navigation.popToTop();
  };

  if (step === 1) {
    const isSelectedCompleted = completedInShift.includes(currentCollector);
    const isBtnDisabled = !currentCollector || isSelectedCompleted;

    return (
      <SafeAreaView style={styles.screenContainer}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
        
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color={theme.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Etapa 1 de 2</Text>
            <Text style={styles.headerSubtitle}>{title}</Text>
          </View>
        </View>
        
        <View style={styles.contentContainer}>
          <Text style={styles.pickerTitle}>NÚMERO DO COLETOR *</Text>
          <Text style={styles.pickerSubtitle}>Selecione o código abaixo.</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={currentCollector}
              onValueChange={setCurrentCollector}
              style={styles.pickerElement}
              dropdownIconColor={theme.primary}
            >
              <Picker.Item label="Toque para selecionar..." value={null} color={theme.textSecondary} />
              {collectorList.map((c, i) => {
                const isCompleted = c.value !== null && completedInShift.includes(c.value);
                return (
                  <Picker.Item
                    key={i}
                    label={isCompleted ? `${c.label} - Já Auditado` : c.label}
                    value={c.value}
                    color={isCompleted ? theme.lightGray : theme.textPrimary}
                    enabled={!isCompleted}
                  />
                );
              })}
            </Picker>
          </View>
        </View>
        
        <View style={{ padding: SIZES.padding }}>
          <TouchableOpacity
            style={[styles.actionButton, isBtnDisabled && styles.actionButtonDisabled]}
            onPress={handleStartChecklist}
            disabled={isBtnDisabled}
          >
            <Text style={[styles.actionButtonText, {color: "#FFFFFF"}]}>
               {isSelectedCompleted ? "JÁ REALIZADO NESTE TURNO" : "PROSSEGUIR"}
            </Text>
            {!isSelectedCompleted && (
              <MaterialCommunityIcons name="arrow-right" size={22} color="#FFFFFF" style={{ marginLeft: 10 }} />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screenContainer}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
          <Ionicons name="arrow-back" size={28} color={theme.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Checklist</Text>
          <Text style={styles.headerSubtitle}>
            {title} (Nº {currentCollector})
          </Text>
        </View>
      </View>

      <KeyboardWrapper>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}>
          
          {/* 👇 Renderiza automaticamente a lista criada pelo Painel Administrativo 👇 */}
          {normalizedQuestions.map((q, index) => (
            <MultiButtonSelector 
              key={index}
              title={q.text} 
              options={q.options} 
              selected={responses[q.text]} 
              onSelect={(opt) => handleSelectOption(q.text, opt)} 
              severity={q.gravity} 
              theme={theme} 
              isDark={isDark} 
              styles={styles} 
            />
          ))}
          
          <View style={styles.questionCard}>
            <Text style={styles.questionTitle}>OBSERVAÇÃO</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Alguma avaria ou comentário?"
              placeholderTextColor={theme.textSecondary}
              value={observacao}
              onChangeText={setObservacao}
              multiline={true}
              numberOfLines={3}
            />
          </View>
          
          <View style={styles.photoContainer}>
            <View style={styles.photoHeaderRow}>
              <Text style={styles.photoHeaderText}>Evidências ({photos.length})</Text>
              <TouchableOpacity style={styles.addPhotoButton} onPress={handleTakePhoto}>
                <Ionicons name="camera" size={20} color={theme.primary} />
                <Text style={styles.addPhotoText}>Add Foto</Text>
              </TouchableOpacity>
            </View>
            {photos.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                {photos.map((p, index) => (
                  <View key={index} style={styles.photoThumbContainer}>
                    <Image source={{ uri: p.uri }} style={styles.photoThumb} />
                    <TouchableOpacity style={styles.removeIcon} onPress={() => handleRemovePhoto(index)}>
                      <Ionicons name="close" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.noPhotoText}>Nenhuma foto anexada.</Text>
            )}
          </View>
          
          <View style={{ paddingHorizontal: SIZES.padding }}>
            <Text style={styles.progressText}>
              {answeredItemsCount} / {totalRequiredItems} itens marcados
            </Text>
            <TouchableOpacity
              style={[styles.actionButton, !isComplete && styles.actionButtonDisabled]}
              onPress={handleOpenReport}
              disabled={!isComplete}
            >
              <Text style={[styles.actionButtonText, {color: "#FFFFFF"}]}>FINALIZAR</Text>
              <Ionicons name="checkmark-done" size={22} color="#FFFFFF" style={{ marginLeft: 10 }} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardWrapper>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlaySlide}>
          <View style={styles.modalContent}>
            <Ionicons name="document-text" size={45} color={theme.primary} style={{ alignSelf: "center", marginBottom: 10 }} />
            <Text style={styles.modalTitle}>Resumo Final</Text>
            <Text style={{ textAlign: "center", marginBottom: 20, color: theme.textSecondary, fontSize: 15 }}>
              Coletor: <Text style={{ color: theme.textPrimary }}>{currentCollector}</Text>
            </Text>
            
            <TouchableOpacity style={[styles.actionButton, { marginTop: 10 }]} onPress={handleSaveAndExit} disabled={sending}>
              {sending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.actionButtonText, {color: "#FFFFFF"}]}>ENVIAR AUDITORIA</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)} disabled={sending}>
              <Text style={styles.cancelButtonText}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={successModalVisible} onRequestClose={() => {}}>
        <View style={styles.modalOverlayFade}>
          <View style={styles.successCard}>
            <View style={styles.iconCircleSuccess}>
              <Ionicons name="checkmark" size={45} color={theme.success} />
            </View>
            <Text style={styles.successTitle}>Sucesso!</Text>
            <Text style={{color: theme.textSecondary, marginBottom: 25, textAlign: 'center'}}>
              A auditoria do coletor foi registada.
            </Text>
            <TouchableOpacity style={[styles.actionButton, {width: '100%'}]} onPress={handleBackToMenu}>
              <Text style={[styles.actionButtonText, {color: "#FFFFFF"}]}>Voltar ao Menu</Text>
              <MaterialCommunityIcons name="arrow-u-left-top" size={20} color="#FFFFFF" style={{marginLeft: 8}}/>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (theme, isDark) => StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: theme.background, ...(Platform.OS === "web" ? { maxHeight: "100vh", overflow: "hidden" } : {}) },
  
  headerContainer: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 15, flexDirection: "row", alignItems: "center" },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: theme.textPrimary },
  headerSubtitle: { fontSize: 14, color: theme.textSecondary, marginTop: 2 },
  
  contentContainer: { flex: 1, padding: 20 },
  pickerTitle: { fontSize: 20, fontWeight: "bold", color: theme.textSecondary, marginBottom: 5, marginTop: 10 },
  pickerSubtitle: { fontSize: 14, color: theme.textSecondary, marginBottom: 20 },
  pickerWrapper: { backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", borderRadius: 12, borderWidth: 1, borderColor: theme.lightGray, overflow: "hidden" },
  pickerElement: { width: "100%", height: 60, color: theme.textPrimary, backgroundColor: theme.cardBackground },
  
  questionCard: { backgroundColor: theme.cardBackground, padding: 20, marginVertical: 8, marginHorizontal: 15, borderRadius: 12, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.03)" : theme.lightGray, elevation: isDark ? 1 : 2 },
  questionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  questionTitle: { fontSize: 14, fontWeight: "bold", color: theme.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  severityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  
  optionsContainer: { flexDirection: "row", flexWrap: "wrap", margin: -4 },
  optionButton: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: theme.lightGray, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", margin: 4 },
  optionButtonSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
  optionText: { fontSize: 14, fontWeight: "600", color: theme.textSecondary },
  optionTextSelected: { color: "#FFFFFF" },
  
  textInput: { backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", borderRadius: 8, borderColor: theme.lightGray, borderWidth: 1, padding: 14, fontSize: 15, color: theme.textPrimary, minHeight: 80, textAlignVertical: "top" },
  
  photoContainer: { marginVertical: 15, paddingHorizontal: 20 },
  photoHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  photoHeaderText: { fontWeight: "bold", color: theme.textPrimary, fontSize: 15 },
  addPhotoButton: { flexDirection: "row", backgroundColor: "rgba(2, 136, 209, 0.1)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: "rgba(2, 136, 209, 0.3)" },
  addPhotoText: { color: theme.primary, marginLeft: 6, fontWeight: "bold", fontSize: 13 },
  noPhotoText: { color: theme.textSecondary, fontStyle: "italic", fontSize: 13, marginTop: 10 },
  
  photoThumbContainer: { marginRight: 12, position: "relative", marginTop: 5 },
  photoThumb: { width: 75, height: 75, borderRadius: 10, borderWidth: 1, borderColor: theme.lightGray },
  removeIcon: { position: "absolute", top: -8, right: -8, backgroundColor: theme.danger, width: 24, height: 24, borderRadius: 12, justifyContent: "center", alignItems: "center", zIndex: 1, elevation: 2 },
  
  progressText: { textAlign: "center", marginBottom: 15, fontSize: 14, color: theme.textSecondary, fontWeight: "500" },
  actionButton: { flexDirection: "row", backgroundColor: theme.primary, paddingVertical: 15, borderRadius: 12, alignItems: "center", justifyContent: "center", elevation: 2 },
  actionButtonText: { fontWeight: "bold", fontSize: 15, letterSpacing: 0.5 },
  actionButtonDisabled: { backgroundColor: theme.lightGray, opacity: 0.6 },
  
  modalOverlaySlide: { flex: 1, justifyContent: "flex-end", backgroundColor: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.5)" },
  modalOverlayFade: { flex: 1, backgroundColor: isDark ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  
  modalContent: { width: "100%", backgroundColor: theme.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25, borderTopWidth: 1, borderColor: theme.lightGray },
  modalTitle: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginBottom: 5, color: theme.textPrimary },
  cancelButton: { marginTop: 12, backgroundColor: "transparent", paddingVertical: 15, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: theme.lightGray },
  cancelButtonText: { color: theme.textSecondary, fontWeight: "bold", fontSize: 14 },
  
  successCard: { width: "100%", backgroundColor: theme.cardBackground, borderRadius: 20, padding: 30, alignItems: "center", elevation: 5, borderWidth: 1, borderColor: theme.lightGray },
  iconCircleSuccess: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(0, 230, 118, 0.1)", justifyContent: "center", alignItems: "center", marginBottom: 20, borderWidth: 1, borderColor: "rgba(0, 230, 118, 0.3)" },
  successTitle: { fontSize: 24, fontWeight: "bold", color: theme.textPrimary, marginBottom: 10 },
});