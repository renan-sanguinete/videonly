import {NativeModules} from 'react-native';

const billingModule = NativeModules.PlayBillingModule;

export const PRO_UNLOCK_PRODUCT_ID =
  billingModule?.proProductId ?? 'videonly_pro_unlock';

function ensureBillingModule() {
  if (!billingModule) {
    throw new Error('Google Play Billing is not available on this build.');
  }

  return billingModule;
}

export function isPlayBillingAvailable() {
  return Boolean(billingModule);
}

export async function getProProductDetails() {
  return ensureBillingModule().getProProductDetails();
}

export async function purchaseProUnlock() {
  return ensureBillingModule().purchaseProUnlock();
}

export async function restoreProUnlock() {
  return ensureBillingModule().restoreProUnlock();
}
