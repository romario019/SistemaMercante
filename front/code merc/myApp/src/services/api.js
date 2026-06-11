// Arquivo: src/services/api.js

const API_URL = "http://10.77.1.165:3000/api";

export const fetchConfig = async () => {
  try {
    const response = await fetch(`${API_URL}/config`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erro ao buscar configurações:", error);
    throw error;
  }
};

export const fetchReportHistory = async () => {
  try {
    const response = await fetch(`${API_URL}/historico`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erro ao buscar histórico da nuvem:", error);
    throw error;
  }
};

export const sendReport = async (reportData) => {
  try {
    const response = await fetch(`${API_URL}/enviar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reportData),
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Erro ao enviar relatório:", error);
    throw error;
  }
};