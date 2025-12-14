import { DailyReport } from "../types";

const BASE_URL = "https://api.jsonbin.io/v3/b";

export const fetchFromCloud = async (binId: string, apiKey: string): Promise<DailyReport[]> => {
  try {
    const response = await fetch(`${BASE_URL}/${binId}/latest`, {
      method: "GET",
      headers: {
        "X-Master-Key": apiKey,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Cloud Error: ${response.statusText}`);
    }

    const data = await response.json();
    // JSONBin v3 wraps the actual data in a 'record' property
    return Array.isArray(data.record) ? data.record : [];
  } catch (error) {
    console.error("Failed to fetch from cloud", error);
    throw error;
  }
};

export const saveToCloud = async (binId: string, apiKey: string, reports: DailyReport[]): Promise<void> => {
  try {
    const response = await fetch(`${BASE_URL}/${binId}`, {
      method: "PUT",
      headers: {
        "X-Master-Key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(reports)
    });

    if (!response.ok) {
      throw new Error(`Cloud Save Error: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Failed to save to cloud", error);
    throw error;
  }
};