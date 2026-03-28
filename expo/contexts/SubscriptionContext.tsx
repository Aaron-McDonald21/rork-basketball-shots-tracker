import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { Alert, Platform } from "react-native";
import Purchases, { CustomerInfo, PurchasesPackage, PurchasesOffering } from "react-native-purchases";

const API_KEYS = {
  ios: "appl_wqDpYnZyXMUMXHhhqIOsKoPvWRr",
  android: "appl_wqDpYnZyXMUMXHhhqIOsKoPvWRr",
};

const ENTITLEMENT_ID = "pro"; // Replace with your entitlement ID from RevenueCat
const SUBSCRIPTION_STORAGE_KEY = "user_subscription_status";

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const [isPro, setIsPro] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  
  const queryClient = useQueryClient();

  // Fallback / Cache for offline or web
  const subscriptionQuery = useQuery({
    queryKey: ["subscription-status"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      return stored === "true";
    },
    staleTime: Infinity,
    enabled: Platform.OS === 'web', // Only rely on this for web primarily, or as init state
  });

  const saveMutation = useMutation({
    mutationFn: async (status: boolean) => {
      await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, String(status));
      return status;
    },
    onSuccess: (status) => {
      // setIsPro(status); // handled by checkEntitlement for mobile
      if (Platform.OS === 'web') setIsPro(status);
      queryClient.setQueryData(["subscription-status"], status);
    },
  });

  const { mutate: saveToStorage } = saveMutation;

  const checkEntitlement = useCallback((info: CustomerInfo) => {
    if (typeof info.entitlements.active[ENTITLEMENT_ID] !== "undefined") {
      setIsPro(true);
      saveToStorage(true);
    } else {
      setIsPro(false);
      saveToStorage(false);
    }
  }, [saveToStorage]);

  // Initialize RevenueCat
  useEffect(() => {
    const init = async () => {
      if (Platform.OS === 'web') {
        // Web support for RevenueCat is limited/different. 
        // For this project, we'll fallback to local storage for web dev.
        setIsInitialized(true);
        return;
      }

      try {
        Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);

        if (Platform.OS === 'ios') {
          await Purchases.configure({ apiKey: API_KEYS.ios });
        } else if (Platform.OS === 'android') {
          await Purchases.configure({ apiKey: API_KEYS.android });
        }

        // Get initial customer info
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
        checkEntitlement(info);

        // Fetch offerings
        const offerings = await Purchases.getOfferings();
        if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
          setCurrentOffering(offerings.current);
        }

        setIsInitialized(true);
      } catch (e) {
        console.error("RevenueCat initialization failed:", e);
        setIsInitialized(true); // Still mark as initialized to not block app
      }
    };

    init();
  }, [checkEntitlement]);

  // Listen for updates
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const customerInfoUpdated = async (info: CustomerInfo) => {
      setCustomerInfo(info);
      checkEntitlement(info);
    };

    Purchases.addCustomerInfoUpdateListener(customerInfoUpdated);

    // Cleanup not strictly necessary as this is a root provider, but good practice
    // RevenueCat SDK manages listeners internally usually, but we can't easily remove anonymous listener
  }, [checkEntitlement]);

  // Sync initial async storage state if RC hasn't loaded yet? 
  // Actually, we want RC to be source of truth.
  // But for web, we use subscriptionQuery.
  useEffect(() => {
    if (Platform.OS === 'web' && subscriptionQuery.data !== undefined) {
      setIsPro(subscriptionQuery.data);
    }
  }, [subscriptionQuery.data]);


  const buySubscription = useCallback(async (packageToPurchase?: PurchasesPackage) => {
    if (Platform.OS === 'web') {
      // Mock for web
      saveToStorage(true);
      alert("Success! You are now a Pro member (Web Mock).");
      return true;
    }

    try {
      // If no package provided, try to find monthly in current offering
      let pkg = packageToPurchase;
      if (!pkg && currentOffering) {
        pkg = currentOffering.monthly || currentOffering.availablePackages[0];
      }

      if (!pkg) {
        Alert.alert("Error", "No subscription packages available.");
        return false;
      }

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      
      if (typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined") {
        setIsPro(true);
        // Alert.alert("Success!", "You are now a Pro member.");
        return true;
      }
      return false;

    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert("Error", e.message);
      }
      return false;
    }
  }, [currentOffering, saveToStorage]);

  const restorePurchases = useCallback(async () => {
    if (Platform.OS === 'web') {
      const current = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      if (current === "true") {
        setIsPro(true);
        Alert.alert("Restore Successful", "Your Pro access has been restored.");
      } else {
        Alert.alert("No Purchases Found", "We couldn't find an active subscription.");
      }
      return;
    }

    try {
      const info = await Purchases.restorePurchases();
      if (typeof info.entitlements.active[ENTITLEMENT_ID] !== "undefined") {
        setIsPro(true);
        Alert.alert("Restore Successful", "Your Pro access has been restored.");
      } else {
        Alert.alert("No Purchases Found", "We couldn't find an active subscription for this account.");
        setIsPro(false);
      }
    } catch (e: any) {
       Alert.alert("Error", "Failed to restore purchases: " + e.message);
    }
  }, []);

  // Dev only: reset subscription
  const resetSubscription = useCallback(() => {
    saveToStorage(false);
    setIsPro(false);
    // Cannot reset RevenueCat entitlement from client easily without logging out
    if (Platform.OS !== 'web') {
       // Purchases.logOut(); 
       // This would reset anonymous ID, effectively resetting subscription for this device instance if not signed in.
    }
  }, [saveToStorage]);

  return {
    isPro,
    isLoading: !isInitialized,
    isInitialized,
    customerInfo,
    currentOffering,
    buySubscription,
    restorePurchases,
    resetSubscription
  };
});
