import * as Location from "expo-location";
import firebase from "firebase/compat/app";
import { auth, firestore } from "../firebase";

export const LOCATION_VISIBILITY_MS = 2 * 60 * 60 * 1000;

export type ProviderPresence = {
  id: string;
  prestadorId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  updatedAt?: firebase.firestore.Timestamp;
  expiresAt?: firebase.firestore.Timestamp;
};

const roundApproximateCoordinate = (value: number) => Math.round(value * 1000) / 1000;

export async function activateLocationPresence() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("auth-required");

  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) {
    throw new Error("location-permission-denied");
  }

  const userSnapshot = await firestore.collection("Usuario").doc(uid).get();
  const user = userSnapshot.data();
  if (user?.tipo !== "prestador" || user?.contaAtiva !== true || user?.assinaturaAtiva === false) {
    throw new Error("provider-inactive");
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const now = Date.now();

  await firestore.collection("LocalizacoesPrestadores").doc(uid).set({
    prestadorId: uid,
    latitude: roundApproximateCoordinate(position.coords.latitude),
    longitude: roundApproximateCoordinate(position.coords.longitude),
    accuracy: Math.round(position.coords.accuracy || 0),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    expiresAt: firebase.firestore.Timestamp.fromMillis(now + LOCATION_VISIBILITY_MS),
  });
}

export async function deactivateLocationPresence() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("auth-required");
  await firestore.collection("LocalizacoesPrestadores").doc(uid).delete();
}

export function presenceIsActive(expiresAt?: firebase.firestore.Timestamp) {
  return Boolean(expiresAt && expiresAt.toMillis() > Date.now());
}

export function distanceInKm(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
) {
  const radius = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(destination.latitude - origin.latitude);
  const deltaLon = toRadians(destination.longitude - origin.longitude);
  const lat1 = toRadians(origin.latitude);
  const lat2 = toRadians(destination.latitude);
  const value =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
