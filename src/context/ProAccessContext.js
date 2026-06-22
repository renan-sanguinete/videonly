import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {buildConfig} from '../config/buildConfig';
import {
  getProProductDetails,
  isPlayBillingAvailable,
  purchaseProUnlock,
  restoreProUnlock,
} from '../services/playBilling';

const ProAccessContext = createContext(null);

const PRO_PURCHASE_STORAGE_KEY = '@videonly/pro-purchase-unlocked';
const PRO_DEBUG_OVERRIDE_STORAGE_KEY = '@videonly/pro-debug-override';

function parseStoredBoolean(value) {
  return value === 'true';
}

export function ProAccessProvider({children}) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);
  const [debugProOverride, setDebugProOverrideState] = useState(false);
  const [productDetails, setProductDetails] = useState(null);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState(null);
  const canUseDebugOverride = buildConfig.allowsProTesting;
  const isPro =
    buildConfig.isProBuild ||
    isPurchased ||
    (canUseDebugOverride && debugProOverride);

  const persistPurchased = useCallback(async nextValue => {
    setIsPurchased(nextValue);
    await AsyncStorage.setItem(
      PRO_PURCHASE_STORAGE_KEY,
      nextValue ? 'true' : 'false',
    );
  }, []);

  const setDebugProOverride = useCallback(
    async nextValue => {
      if (!canUseDebugOverride) {
        return;
      }

      setDebugProOverrideState(nextValue);
      await AsyncStorage.setItem(
        PRO_DEBUG_OVERRIDE_STORAGE_KEY,
        nextValue ? 'true' : 'false',
      );
    },
    [canUseDebugOverride],
  );

  const refreshProductDetails = useCallback(async () => {
    if (!isPlayBillingAvailable() || buildConfig.isProBuild) {
      return null;
    }

    try {
      const details = await getProProductDetails();
      setProductDetails(details);
      setBillingError(null);
      return details;
    } catch (error) {
      setBillingError(error?.message ?? 'Billing unavailable');
      return null;
    }
  }, []);

  const restorePurchase = useCallback(async () => {
    if (buildConfig.isProBuild) {
      await persistPurchased(true);
      return true;
    }

    if (!isPlayBillingAvailable()) {
      setBillingError('Google Play Billing is not available.');
      return false;
    }

    setIsBillingLoading(true);
    try {
      const result = await restoreProUnlock();
      const restored = Boolean(result?.isPurchased);
      await persistPurchased(restored);
      setBillingError(null);
      return restored;
    } catch (error) {
      setBillingError(error?.message ?? 'Could not restore purchase.');
      return false;
    } finally {
      setIsBillingLoading(false);
    }
  }, [persistPurchased]);

  const purchasePro = useCallback(async () => {
    if (isPro) {
      return true;
    }

    if (!isPlayBillingAvailable()) {
      setBillingError('Google Play Billing is not available.');
      return false;
    }

    setIsBillingLoading(true);
    try {
      const result = await purchaseProUnlock();
      const purchased = Boolean(result?.isPurchased);
      if (purchased) {
        await persistPurchased(true);
      }
      setBillingError(null);
      return purchased;
    } catch (error) {
      setBillingError(error?.message ?? 'Could not complete purchase.');
      return false;
    } finally {
      setIsBillingLoading(false);
    }
  }, [isPro, persistPurchased]);

  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      try {
        const [storedPurchase, storedOverride] = await Promise.all([
          AsyncStorage.getItem(PRO_PURCHASE_STORAGE_KEY),
          AsyncStorage.getItem(PRO_DEBUG_OVERRIDE_STORAGE_KEY),
        ]);

        if (!isMounted) {
          return;
        }

        setIsPurchased(
          buildConfig.isProBuild || parseStoredBoolean(storedPurchase),
        );
        setDebugProOverrideState(
          canUseDebugOverride && parseStoredBoolean(storedOverride),
        );
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    }

    hydrate();

    return () => {
      isMounted = false;
    };
  }, [canUseDebugOverride]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    refreshProductDetails();
    restorePurchase();
  }, [isHydrated, refreshProductDetails, restorePurchase]);

  const value = useMemo(
    () => ({
      billingError,
      buildChannel: buildConfig.buildChannel,
      canUseDebugOverride,
      debugProOverride,
      isBillingAvailable: isPlayBillingAvailable(),
      isBillingLoading,
      isHydrated,
      isPro,
      isProBuild: buildConfig.isProBuild,
      isPurchased,
      productDetails,
      purchasePro,
      refreshProductDetails,
      restorePurchase,
      setDebugProOverride,
    }),
    [
      billingError,
      canUseDebugOverride,
      debugProOverride,
      isBillingLoading,
      isHydrated,
      isPro,
      isPurchased,
      productDetails,
      purchasePro,
      refreshProductDetails,
      restorePurchase,
      setDebugProOverride,
    ],
  );

  return (
    <ProAccessContext.Provider value={value}>
      {children}
    </ProAccessContext.Provider>
  );
}

export function useProAccess() {
  const context = useContext(ProAccessContext);

  if (!context) {
    throw new Error('useProAccess must be used within ProAccessProvider');
  }

  return context;
}
