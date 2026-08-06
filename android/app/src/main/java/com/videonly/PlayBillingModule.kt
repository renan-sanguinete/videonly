package com.videonly

import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap

class PlayBillingModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), PurchasesUpdatedListener {

  private val proProductId = BuildConfig.VIDEONLY_PRO_PRODUCT_ID
  private var cachedProductDetails: ProductDetails? = null
  private var purchasePromise: Promise? = null
  private val billingClient: BillingClient =
    BillingClient.newBuilder(reactContext)
      .setListener(this)
      .enablePendingPurchases(
        PendingPurchasesParams.newBuilder().enableOneTimeProducts().build(),
      )
      .enableAutoServiceReconnection()
      .build()

  override fun getName(): String = "PlayBillingModule"

  override fun getConstants(): MutableMap<String, Any> =
    mutableMapOf("proProductId" to proProductId)

  @ReactMethod
  fun getProProductDetails(promise: Promise) {
    withReadyClient(promise) {
      queryProductDetails(
        onSuccess = { productDetails ->
          promise.resolve(productDetailsToMap(productDetails))
        },
        onUnavailable = { message ->
          promise.reject("product_unavailable", message)
        },
      )
    }
  }

  @ReactMethod
  fun purchaseProUnlock(promise: Promise) {
    val activity = reactContext.currentActivity
    if (activity == null) {
      promise.reject("activity_unavailable", "Billing activity is unavailable.")
      return
    }

    withReadyClient(promise) {
      queryProductDetails(
        onSuccess = { productDetails ->
          val productParamsBuilder =
            BillingFlowParams.ProductDetailsParams.newBuilder()
              .setProductDetails(productDetails)

          productDetails.oneTimePurchaseOfferDetailsList
            ?.firstOrNull()
            ?.offerToken
            ?.takeIf { it.isNotBlank() }
            ?.let { productParamsBuilder.setOfferToken(it) }

          val billingFlowParams =
            BillingFlowParams.newBuilder()
              .setProductDetailsParamsList(listOf(productParamsBuilder.build()))
              .build()
          val billingResult = billingClient.launchBillingFlow(activity, billingFlowParams)

          if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
            purchasePromise = promise
          } else {
            promise.reject(
              "purchase_unavailable",
              billingResult.debugMessage.ifBlank { "Could not start purchase flow." },
            )
          }
        },
        onUnavailable = { message ->
          promise.reject("product_unavailable", message)
        },
      )
    }
  }

  @ReactMethod
  fun restoreProUnlock(promise: Promise) {
    queryProPurchase(promise)
  }

  override fun onPurchasesUpdated(billingResult: BillingResult, purchases: MutableList<Purchase>?) {
    val pendingPromise = purchasePromise
    purchasePromise = null

    when (billingResult.responseCode) {
      BillingClient.BillingResponseCode.OK -> {
        val result = processPurchases(purchases.orEmpty())
        pendingPromise?.resolve(result)
      }
      BillingClient.BillingResponseCode.USER_CANCELED -> {
        pendingPromise?.reject("purchase_cancelled", billingResult.debugMessage)
      }
      else -> {
        pendingPromise?.reject(
          "purchase_failed",
          billingResult.debugMessage.ifBlank { "Purchase failed." },
        )
      }
    }
  }

  private fun queryProPurchase(promise: Promise) {
    withReadyClient(promise) {
      val params =
        QueryPurchasesParams.newBuilder()
          .setProductType(BillingClient.ProductType.INAPP)
          .build()

      billingClient.queryPurchasesAsync(params) { billingResult, purchases ->
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
          promise.resolve(processPurchases(purchases))
        } else {
          promise.reject(
            "restore_failed",
            billingResult.debugMessage.ifBlank { "Could not restore purchases." },
          )
        }
      }
    }
  }

  private fun queryProductDetails(
    onSuccess: (ProductDetails) -> Unit,
    onUnavailable: (String) -> Unit,
  ) {
    cachedProductDetails?.let {
      onSuccess(it)
      return
    }

    val params =
      QueryProductDetailsParams.newBuilder()
        .setProductList(
          listOf(
            QueryProductDetailsParams.Product.newBuilder()
              .setProductId(proProductId)
              .setProductType(BillingClient.ProductType.INAPP)
              .build(),
          ),
        )
        .build()

    billingClient.queryProductDetailsAsync(params) { billingResult, queryResult ->
      if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
        onUnavailable(billingResult.debugMessage.ifBlank { "Product query failed." })
        return@queryProductDetailsAsync
      }

      val productDetails = queryResult.productDetailsList.firstOrNull()
      if (productDetails == null) {
        onUnavailable("Compra indisponível no momento.")
        return@queryProductDetailsAsync
      }

      cachedProductDetails = productDetails
      onSuccess(productDetails)
    }
  }

  private fun processPurchases(purchases: List<Purchase>): WritableMap {
    val result = WritableNativeMap()
    val proPurchase =
      purchases.firstOrNull { purchase ->
        purchase.products.contains(proProductId) &&
          purchase.purchaseState == Purchase.PurchaseState.PURCHASED
      }

    result.putBoolean("isPurchased", proPurchase != null)
    result.putString("productId", proProductId)

    if (proPurchase != null) {
      result.putString("purchaseToken", proPurchase.purchaseToken)
      acknowledgeIfNeeded(proPurchase)
    }

    return result
  }

  private fun acknowledgeIfNeeded(purchase: Purchase) {
    if (purchase.isAcknowledged) {
      return
    }

    val params =
      AcknowledgePurchaseParams.newBuilder()
        .setPurchaseToken(purchase.purchaseToken)
        .build()
    billingClient.acknowledgePurchase(params) {
      // Entitlement is already granted locally after PURCHASED. This only confirms delivery.
    }
  }

  private fun productDetailsToMap(productDetails: ProductDetails): WritableMap {
    val offer = productDetails.oneTimePurchaseOfferDetailsList?.firstOrNull()
    val map = WritableNativeMap()

    map.putString("productId", productDetails.productId)
    map.putString("title", productDetails.title)
    map.putString("description", productDetails.description)
    map.putString("price", offer?.formattedPrice ?: "")
    map.putString("currencyCode", offer?.priceCurrencyCode ?: "")
    map.putDouble("priceAmountMicros", offer?.priceAmountMicros?.toDouble() ?: 0.0)

    return map
  }

  private fun withReadyClient(promise: Promise, action: () -> Unit) {
    if (billingClient.isReady) {
      action()
      return
    }

    billingClient.startConnection(
      object : BillingClientStateListener {
        override fun onBillingSetupFinished(billingResult: BillingResult) {
          if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
            action()
          } else {
            promise.reject(
              "billing_unavailable",
              billingResult.debugMessage.ifBlank { "Google Play Billing is unavailable." },
            )
          }
        }

        override fun onBillingServiceDisconnected() {
          // Automatic service reconnection is enabled on the BillingClient.
        }
      },
    )
  }
}
