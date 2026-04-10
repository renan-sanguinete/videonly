package com.videonly

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class MediaManagementModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "MediaManagementModule"

  @ReactMethod
  fun canManageMedia(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      promise.resolve(false)
      return
    }

    promise.resolve(MediaStore.canManageMedia(reactApplicationContext))
  }

  @ReactMethod
  fun openManageMediaSettings(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      promise.resolve(false)
      return
    }

    try {
      val intent =
        Intent(Settings.ACTION_REQUEST_MANAGE_MEDIA).apply {
          data = Uri.parse("package:${reactApplicationContext.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

      reactApplicationContext.startActivity(intent)
      promise.resolve(true)
    } catch (error: Throwable) {
      promise.reject("open_manage_media_failed", error.message, error)
    }
  }
}
