import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { SIZES } from "../colors/theme";
import { useTheme } from "../context/ThemeContext";

const API_URL = "http://10.77.1.165:3000/api";

export default function ReportDetailScreen({ route, navigation }) {
  const { theme, isDark } = useTheme();
  const styles = getStyles(theme, isDark);
  const { report } = route.params;

  const [userRole, setUserRole] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("@userRole").then(role => setUserRole(role || ""));
  }, []);

  // 📄 FUNÇÃO: GERAR PDF (ABRIR NA NOVA GUIA NA WEB)
  const handleExportPDF = async () => {
    setIsGeneratingPdf(true);
    
    // Na Web, abrimos a janela imediatamente para evitar o bloqueio de pop-ups do navegador
    let newWindow = null;
    if (Platform.OS === "web") {
      newWindow = window.open('', '_blank');
      if (!newWindow) {
        Alert.alert("Aviso", "O navegador bloqueou a nova aba. Por favor, permita pop-ups para este site.");
        setIsGeneratingPdf(false);
        return;
      }
    }

    const idEspecifico = report.specificId || report.collectorNumber || report.sectorDetail || "-";
    let observacaoText = "Nenhuma";
    
    const tableRows = Object.entries(report.responses)
      .map(([item, status]) => {
        if (item === "OBSERVAÇÃO") {
          observacaoText = status;
          return ""; 
        }
        const isAnomaly = status === "NÃO" || status === "NÃO OK";
        const badgeColor = isAnomaly ? "#EF4444" : "#28A745";
        return `
          <tr style="page-break-inside: avoid;">
            <td style="border: 1px solid #CBD5E1; padding: 12px; font-size: 14px;">${item}</td>
            <td style="border: 1px solid #CBD5E1; padding: 12px; text-align: center; font-weight: bold; color: ${badgeColor}; width: 120px;">
              ${status}
            </td>
          </tr>
        `;
      }).join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório - ${report.equipmentTitle} (${idEspecifico})</title>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #F1F5F9; margin: 0; padding: 20px; color: #1E293B; }
            .action-bar { text-align: center; margin-bottom: 20px; }
            .btn-print { background-color: #0288D1; color: white; border: none; padding: 12px 24px; font-size: 16px; border-radius: 8px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: 0.2s; }
            .btn-print:hover { background-color: #0277BD; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border-radius: 8px; }
            .header-title { color: #0288D1; font-size: 26px; font-weight: bold; text-transform: uppercase; margin: 0; text-align: center; }
            .header-subtitle { color: #64748B; font-size: 13px; margin-top: 5px; text-align: center; margin-bottom: 30px; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; background-color: #F8FAFC; }
            .info-table td { border: 1px solid #E2E8F0; padding: 12px; font-size: 14px; }
            .checklist-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .checklist-table th { background-color: #0288D1; color: white; padding: 12px; font-size: 14px; text-align: left; border: 1px solid #0288D1; }
            .obs-box { border: 1px solid #FDE68A; background-color: #FFFBEB; padding: 15px; border-radius: 8px; page-break-inside: avoid; }
            
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
            <h1 class="header-title">Relatório de Inspeção</h1>
            <p class="header-subtitle">Documento Oficial - Sistema Mercante</p>
            
            <table class="info-table" style="page-break-inside: avoid;">
              <tr>
                <td style="color: #64748B; font-weight: bold; width: 20%;">Equipamento:</td>
                <td style="color: #0F172A; font-weight: bold; width: 30%;">${report.equipmentTitle}</td>
                <td style="color: #64748B; font-weight: bold; width: 20%;">Operador:</td>
                <td style="color: #0F172A; font-weight: bold; width: 30%;">${report.userName}</td>
              </tr>
              <tr>
                <td style="color: #64748B; font-weight: bold;">Cód / Setor:</td>
                <td style="color: #0F172A; font-weight: bold;">${idEspecifico}</td>
                <td style="color: #64748B; font-weight: bold;">Data / Hora:</td>
                <td style="color: #0F172A; font-weight: bold;">${report.date} às ${report.time}</td>
              </tr>
            </table>

            <table class="checklist-table">
              <thead>
                <tr>
                  <th>Item Verificado</th>
                  <th style="text-align: center;">Resultado</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>

            <div class="obs-box">
              <div style="font-size: 14px; font-weight: bold; color: #D97706; margin-bottom: 5px;">OBSERVAÇÕES ADICIONAIS:</div>
              <div style="font-size: 14px; color: #333; line-height: 1.5;">${observacaoText}</div>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      if (Platform.OS === "web") {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
      } else {
        // Mobile continua com o comportamento padrão de exportar ficheiro
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, { UTI: "com.adobe.pdf", mimeType: "application/pdf" });
      }
    } catch (error) {
      Alert.alert("Erro", "Falha ao gerar documento.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDeleteRequest = () => {
    setConfirmModalVisible(true);
  };

  const executeDelete = async () => {
    setConfirmModalVisible(false); 
    setIsDeleting(true);
    try {
      await fetch(`${API_URL}/relatorios/${report.id}`, { method: "DELETE" });
      const keys = await AsyncStorage.getAllKeys();
      const reportKeys = keys.filter(k => k.startsWith("@report_"));
      const savedReports = await AsyncStorage.multiGet(reportKeys);
      let keyToDelete = null;
      savedReports.forEach(([key, value]) => {
        const r = JSON.parse(value);
        if (r.id === report.id) keyToDelete = key;
      });
      if (keyToDelete) await AsyncStorage.removeItem(keyToDelete);
      setSuccessModalVisible(true);
    } catch (error) {
      alert("Não foi possível excluir o checklist. Verifique a rede.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top", "bottom", "left", "right"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>Relatório</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{report.equipmentTitle}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={{ paddingVertical: 10, paddingBottom: 80 }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Identificação</Text>
          <View style={styles.infoRow}><Ionicons name="person-outline" size={20} color={theme.primary} style={styles.infoIcon} /><Text style={styles.infoText}>Operador: <Text style={styles.infoData}>{report.userName}</Text></Text></View>
          <View style={styles.infoRow}><Ionicons name="calendar-outline" size={20} color={theme.primary} style={styles.infoIcon} /><Text style={styles.infoText}>Data: <Text style={styles.infoData}>{report.date}</Text></Text></View>
          <View style={styles.infoRow}><Ionicons name="time-outline" size={20} color={theme.primary} style={styles.infoIcon} /><Text style={styles.infoText}>Hora: <Text style={styles.infoData}>{report.time}</Text></Text></View>
          {report.collectorNumber && <View style={styles.infoRow}><Ionicons name="barcode-outline" size={20} color={theme.primary} style={styles.infoIcon} /><Text style={styles.infoText}>Coletor Nº: <Text style={styles.infoData}>{report.collectorNumber}</Text></Text></View>}
          {report.sectorDetail && <View style={styles.infoRow}><Ionicons name="location-outline" size={20} color={theme.primary} style={styles.infoIcon} /><Text style={styles.infoText}>Local: <Text style={styles.infoData}>{report.areaType} - {report.sectorDetail}</Text></Text></View>}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Itens Verificados</Text>
          {report.equipmentTitle === "Coletores"
            ? Object.entries(report.responses).map(([item, status]) => (
                <View key={item} style={styles.reportItem}>
                  <Text style={styles.reportItemTextCollector}>{item}</Text>
                  <Text style={styles.reportItemValueCollector}>{status}</Text>
                </View>
              ))
            : Object.entries(report.responses).map(([item, status]) => (
                <View key={item} style={styles.reportItem}>
                  {item === "OBSERVAÇÃO" ? (
                    <View style={{flexDirection: 'column', width: '100%'}}>
                       <Text style={[styles.reportItemText, {fontWeight: 'bold', color: theme.textSecondary, marginBottom: 5}]}>{item}</Text>
                       <Text style={{color: theme.textPrimary}}>{status}</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.reportItemText}>{item}</Text>
                      <View style={[styles.statusBadge, (status === "SIM" || status === "OK") ? styles.statusOkBadge : styles.statusNokBadge]}>
                        <Text style={[styles.statusBadgeText, (status === "SIM" || status === "OK") && { color: "#FFFFFF" }]}>{status}</Text>
                      </View>
                    </>
                  )}
                </View>
              ))}
        </View>

        {(userRole === "Administrador" || userRole === "SuperAdmin") && (
          <View>
            <TouchableOpacity style={styles.pdfButtonInline} onPress={handleExportPDF} disabled={isGeneratingPdf}>
              {isGeneratingPdf ? <ActivityIndicator color="#FFFFFF" /> : (
                <>
                  <Ionicons name="document-text-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonTextInline}> GERAR PDF</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteButtonInline} onPress={handleDeleteRequest} disabled={isDeleting}>
              {isDeleting ? <ActivityIndicator color="#FFFFFF" /> : (
                <>
                  <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonTextInline}> EXCLUIR CHECKLIST</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal animationType="fade" transparent={true} visible={confirmModalVisible} onRequestClose={() => setConfirmModalVisible(false)}>
        <View style={styles.modalOverlayFade}>
          <View style={[styles.successCard, { paddingVertical: 35 }]}>
            <Ionicons name="warning-outline" size={60} color={theme.danger} style={{ marginBottom: 15 }} />
            <Text style={[styles.successTitle, { fontSize: 22, textAlign: "center" }]}>Atenção</Text>
            <Text style={{color: theme.textSecondary, marginBottom: 30, textAlign: 'center', fontSize: 15, lineHeight: 22}}>Tem certeza que deseja excluir o checklist: {"\n"}<Text style={{ color: theme.textPrimary, fontWeight: "bold" }}>{report.equipmentTitle}</Text>?</Text>
            <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
              <TouchableOpacity style={[styles.btnAction, { flex: 1, backgroundColor: "transparent", borderWidth: 1, borderColor: theme.lightGray, marginRight: 8 }]} onPress={() => setConfirmModalVisible(false)}><Text style={{ color: theme.textSecondary, fontWeight: "bold", fontSize: 15 }}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btnAction, { flex: 1, backgroundColor: theme.danger, marginLeft: 8 }]} onPress={executeDelete}><Text style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 15 }}>Excluir</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={successModalVisible} onRequestClose={() => {}}>
        <View style={styles.modalOverlayFade}>
          <View style={styles.successCard}>
            <View style={styles.iconCircleSuccess}><Ionicons name="checkmark" size={45} color={theme.success} /></View>
            <Text style={styles.successTitle}>Checklist Excluído!</Text>
            <Text style={{color: theme.textSecondary, marginBottom: 25, textAlign: 'center', fontSize: 15}}>O relatório foi apagado do sistema e a máquina está livre para uma nova inspeção.</Text>
            <TouchableOpacity style={[styles.btnAction, { width: '100%', backgroundColor: theme.primary }]} onPress={() => { setSuccessModalVisible(false); navigation.goBack(); }}><Text style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 15, letterSpacing: 0.5 }}>Voltar</Text><MaterialCommunityIcons name="arrow-u-left-top" size={20} color="#FFFFFF" style={{marginLeft: 8}}/></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (theme, isDark) => StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: theme.background, ...(Platform.OS === "web" ? { maxHeight: "100vh", overflow: "hidden" } : {}) },
  scrollContainer: { flex: 1 },
  headerContainer: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 15, flexDirection: "row", alignItems: "center" },
  backButton: { marginRight: 15 },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: theme.textPrimary },
  headerSubtitle: { fontSize: 14, color: theme.textSecondary, marginTop: 2 },
  card: { backgroundColor: theme.cardBackground, borderRadius: 12, padding: 20, marginHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.03)" : theme.lightGray, elevation: isDark ? 1 : 2 },
  cardTitle: { fontSize: 14, fontWeight: "bold", color: theme.textSecondary, borderBottomWidth: 1, borderBottomColor: theme.lightGray, paddingBottom: 10, marginBottom: 15, textTransform: "uppercase", letterSpacing: 0.5 },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  infoIcon: { marginRight: 10, backgroundColor: "rgba(2, 136, 209, 0.1)", padding: 6, borderRadius: 8 },
  infoText: { fontSize: 15, color: theme.textSecondary },
  infoData: { fontWeight: "bold", color: theme.textPrimary },
  reportItem: { flexDirection: "row", justifycontent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: isDark ? "rgba(255,255,255,0.02)" : theme.lightGray },
  reportItemText: { fontSize: 14, color: theme.textPrimary, flex: 1, paddingRight: 10, lineHeight: 20 },
  reportItemTextCollector: { fontSize: 13, color: theme.textSecondary, fontWeight: "bold", textTransform: "uppercase", flex: 1 },
  reportItemValueCollector: { fontSize: 14, color: theme.textPrimary, fontWeight: "bold", flex: 1, textAlign: "right" },
  statusBadge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginLeft: 10 },
  statusBadgeText: { fontWeight: "bold", fontSize: 12, letterSpacing: 0.5 },
  statusOkBadge: { backgroundColor: theme.success },
  statusNokBadge: { backgroundColor: theme.danger },
  pdfButtonInline: { backgroundColor: "#0288D1", flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 12, marginHorizontal: 15, marginTop: 15, elevation: 2, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  deleteButtonInline: { backgroundColor: "#EF4444", flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 12, marginHorizontal: 15, marginTop: 10, marginBottom: 20, elevation: 2, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  actionButtonTextInline: { color: "#FFFFFF", fontSize: 15, fontWeight: "bold", marginLeft: 8, letterSpacing: 1 },
  modalOverlayFade: { flex: 1, backgroundColor: isDark ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
  successCard: { width: "100%", maxWidth: 400, backgroundColor: theme.cardBackground, borderRadius: 20, padding: 30, alignItems: "center", elevation: 5, borderWidth: 1, borderColor: theme.lightGray },
  iconCircleSuccess: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(0, 230, 118, 0.1)", justifyContent: "center", alignItems: "center", marginBottom: 20, borderWidth: 1, borderColor: "rgba(0, 230, 118, 0.3)" },
  successTitle: { fontSize: 24, fontWeight: "bold", color: theme.textPrimary, marginBottom: 10 },
  btnAction: { flexDirection: "row", paddingVertical: 15, borderRadius: 12, alignItems: "center", justifyContent: "center", elevation: 1 }
});