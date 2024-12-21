export interface ObservedValue {
  id: number;
  createdAt: string;
  sensorTypeId: number;
  value: number;
}

export interface SensorType {
  id: number;
  createdAt: string;
  name: 'voltage' | 'frequency';
  unit: string;
}
