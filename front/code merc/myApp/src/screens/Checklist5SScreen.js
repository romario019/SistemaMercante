import React, { useState } from "react";
import {
  StyleSheet, View, FlatList, Text, Modal, TouchableOpacity, Alert,
  StatusBar, ActivityIndicator, Image, ScrollView, TextInput,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import ChecklistItem from "../components/ChecklistItem";
import { sendReport } from "../services/api";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { SIZES } from "../colors/theme";
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

export default function Checklist5SScreen({ route, navigation }) {
  const { theme, isDark } = useTheme();
  const styles = getStyles(theme, isDark);

  const { title, userName, date, time, items, areaType, sectorDetail } = route.params;
  const [responses, setResponses] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [observacao, setObservacao] = useState("");

  const totalItems = items.length;
  const answeredItems = Object.keys(responses).length;
  const isComplete = totalItems === answeredItems;

  const handleSelectOption = (itemText, option) => {
    setResponses((prev) => ({ ...prev, [itemText]: option }));
  };

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permissão necessária", "Acesso à câmara é necessário.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
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

  const handleRemovePhoto = (indexToRemove) => {
    setPhotos(photos.filter((_, index) => index !== indexToRemove));
  };

  const handleOpenReport = () => {
    setModalVisible(true);
  };

  const handleSaveAndExit = async () => {
    setSending(true);
    try {
      const timestamp = new Date().toISOString();
      const uniqueId = `ID-5S-${Date.now()}`;
      const finalResponses = { ...responses, OBSERVAÇÃO: observacao || "" };
      const photosBase64 = photos.map((p) => p.base64);
      const reportData = {
        id: uniqueId, timestamp, equipmentTitle: title, userName, date, time,
        areaType, sectorDetail, responses: finalResponses, photosBase64,
      };
      await sendReport(reportData);

      const localReport = { ...reportData, photosBase64: [], hasPhotos: photos.length > 0 };
      await AsyncStorage.setItem(`@report_${timestamp}`, JSON.stringify(localReport));
      setModalVisible(false);
      setSuccessModalVisible(true);
    } catch (e) {
      console.error(e);
      Alert.alert("Erro", "Falha na ligação. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  const handleBackToCategory = () => {
    setSuccessModalVisible(false);
    navigation.goBack();
  };

  const renderFooter = () => (
    <View style={{ paddingBottom: 100, paddingHorizontal: 10 }}>
      <View style={styles.questionCard}>
        <Text style={styles.questionTitle}>OBSERVAÇÃO</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Alguma anotação sobre o 5S? (Opcional)"
          placeholderTextColor={theme.textSecondary}
          value={observacao}
          onChangeText={setObservacao}
          multiline={true}
          numberOfLines={3}
        />
      </View>

      <View style={styles.photoContainer}>
        <View style={styles.photoHeaderRow}>
          <Text style={styles.photoHeaderText}>
            Evidências ({photos.length})
          </Text>
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

      <Text style={styles.progressText}>
        {answeredItems} / {totalItems} itens marcados
      </Text>

      <TouchableOpacity
        style={[styles.actionButton, !isComplete && styles.actionButtonDisabled]}
        onPress={handleOpenReport}
        disabled={!isComplete}
      >
        <Text style={[styles.actionButtonText, {color: "#FFFFFF"}]}>FINALIZAR 5S</Text>
        <Ionicons name="checkmark-done" size={22} color="#FFFFFF" style={{ marginLeft: 10 }} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.screenContainer} edges={["top", "bottom", "left", "right"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />

      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={theme.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Auditoria 5S</Text>
          <Text style={styles.headerSubtitle}>{areaType} - {sectorDetail}</Text>
        </View>
      </View>

      <KeyboardWrapper>
        <FlatList
          data={items}
          renderItem={({ item }) => (
            <ChecklistItem
              itemText={item}
              onSelect={handleSelectOption}
              selectedOption={responses[item]}
              positiveLabel="SIM"
              negativeLabel="NÃO"
            />
          )}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.listContainer}
          style={[{ flex: 1 }, Platform.OS === "web" && { overflow: "auto" }]}
          ListFooterComponent={renderFooter()}
        />
      </KeyboardWrapper>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlaySlide}>
          <View style={styles.modalContent}>
            <Ionicons name="document-text" size={45} color={theme.primary} style={{ alignSelf: "center", marginBottom: 10 }} />
            <Text style={styles.modalTitle}>Resumo Final</Text>
            
            <Text style={styles.modalSubtitle}>
              Local: <Text style={{ color: theme.textPrimary }}>{sectorDetail}</Text>
            </Text>

            {photos.length > 0 && (
              <Text style={styles.modalPhotosText}>
                <Ionicons name="images" /> {photos.length} foto(s) em anexo
              </Text>
            )}

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {Object.entries(responses).map(([item, status]) => (
                <View key={item} style={styles.reportItem}>
                  <Text style={styles.reportItemText}>{item}:</Text>
                  {/* 👇 Ajustado para suportar SIM como sucesso 👇 */}
                  <Text style={[styles.reportStatusText, (status === "OK" || status === "SIM") ? styles.statusOk : styles.statusNok]}>
                    {status}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.actionButton, { marginTop: 10 }]}
              onPress={handleSaveAndExit}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.actionButtonText, {color: "#FFFFFF"}]}>ENVIAR AUDITORIA</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
              disabled={sending}
            >
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
              A tua auditoria foi registada no sistema.
            </Text>
            
            <TouchableOpacity style={[styles.actionButton, {width: '100%'}]} onPress={handleBackToCategory}>
              <Text style={[styles.actionButtonText, {color: "#FFFFFF"}]}>Voltar para {areaType}</Text>
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
  
  listContainer: { paddingHorizontal: 10, paddingBottom: 20 },
  
  questionCard: { backgroundColor: theme.cardBackground, padding: 20, marginVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.03)" : theme.lightGray, elevation: isDark ? 1 : 2 },
  questionTitle: { fontSize: 13, fontWeight: "bold", color: theme.textSecondary, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  textInput: { backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", borderRadius: 8, borderColor: theme.lightGray, borderWidth: 1, padding: 14, fontSize: 15, color: theme.textPrimary, minHeight: 80, textAlignVertical: "top" },
  
  photoContainer: { marginVertical: 15, paddingHorizontal: 5 },
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
  
  modalOverlaySlide: { flex: 1, justifyContent: "flex-end", backgroundColor: isDark ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.5)" },
  modalOverlayFade: { flex: 1, backgroundColor: isDark ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  
  modalContent: { width: "100%", backgroundColor: theme.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25, borderTopWidth: 1, borderColor: theme.lightGray },
  modalTitle: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginBottom: 5, color: theme.textPrimary },
  modalSubtitle: { textAlign: "center", marginBottom: 15, color: theme.textSecondary, fontSize: 15 },
  modalPhotosText: { textAlign: "center", marginBottom: 15, color: theme.primary, fontWeight: "bold", fontSize: 14 },
  modalScroll: { maxHeight: 220, marginBottom: 20 },
  reportItem: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.lightGray },
  reportItemText: { fontSize: 14, color: theme.textSecondary, flex: 1, paddingRight: 10 },
  reportStatusText: { fontSize: 14, fontWeight: "bold" },
  statusOk: { color: theme.success },
  statusNok: { color: theme.danger },
  cancelButton: { marginTop: 12, backgroundColor: "transparent", paddingVertical: 15, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: theme.lightGray },
  cancelButtonText: { color: theme.textSecondary, fontWeight: "bold", fontSize: 14 },

  successCard: { width: "100%", backgroundColor: theme.cardBackground, borderRadius: 20, padding: 30, alignItems: "center", elevation: 5, borderWidth: 1, borderColor: theme.lightGray },
  iconCircleSuccess: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(0, 230, 118, 0.1)", justifyContent: "center", alignItems: "center", marginBottom: 20, borderWidth: 1, borderColor: "rgba(0, 230, 118, 0.3)" },
  successTitle: { fontSize: 24, fontWeight: "bold", color: theme.textPrimary, marginBottom: 10 },
});