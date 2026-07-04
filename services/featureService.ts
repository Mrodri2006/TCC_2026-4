import { firestore } from "../firebase";

export type PlatformFeatures = {
  premiumPlans: boolean;
  sponsoredProviders: boolean;
  coupons: boolean;
  cashback: boolean;
  loyalty: boolean;
  aiDescription: boolean;
  aiBudget: boolean;
  aiRecommendations: boolean;
  aiModeration: boolean;
};
export const DEFAULT_FEATURES: PlatformFeatures = { premiumPlans: false, sponsoredProviders: false, coupons: false, cashback: false, loyalty: false, aiDescription: false, aiBudget: false, aiRecommendations: false, aiModeration: false };
export async function getPlatformFeatures(): Promise<PlatformFeatures> {
  const snapshot = await firestore.collection("PublicConfig").doc("features").get();
  return { ...DEFAULT_FEATURES, ...(snapshot.data() || {}) };
}
