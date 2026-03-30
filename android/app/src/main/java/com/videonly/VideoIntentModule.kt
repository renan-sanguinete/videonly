package com.videonly

import android.content.ClipData
import android.content.Intent
import android.net.Uri
import android.content.ActivityNotFoundException
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class VideoIntentModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "VideoIntentModule"

  @ReactMethod
  fun openVideo(uriString: String, promise: Promise) {
    try {
      val uri = Uri.parse(uriString)
      val mimeType = reactApplicationContext.contentResolver.getType(uri) ?: "video/*"
      val intent =
        Intent(Intent.ACTION_VIEW).apply {
          setDataAndType(uri, mimeType)
          clipData = ClipData.newRawUri("video", uri)
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

      val chooser =
        Intent.createChooser(intent, "Abrir vídeo").apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }

      reactApplicationContext.startActivity(chooser)
      promise.resolve(null)
    } catch (error: ActivityNotFoundException) {
      promise.reject("no_activity", "Nenhum aplicativo disponível para abrir este vídeo.", error)
    } catch (error: Throwable) {
      promise.reject("open_failed", error.message, error)
    }
  }

  @ReactMethod
  fun shareVideo(uriString: String, title: String?, promise: Promise) {
    try {
      val uri = Uri.parse(uriString)
      val shareIntent =
        Intent(Intent.ACTION_SEND).apply {
          type = "video/*"
          putExtra(Intent.EXTRA_STREAM, uri)
          putExtra(Intent.EXTRA_SUBJECT, title ?: "Video")
          clipData = ClipData.newRawUri(title ?: "Video", uri)
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }

      val chooser =
        Intent.createChooser(shareIntent, title ?: "Compartilhar vídeo").apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

      reactApplicationContext.startActivity(chooser)
      promise.resolve(null)
    } catch (error: Throwable) {
      promise.reject("share_failed", error.message, error)
    }
  }
}
