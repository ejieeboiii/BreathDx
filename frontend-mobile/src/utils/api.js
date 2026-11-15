import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from './apiBaseUrl';

export const API_BASE_URL = getApiBaseUrl();

const toWsBase = (httpBase) => {
  if (httpBase.startsWith('https://')) return httpBase.replace('https://', 'wss://');
  if (httpBase.startsWith('http://')) return httpBase.replace('http://', 'ws://');
  return `ws://${httpBase}`;
};

const API = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
});

API.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Healthcare Provider auth
export const registerDoctor = (data) => API.post('/auth/medical/register', data);
export const loginDoctor = (data) => API.post('/auth/medical/login', data);
export const getMe = () => API.get('/auth/medical/me');

// Patient auth
export const loginPatient = (data) => API.post('/auth/patient/login', data);
export const getPatientMe = () => API.get('/auth/patient/me');

// Patients
export const getPatients = () => API.get('/patients/');
export const addPatient = (data) => API.post('/patients/', data);
export const deletePatient = (id) => API.delete(`/patients/${id}`);
export const resetPatientPassword = (id, data = {}) => API.post(`/patients/${id}/reset-password`, data);

// Readings
export const getAllReadings = () => API.get('/readings/all');
export const getPatientReadings = (id) => API.get(`/readings/patient/${id}`);
export const getLatestReading = (id) => API.get(`/readings/patient/${id}/latest`);
export const sendSensorData = (data) => API.post('/readings/sensor', data);
export const deleteReading = (id) => API.delete(`/readings/${id}`);

// Readings (patient)
export const getMyReadings = () => API.get('/readings/my');
export const getMyLatestReading = () => API.get('/readings/my/latest');

export const getReadingsWebSocketUrl = async ({ patientId }) => {
  const token = await AsyncStorage.getItem('token');
  const params = new URLSearchParams();
  params.set('token', token || '');
  if (patientId) params.set('patient_id', String(patientId));
  return `${toWsBase(getApiBaseUrl())}/readings/ws/medical?${params.toString()}`;
};
