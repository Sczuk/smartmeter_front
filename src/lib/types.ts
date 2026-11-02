export type DeviceType = "OUTLET" | "SWITCH";
export type SmartmeterSummary = { id: string; name: string; macAddress: string; amountConnectedDevices: number };
export type SmartmeterList = { name: string; smartmeters: SmartmeterSummary[] };
export type Device = { id: string; deviceName: string; type: DeviceType; channels: number[]; smartmeterName: string };
export type SmartmeterDetail = { id: string; name: string; macAddress: string; userName: string; devices: Device[] };
export type Measurement = {
  deviceId: string; smartmeterId: string; voltageV: number; currentA: number; powerW: number; state: string; measured: string;
};
export type PowerPoint = { at: string; powerW: number };
export type DailyPoint = { date: string; kwh: number };
