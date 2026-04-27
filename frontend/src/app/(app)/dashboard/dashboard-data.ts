export type BackendSensor = {
  id: string;
  trapId: string;
  floorLabel: string | null;
  zone: string | null;
  status: "ARMED" | "TRIGGERED" | "LOW_BATTERY" | "OFFLINE";
  lastActivityAt: string | null;
  batteryPct: number | null;
  signalLevel: number | null;
  createdAt: string;
  updatedAt: string;
};

export type BackendEvent = {
  id: string;
  createdAt: string;
  type: string;
  severity: "INFO" | "WARN" | "CRITICAL";
  title: string;
  detail: string | null;
  sensorId: string | null;
};

export function mapBackendSeverity(severity: BackendEvent["severity"]): string {
  switch (severity) {
    case "CRITICAL":
      return "critical";
    case "WARN":
      return "warning";
    case "INFO":
    default:
      return "info";
  }
}

export function mapBackendSensorStatus(status: BackendSensor["status"]): string {
  switch (status) {
    case "LOW_BATTERY":
      return "low_battery";
    default:
      return status.toLowerCase();
  }
}
