package com.videonly

import android.media.MediaMetadataRetriever
import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
import androidx.media3.transformer.Composition
import androidx.media3.transformer.DefaultEncoderFactory
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.Transformer
import androidx.media3.transformer.VideoEncoderSettings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.util.UUID

@OptIn(UnstableApi::class)
class VideoCompressionModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var activeTransformer: Transformer? = null
  private var activePromise: Promise? = null

  override fun getName(): String = "VideoCompressionModule"

  @ReactMethod
  fun compressVideo(inputPath: String, promise: Promise) {
    if (activePromise != null) {
      promise.reject("compression_in_progress", "Já existe uma compressão em andamento.")
      return
    }

    val inputUri = toUri(inputPath)
    val outputFile = createOutputFile()
    val targetBitrate = resolveTargetBitrate(inputUri)

    activePromise = promise

    try {
      val encoderSettings =
        VideoEncoderSettings.Builder()
          .setBitrate(targetBitrate)
          .build()

      val transformer =
        Transformer.Builder(reactApplicationContext)
          .setVideoMimeType(MimeTypes.VIDEO_H264)
          .setAudioMimeType(MimeTypes.AUDIO_AAC)
          .setEncoderFactory(
            DefaultEncoderFactory.Builder(reactApplicationContext)
              .setRequestedVideoEncoderSettings(encoderSettings)
              .build(),
          )
          .addListener(
            object : Transformer.Listener {
              override fun onCompleted(composition: Composition, exportResult: ExportResult) {
                activeTransformer = null
                activePromise?.resolve(outputFile.absolutePath)
                activePromise = null
              }

              override fun onError(
                composition: Composition,
                exportResult: ExportResult,
                exportException: ExportException,
              ) {
                outputFile.delete()
                activeTransformer = null
                activePromise?.reject(
                  "compression_failed",
                  exportException.message ?: "Falha ao comprimir o vídeo.",
                  exportException,
                )
                activePromise = null
              }
            },
          )
          .build()

      activeTransformer = transformer
      transformer.start(MediaItem.fromUri(inputUri), outputFile.absolutePath)
    } catch (error: Throwable) {
      outputFile.delete()
      activeTransformer = null
      activePromise = null
      promise.reject("compression_setup_failed", error.message, error)
    }
  }

  private fun createOutputFile(): File {
    val outputDir = File(reactApplicationContext.cacheDir, "compressed-videos")
    if (!outputDir.exists()) {
      outputDir.mkdirs()
    }

    return File(outputDir, "videonly-compressed-${UUID.randomUUID()}.mp4")
  }

  private fun toUri(pathLike: String): Uri {
    val parsedUri = Uri.parse(pathLike)
    if (!parsedUri.scheme.isNullOrBlank()) {
      return parsedUri
    }

    return Uri.fromFile(File(pathLike))
  }

  private fun resolveTargetBitrate(inputUri: Uri): Int {
    val retriever = MediaMetadataRetriever()

    return try {
      retriever.setDataSource(reactApplicationContext, inputUri)

      val sourceBitrate =
        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_BITRATE)?.toIntOrNull()
      val width =
        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toIntOrNull()
      val height =
        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toIntOrNull()

      val resolutionCap =
        when (maxOf(width ?: 0, height ?: 0)) {
          in 2160..Int.MAX_VALUE -> 8_000_000
          in 1440..2159 -> 6_000_000
          in 1080..1439 -> 4_500_000
          in 720..1079 -> 3_000_000
          else -> 1_800_000
        }

      if (sourceBitrate == null || sourceBitrate <= 0) {
        resolutionCap
      } else if (sourceBitrate <= 900_000) {
        (sourceBitrate * 0.9f).toInt()
      } else {
        minOf((sourceBitrate * 0.72f).toInt(), resolutionCap)
      }
    } catch (_: Throwable) {
      3_000_000
    } finally {
      retriever.release()
    }
  }
}
