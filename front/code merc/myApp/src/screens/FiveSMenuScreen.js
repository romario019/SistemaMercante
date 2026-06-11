import React, { useState, useCallback } from "react";
import {
  StyleSheet, Text, View, TouchableOpacity, FlatList,
  Alert, Modal, ScrollView, Platform, StatusBar
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SIZES } from "../colors/theme";
import { useTheme } from "../context/ThemeContext";

const formatTitleCase = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function FiveSMenuScreen({ route, navigation }) {
  const { theme, isDark } = useTheme();
  const styles = getStyles(theme, isDark);

  const { userName, date, time, apiData } = route.params;
  const [allCompletedSectors, setAllCompletedSectors] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedArea, setSelectedArea] = useState(null);

  const [subSelectionVisible, setSubSelectionVisible] = useState(false);
  const [subSelectionType, setSubSelectionType] = useState(null);
  const [currentSectorTag, setCurrentSectorTag] = useState(null);
  const [subOptions, setSubOptions] = useState([]);

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
      const loadCompletedSectors = async () => {
        try {
          const serverCompleted = apiData?.completedThisShift?.s5 || [];
          const currentShiftKey = getShiftKeyFromAppFormat(date, time);
          const keys = await AsyncStorage.getAllKeys();
          const reportKeys = keys.filter((key) => key.startsWith("@report_"));
          const savedReports = await AsyncStorage.multiGet(reportKeys);

          const localCompleted = [];
          savedReports.forEach(([key, value]) => {
            const report = JSON.parse(value);
            if (report.equipmentTitle === "Auditoria 5S" && report.sectorDetail) {
              if (getShiftKeyFromAppFormat(report.date, report.time) === currentShiftKey) {
                localCompleted.push(report.sectorDetail);
              }
            }
          });
          const combined = [...new Set([...serverCompleted, ...localCompleted])];
          setAllCompletedSectors(combined);
        } catch (e) {
          console.error("Erro ao carregar setores:", e);
        }
      };
      loadCompletedSectors();
    }, [apiData]),
  );

  useFocusEffect(
    useCallback(() => {
      if (route.params?.autoOpenType) {
        const type = route.params.autoOpenType;
        setSelectedArea("DEPOSITO");
        setCurrentStep(2);
        if (type === "Rua") setupSubSelection("Rua", 18, "RUAS");
        else if (type === "Doca") setupSubSelection("Doca", 5, "DOCAS");
        navigation.setParams({ autoOpenType: null });
      }
    }, [route.params]),
  );

  const handleAreaSelect = (area) => {
    setSelectedArea(area);
    setCurrentStep(2);
  };

  const setupSubSelection = (prefix, count, tag) => {
    const options = Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}`);
    setSubOptions(options);
    setSubSelectionType(prefix);
    setCurrentSectorTag(tag);
    setSubSelectionVisible(true);
  };

  const handleSectorPress = (sectorItem) => {
    if (!sectorItem || !sectorItem.name) return;
    const sectorName = sectorItem.name;
    const sectorTag = sectorItem.tag || "DEPOSITO";

    if (allCompletedSectors.includes(sectorName)) {
      Alert.alert("Concluído", `O setor "${formatTitleCase(sectorName)}" já foi auditado neste turno.`);
      return;
    }

    if (sectorName.toLowerCase() === "ruas" && selectedArea === "DEPOSITO") {
      setupSubSelection("Rua", 18, sectorTag);
      return;
    }
    if (sectorName.toLowerCase() === "docas" && selectedArea === "DEPOSITO") {
      setupSubSelection("Doca", 5, sectorTag);
      return;
    }
    startChecklist(sectorName, sectorTag);
  };

  const handleSubSelection = (fullSectorName) => {
    if (allCompletedSectors.includes(fullSectorName)) {
      Alert.alert("Concluído", `O local "${formatTitleCase(fullSectorName)}" já foi auditado neste turno.`);
      return;
    }
    setSubSelectionVisible(false);
    startChecklist(fullSectorName, currentSectorTag);
  };

  const startChecklist = (sectorDetail, tag) => {
    const questionsMap = apiData?.data5S?.questions || {};
    let questions = [];

    if (tag === "RUAS") {
      questions = questionsMap[sectorDetail.toUpperCase()];
    } else if (tag === "DOCAS") {
      questions = questionsMap["DOCAS"];
    } else {
      questions = questionsMap[tag] || questionsMap[tag?.toUpperCase()] || questionsMap[selectedArea];
    }

    if (!questions || questions.length === 0) {
      Alert.alert("Atenção", `Nenhuma pergunta encontrada para: "${sectorDetail}".`);
      return;
    }

    navigation.navigate("Checklist5S", {
      title: "Auditoria 5S",
      userName,
      date,
      time,
      areaType: formatTitleCase(selectedArea || "DEPOSITO"),
      sectorDetail: formatTitleCase(sectorDetail),
      items: questions,
    });
  };

  if (currentStep === 1) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Auditoria 5S</Text>
        </View>

        <ScrollView style={[{ flex: 1 }, Platform.OS === "web" && { overflow: "auto" }]} contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Selecione a Área Macro</Text>

          <TouchableOpacity style={[styles.macroCard, { borderLeftColor: theme.primary }]} onPress={() => handleAreaSelect("DEPOSITO")}>
            <View style={[styles.iconWrapper, { backgroundColor: "rgba(2, 136, 209, 0.1)" }]}>
              <MaterialCommunityIcons name="warehouse" size={32} color={theme.primary} />
            </View>
            <View style={styles.cardTextWrapper}>
              <Text style={styles.cardTitle}>Depósito</Text>
              <Text style={styles.cardDescription}>Ruas, Docas, Blocados e mais.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.lightGray} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.macroCard, { borderLeftColor: theme.warning }]} onPress={() => handleAreaSelect("OFFICE")}>
            <View style={[styles.iconWrapper, { backgroundColor: "rgba(245, 124, 0, 0.1)" }]}>
              <MaterialCommunityIcons name="office-building" size={32} color={theme.warning} />
            </View>
            <View style={styles.cardTextWrapper}>
              <Text style={styles.cardTitle}>Office</Text>
              <Text style={styles.cardDescription}>Escritórios, Salas e Reuniões.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.lightGray} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.macroCard, { borderLeftColor: "#607D8B" }]} onPress={() => handleAreaSelect("PÁTIO")}>
            <View style={[styles.iconWrapper, { backgroundColor: "rgba(96, 125, 139, 0.1)" }]}>
              <MaterialCommunityIcons name="truck" size={32} color="#607D8B" />
            </View>
            <View style={styles.cardTextWrapper}>
              <Text style={styles.cardTitle}>Pátio</Text>
              <Text style={styles.cardDescription}>Área externa e circulação.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.lightGray} />
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    );
  }

  const sectorsList = apiData?.data5S?.sectors?.[selectedArea] || [];

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentStep(1)}>
          <Ionicons name="arrow-back" size={28} color={theme.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Setores</Text>
          <Text style={styles.headerSubtitle}>{formatTitleCase(selectedArea)}</Text>
        </View>
      </View>

      <FlatList
        data={sectorsList}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
        style={[{ flex: 1 }, Platform.OS === "web" && { overflow: "auto" }]}
        renderItem={({ item }) => {
          const isCategoryGroup = item.name.toLowerCase() === "ruas" || item.name.toLowerCase() === "docas";
          const isCompleted = !isCategoryGroup && allCompletedSectors.includes(item.name);
          return (
            <TouchableOpacity 
              style={[styles.sectorCard, isCompleted && styles.sectorCardDisabled]} 
              onPress={() => !isCompleted && handleSectorPress(item)} 
              disabled={isCompleted}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <Text style={[styles.sectorText, isCompleted && styles.sectorTextDisabled]} numberOfLines={2}>
                  {formatTitleCase(item.name)}
                </Text>
                {isCompleted && <Text style={styles.completedBadge}> (AUDITADO) </Text>}
              </View>
              {isCompleted ? (
                <Ionicons name="checkmark-circle" size={22} color={theme.success} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              )}
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={subSelectionVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecione: {formatTitleCase(subSelectionType)}</Text>
            
            <ScrollView style={{ maxHeight: 300, marginVertical: 10 }}>
              {subOptions.map((opt) => {
                const isSubCompleted = allCompletedSectors.includes(opt);
                return (
                  <TouchableOpacity 
                    key={opt} 
                    style={[styles.subOptionButton, isSubCompleted && styles.subOptionDisabled]} 
                    onPress={() => !isSubCompleted && handleSubSelection(opt)} 
                    disabled={isSubCompleted}
                  >
                    <Text style={[styles.subOptionText, isSubCompleted && styles.subOptionTextDisabled]}>
                      {formatTitleCase(opt)}
                    </Text>
                    {isSubCompleted && <Ionicons name="checkmark-circle" size={22} color={theme.success} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setSubSelectionVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
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
  headerTitle: { fontSize: 22, fontWeight: "bold", color: theme.textPrimary, marginLeft: 15 },
  headerSubtitle: { fontSize: 14, color: theme.textSecondary, marginLeft: 15, marginTop: 2 },
  
  content: { flexGrow: 1, paddingHorizontal: 15, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: "bold", color: theme.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 15, marginTop: 15, marginLeft: 5 },
  
  macroCard: { backgroundColor: theme.cardBackground, borderRadius: 12, padding: 18, marginBottom: 15, flexDirection: "row", alignItems: "center", borderLeftWidth: 4, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.02)" : theme.lightGray, elevation: isDark ? 0 : 2 },
  iconWrapper: { width: 50, height: 50, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 15 },
  cardTextWrapper: { flex: 1, paddingRight: 10 },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: theme.textPrimary, marginBottom: 4 },
  cardDescription: { fontSize: 13, color: theme.textSecondary, lineHeight: 18 },

  sectorCard: { backgroundColor: theme.cardBackground, padding: 20, marginBottom: 12, borderRadius: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.03)" : theme.lightGray, elevation: isDark ? 0 : 2 },
  sectorCardDisabled: { backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", elevation: 0, borderColor: theme.lightGray },
  sectorText: { fontSize: 15, fontWeight: "600", color: theme.textPrimary, flexShrink: 1 },
  sectorTextDisabled: { color: theme.textSecondary, textDecorationLine: "line-through" },
  completedBadge: { fontSize: 10, color: theme.success, fontWeight: "bold", marginLeft: 8 },

  modalOverlay: { flex: 1, backgroundColor: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: theme.cardBackground, borderRadius: 24, padding: 25, maxHeight: "85%", borderWidth: 1, borderColor: theme.lightGray },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10, textAlign: "center", color: theme.textPrimary },
  
  subOptionButton: { paddingVertical: 18, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: theme.lightGray, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  subOptionDisabled: { opacity: 0.5 },
  subOptionText: { fontSize: 15, fontWeight: "500", color: theme.textPrimary },
  subOptionTextDisabled: { color: theme.textSecondary, textDecorationLine: "line-through" },
  
  cancelButton: { marginTop: 15, backgroundColor: "transparent", paddingVertical: 15, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: theme.lightGray },
  cancelButtonText: { color: theme.textSecondary, fontWeight: "bold", fontSize: 14 },
});