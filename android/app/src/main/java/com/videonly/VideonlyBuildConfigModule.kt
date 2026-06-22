package com.videonly

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule

class VideonlyBuildConfigModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "VideonlyBuildConfig"

  override fun getConstants(): MutableMap<String, Any> =
    mutableMapOf(
      "buildChannel" to BuildConfig.VIDEONLY_BUILD_CHANNEL,
      "isDebugBuild" to BuildConfig.DEBUG,
      "isProBuild" to BuildConfig.VIDEONLY_PRO_BUILD,
      "allowsProTesting" to BuildConfig.VIDEONLY_ALLOW_PRO_TESTING,
      "proProductId" to BuildConfig.VIDEONLY_PRO_PRODUCT_ID,
    )
}
