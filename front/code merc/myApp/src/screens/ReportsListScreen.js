import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  TextInput
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { fetchReportHistory } from "../services/api";
import { useTheme } from "../context/ThemeContext";

const parseDateFromTimestamp = (timestampStr) => {
  if (!timestampStr) return 0;
  if (timestampStr.includes("T")) return new Date(timestampStr).getTime();
  if (timestampStr.includes("/")) {
    const [datePart, timePart] = timestampStr.split(" ");
    if (datePart && timePart) {
      const [day, month, year] = datePart.split("/");
      const [hour, minute] = timePart.split(":");
      return new Date(year, month - 1, day, hour, minute).getTime(); 
    }
  }
  return new Date(timestampStr).getTime();
};

export default function ReportsListScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const styles = getStyles(theme, isDark);

  const [localReports, setLocalReports] = useState([]);
  const [cloudReports, setCloudReports] = useState([]);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [userRole, setUserRole] = useState("");
  
  const [activeTab, setActiveTab] = useState("local");
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [targetDate, setTargetDate] = useState("");
  const [isGeneratingDaily, setIsGeneratingDaily] = useState(false);

  const isFocused = useIsFocused();

  useEffect(() => {
    AsyncStorage.getItem("@userRole").then(role => setUserRole(role || ""));
    const today = new Date();
    const formattedToday = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    setTargetDate(formattedToday);
  }, []);

  // 📄 FUNÇÃO: GERAR DIÁRIO MACRO (ABRIR NA NOVA GUIA)
  const handleGenerateDailyPDF = async () => {
    if (!targetDate.trim()) return;
    setIsGeneratingDaily(true);

    let newWindow = null;
    if (Platform.OS === "web") {
      newWindow = window.open('', '_blank');
      if (!newWindow) {
        Alert.alert("Aviso", "O navegador bloqueou a nova aba. Por favor, permita pop-ups para este site.");
        setIsGeneratingDaily(false);
        return;
      }
    }
    
    const dayReports = cloudReports.filter(r => r.date === targetDate.trim());
    
    if (dayReports.length === 0) {
      if (newWindow) newWindow.close();
      Alert.alert("Aviso", `Nenhum checklist foi encontrado na Nuvem para a data: ${targetDate}`);
      setIsGeneratingDaily(false);
      return;
    }

    setDateModalVisible(false);

    const reportsHtml = dayReports.map((report, idx) => {
      const idEspecifico = report.specificId || report.collectorNumber || report.sectorDetail || "-";
      
      let observacaoText = "Nenhuma";
      const rows = Object.entries(report.responses).map(([item, status]) => {
        if (item === "OBSERVAÇÃO") {
            observacaoText = status;
            return "";
        }
        const isAnomaly = status === "NÃO" || status === "NÃO OK";
        return `
          <tr style="page-break-inside: avoid;">
            <td style="padding: 10px; font-size: 13px; border: 1px solid #CBD5E1;">${item}</td>
            <td style="padding: 10px; font-size: 13px; border: 1px solid #CBD5E1; font-weight: bold; text-align: center; color: ${isAnomaly ? '#EF4444' : '#28A745'}; width: 100px;">${status}</td>
          </tr>
        `;
      }).join("");

      return `
        <div style="margin-bottom: 40px; page-break-inside: avoid;">
          <div style="background: #E0F2FE; padding: 12px; border: 1px solid #BAE6FD; font-weight: bold; font-size: 16px; color: #0369A1;">
            #${idx + 1} - ${report.equipmentTitle}
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-top: 5px; page-break-inside: avoid;">
            <tr>
              <td style="padding: 10px; font-size: 13px; border: 1px solid #CBD5E1; width: 33%;"><b>Cód/Setor:</b> ${idEspecifico}</td>
              <td style="padding: 10px; font-size: 13px; border: 1px solid #CBD5E1; width: 33%;"><b>Operador:</b> ${report.userName}</td>
              <td style="padding: 10px; font-size: 13px; border: 1px solid #CBD5E1; width: 33%;"><b>Hora:</b> ${report.time}</td>
            </tr>
          </table>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background: #0288D1; color: white;">
                <th style="padding: 10px; font-size: 13px; border: 1px solid #0288D1; text-align: left;">Item Avaliado</th>
                <th style="padding: 10px; font-size: 13px; border: 1px solid #0288D1; text-align: center;">Resultado</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div style="border: 1px solid #CBD5E1; border-top: none; background-color: #FFFBEB; padding: 15px; font-size: 13px; page-break-inside: avoid;">
             <span style="font-weight: bold; color: #D97706;">OBSERVAÇÕES:</span> ${observacaoText}
          </div>
        </div>
      `;
    }).join("");

    const masterHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório Diário - ${targetDate}</title>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #F1F5F9; margin: 0; padding: 20px; color: #1E293B; }
            .action-bar { text-align: center; margin-bottom: 20px; }
            .btn-print { background-color: #0288D1; color: white; border: none; padding: 12px 24px; font-size: 16px; border-radius: 8px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: 0.2s; }
            .btn-print:hover { background-color: #0277BD; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border-radius: 8px; }
            
            @media print {
              body { background-color: white; padding: 0; }
              .container { box-shadow: none; padding: 0; max-width: 100%; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="action-bar no-print">
            <button class="btn-print" onclick="window.print()">🖨️ Salvar como PDF / Imprimir</button>
            <p style="color: #64748B; font-size: 14px; margin-top: 10px;">Para baixar, clique no botão acima e altere o Destino para "Salvar como PDF".</p>
          </div>
          
          <div class="container">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #E2E8F0; padding-bottom: 15px;">
              <h1 style="font-size: 26px; font-weight: bold; color: #0288D1; text-transform: uppercase; margin: 0;">Relatório Diário Consolidado</h1>
              <p style="font-size: 14px; color: #64748B; margin-top: 5px;">Compilado Oficial - Sistema Mercante</p>
            </div>
            
            <div style="background: #0288D1; color: white; padding: 15px; border-radius: 8px; margin-bottom: 30px; font-size: 15px; page-break-inside: avoid; text-align: center;">
              <b>Data de Referência:</b> ${targetDate} &nbsp;|&nbsp;
              <b>Total de Inspeções:</b> ${dayReports.length} realizadas
            </div>

            ${reportsHtml}
          </div>
        </body>
      </html>
    `;

    try {
      if (Platform.OS === "web") {
        newWindow.document.write(masterHtml);
        newWindow.document.close();
      } else {
        const { uri } = await Print.printToFileAsync({ html: masterHtml });
        await Sharing.shareAsync(uri, { UTI: "com.adobe.pdf", mimeType: "application/pdf" });
      }
    } catch (e) {
      Alert.alert("Erro", "Não foi possível gerar a consolidação diária.");
    } finally {
      setIsGeneratingDaily(false);
    }
  };

  const loadLocalReports = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const reportKeys = keys.filter((key) => key.startsWith("@report_"));
      const savedReports = await AsyncStorage.multiGet(reportKeys);
      const validReports = [];
      const keysToRemove = [];
      const nowMs = Date.now();
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

      savedReports.forEach(([key, value]) => {
        try {
          const report = JSON.parse(value);
          const reportDateMs = parseDateFromTimestamp(report.timestamp);
          if (nowMs - reportDateMs > sevenDaysInMs) {
            keysToRemove.push(key);
          } else {
            validReports.push(report);
          }
        } catch (err) {}
      });

      if (keysToRemove.length > 0) await AsyncStorage.multiRemove(keysToRemove);

      validReports.sort((a, b) => parseDateFromTimestamp(b.timestamp) - parseDateFromTimestamp(a.timestamp));
      setLocalReports(validReports);
    } catch (e) {}
  };

  const loadCloudReports = async () => {
    setLoadingCloud(true);
    try {
      const data = await fetchReportHistory();
      if (!data || data.status === "error" || !Array.isArray(data)) {
        setCloudReports([]);
        return;
      }
      const sortedData = data.sort((a, b) => parseDateFromTimestamp(b.timestamp) - parseDateFromTimestamp(a.timestamp));
      setCloudReports(sortedData); 
    } catch (e) {
    } finally {
      setLoadingCloud(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadLocalReports(); 
      if (activeTab === "cloud") loadCloudReports();
    }
  }, [isFocused, activeTab]);

  const handleReportPress = (report) => {
    navigation.navigate("ReportDetail", { report: report });
  };

  const renderReportItem = ({ item }) => {
    let iconBgColor, iconColor, iconName;
    if (item.equipmentTitle === "Coletores") {
      iconBgColor = "rgba(2, 136, 209, 0.15)";
      iconColor = theme.primary;
      iconName = "barcode-outline";
    } else {
      const pendenciasCount = item.responses
        ? Object.values(item.responses).filter((status) => status === "NÃO" || status === "NÃO OK").length
        : 0;

      if (pendenciasCount > 0) {
        iconBgColor = "rgba(239, 68, 68, 0.15)";
        iconColor = theme.danger;
        iconName = "warning-outline";
      } else {
        iconBgColor = "rgba(0, 230, 118, 0.15)";
        iconColor = theme.success;
        iconName = "checkmark-circle-outline";
      }
    }

    return (
      <TouchableOpacity style={styles.card} onPress={() => handleReportPress(item)}>
        <View style={[styles.statusIcon, { backgroundColor: iconBgColor }]}><Ionicons name={iconName} size={26} color={iconColor} /></View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.equipmentTitle}{item.sectorDetail ? ` - ${item.sectorDetail}` : ""}{item.collectorNumber && item.collectorNumber !== "-" ? ` (Nº ${item.collectorNumber})` : ""}</Text>
          <Text style={styles.cardSubtitle}>Por: <Text style={{ color: theme.textPrimary }}>{item.userName}</Text></Text>
          <Text style={styles.cardSubtitle}>Em: {item.date} - {item.time}</Text>
        </View>
        <Ionicons name="chevron-forward-outline" size={20} color={theme.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top", "bottom", "left", "right"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      <View style={styles.headerContainer}>
        <View style={styles.headerTopRow}>
          <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={28} color={theme.textPrimary} />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Relatórios</Text>
              <Text style={styles.headerSubtitle}>Histórico de inspeções</Text>
            </View>
          </View>

          {(userRole === "Administrador" || userRole === "SuperAdmin") && activeTab === "cloud" && (
            <TouchableOpacity style={styles.btnDailyPdfHeader} onPress={() => setDateModalVisible(true)}>
              <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
              <Text style={styles.btnDailyPdfText}> GERAR DIÁRIO</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tabButton, activeTab === "local" && styles.activeTab]} onPress={() => setActiveTab("local")}><Text style={[styles.tabText, activeTab === "local" && styles.activeTabText]}>Locais (7 dias)</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === "cloud" && styles.activeTab]} onPress={() => setActiveTab("cloud")}><Text style={[styles.tabText, activeTab === "cloud" && styles.activeTabText]}>Nuvem (Todos)</Text></TouchableOpacity>
        </View>
      </View>

      {activeTab === "cloud" && loadingCloud ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>A procurar dados no servidor...</Text>
        </View>
      ) : (
        <FlatList data={activeTab === "local" ? localReports : cloudReports} renderItem={renderReportItem} keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())} contentContainerStyle={styles.listContainer} style={[{ flex: 1 }, Platform.OS === "web" && { overflow: "auto" }]} ListEmptyComponent={<View style={styles.emptyContainer}><View style={styles.emptyIconCircle}><Ionicons name={activeTab === "local" ? "trash-outline" : "cloud-offline-outline"} size={45} color={theme.textSecondary} /></View><Text style={styles.emptyText}>{activeTab === "local" ? "Sem relatórios recentes (últimos 7 dias)." : "Nenhum histórico encontrado na nuvem."}</Text></View>} refreshing={activeTab === "cloud" ? loadingCloud : false} onRefresh={activeTab === "cloud" ? loadCloudReports : loadLocalReports} />
      )}

      <Modal visible={dateModalVisible} transparent animationType="slide" onRequestClose={() => setDateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="calendar" size={45} color="#0288D1" style={{ alignSelf: "center", marginBottom: 10 }} />
            <Text style={styles.modalTitle}>Gerar Diário</Text>
            <Text style={styles.modalSubtitle}>Informe a data exata para compilar os relatórios numa nova guia.</Text>
            
            <TextInput style={styles.textInput} placeholder="Ex: 10/06/2026" placeholderTextColor={theme.textSecondary} value={targetDate} onChangeText={setTargetDate} />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDateModalVisible(false)} disabled={isGeneratingDaily}><Text style={styles.cancelBtnText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleGenerateDailyPDF} disabled={isGeneratingDaily}>{isGeneratingDaily ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmBtnText}>Gerar PDF</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (theme, isDark) => StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: theme.background, ...(Platform.OS === "web" ? { maxHeight: "100vh", overflow: "hidden" } : {}) },
  headerContainer: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 0 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: theme.textPrimary },
  headerSubtitle: { fontSize: 14, color: theme.textSecondary, marginTop: 2 },
  tabContainer: { flexDirection: "row" },
  tabButton: { flex: 1, paddingVertical: 14, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "rgba(255,255,255,0.05)" },
  activeTab: { borderBottomColor: theme.primary },
  tabText: { color: theme.textSecondary, fontWeight: "600", fontSize: 15 },
  activeTabText: { color: theme.primary, fontWeight: "bold" },
  listContainer: { paddingHorizontal: 15, paddingVertical: 15, paddingBottom: 30 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: theme.cardBackground, marginBottom: 12, padding: 18, borderRadius: 12, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.03)" : theme.lightGray, elevation: isDark ? 1 : 2 },
  statusIcon: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 15 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: theme.textPrimary, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: "40%" },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", alignItems: "center", justifyContent: "center", marginBottom: 15 },
  emptyText: { fontSize: 15, color: theme.textSecondary, textAlign: "center", paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 15, color: theme.textSecondary, fontSize: 15 },
  btnDailyPdfHeader: { backgroundColor: "#0288D1", flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  btnDailyPdfText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13, letterSpacing: 0.5, marginLeft: 6 },
  modalOverlay: { flex: 1, backgroundColor: isDark ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: theme.cardBackground, padding: 25, borderRadius: 20, borderWidth: 1, borderColor: theme.lightGray, elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 5, textAlign: "center", color: theme.textPrimary },
  modalSubtitle: { textAlign: "center", marginBottom: 20, color: theme.textSecondary, fontSize: 14 },
  textInput: { borderWidth: 1, borderColor: theme.lightGray, borderRadius: 10, padding: 14, fontSize: 15, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", color: theme.textPrimary, textAlign: "center" },
  modalActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 25 },
  cancelBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: "center", marginHorizontal: 5, borderWidth: 1, borderColor: theme.lightGray },
  cancelBtnText: { color: theme.textSecondary, fontWeight: "bold", fontSize: 15 },
  confirmBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: "center", marginHorizontal: 5, backgroundColor: "#0288D1" },
  confirmBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 15 }
});