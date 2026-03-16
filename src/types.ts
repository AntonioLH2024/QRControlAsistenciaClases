export interface ClassSession {
  id?: string;
  classId?: string;
  name: string;
  createdAt?: string;
  expiresAt: number;
  token: string;
  sheetId?: string;
  googleError?: string | null;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface AttendanceRecord {
  name: string;
  surname: string;
  dni: string;
  timestamp: string;
  ip?: string;
  device?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface CheckinData {
  classId: string;
  token: string;
  name: string;
  surname: string;
  dni: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}
