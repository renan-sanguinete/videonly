package com.videonly

import android.media.MediaMetadataRetriever
import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.util.UnstableApi
import androidx.media3.transformer.Composition
import androidx.media3.transformer.DefaultEncoderFactory
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.Effects
import androidx.media3.transformer.Transformer
import androidx.media3.transformer.VideoEncoderSettings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import kotlin.math.pow

@OptIn(UnstableApi::class)
class VideoCompressionModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var activeTransformer: Transformer? = null
  private var activePromise: Promise? = null

  override fun getName(): String = "VideoCompressionModule"

  @ReactMethod
  fun optimizeVideo(
    inputPath: String,
    extension: String,
    options: ReadableMap?,
    promise: Promise,
  ) {
    if (activePromise != null) {
      promise.reject("compression_in_progress", "Já existe uma compressão em andamento.")
      return
    }

    val inputUri = toUri(inputPath)
    val outputFile = createOutputFile(extension)
    val optimizationMode = resolveOptimizationMode(options)
    val shouldCompressVideo =
      optimizationMode == "video" || optimizationMode == "both"
    val shouldCleanupAudio =
      optimizationMode == "audio" || optimizationMode == "both"
    val shouldNormalizeLoudness =
      shouldCleanupAudio && (options?.getBoolean("normalizeAudioLoudness") ?: false)
    val limiterPreset = resolveLimiterPreset(options)

    activePromise = promise

    try {
      val inputMediaItem = MediaItem.fromUri(inputUri)
      val loudnessAnalysis =
        if (shouldNormalizeLoudness) {
          AudioLoudnessAnalyzer.analyze(reactApplicationContext, inputUri)
        } else {
          null
        }
      val editedMediaItem =
        if (shouldCleanupAudio) {
          val audioProcessors = mutableListOf<AudioProcessor>(
            HighPassAudioProcessor(),
          )

          loudnessAnalysis?.let { analysis ->
            val gainLinear = 10f.pow(analysis.suggestedGainDb / 20f)
            if (gainLinear != 1f) {
              audioProcessors.add(GainAudioProcessor(gainLinear))
            }
          }

          audioProcessors.add(
            HardLimiterAudioProcessor(resolveLimiterThreshold(limiterPreset)),
          )

          val audioEffects =
            Effects(
              audioProcessors,
              emptyList(),
            )

          EditedMediaItem.Builder(inputMediaItem).setEffects(audioEffects).build()
        } else {
          null
        }

      val transformerBuilder =
        Transformer.Builder(reactApplicationContext)
          .setVideoMimeType(MimeTypes.VIDEO_H264)
          .setAudioMimeType(MimeTypes.AUDIO_AAC)

      if (shouldCompressVideo) {
        val targetBitrate = resolveTargetBitrate(inputUri)
        val encoderSettings =
          VideoEncoderSettings.Builder()
            .setBitrate(targetBitrate)
            .build()

        transformerBuilder.setEncoderFactory(
          DefaultEncoderFactory.Builder(reactApplicationContext)
            .setRequestedVideoEncoderSettings(encoderSettings)
            .build(),
        )
      }

      val transformer =
        transformerBuilder
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
                  exportException.message ?: "Falha ao otimizar o vídeo.",
                  exportException,
                )
                activePromise = null
              }
            },
          )
          .build()

      activeTransformer = transformer
      if (editedMediaItem != null) {
        transformer.start(editedMediaItem, outputFile.absolutePath)
      } else {
        transformer.start(inputMediaItem, outputFile.absolutePath)
      }
    } catch (error: Throwable) {
      outputFile.delete()
      activeTransformer = null
      activePromise = null
      promise.reject("compression_setup_failed", error.message, error)
    }
  }

  @ReactMethod
  fun compressVideo(
    inputPath: String,
    extension: String,
    options: ReadableMap?,
    promise: Promise,
  ) {
    optimizeVideo(inputPath, extension, options, promise)
  }

  private fun createOutputFile(extension: String): File {
    val outputDir = File(reactApplicationContext.cacheDir, "compressed-videos")
    if (!outputDir.exists()) {
      outputDir.mkdirs()
    }

    val formatter = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss")
    val timestamp = LocalDateTime.now().format(formatter)

    val safeExtension = extension.lowercase()

    return File(outputDir, "videonly-compressed-$timestamp.$safeExtension")
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

  private fun resolveOptimizationMode(options: ReadableMap?): String {
    val mode = options?.getString("optimizationMode")?.lowercase()

    if (mode == "none" || mode == "video" || mode == "audio" || mode == "both") {
      return mode
    }

    val cleanupEnabled = options?.getBoolean("audioCleanupEnabled") ?: false

    return if (cleanupEnabled) "both" else "video"
  }

  private fun resolveLimiterPreset(options: ReadableMap?): String {
    val preset = options?.getString("audioLimiterPreset")?.lowercase()

    return when (preset) {
      "gentle", "strong", "standard" -> preset
      else -> "standard"
    }
  }

  private fun resolveLimiterThreshold(preset: String): Float {
    return when (preset) {
      "gentle" -> 0.95f
      "strong" -> 0.8f
      else -> 0.9f
    }
  }
}
