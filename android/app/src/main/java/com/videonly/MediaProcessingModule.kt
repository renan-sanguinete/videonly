package com.videonly

import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.media.MediaMuxer
import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.nio.ByteBuffer
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import kotlin.math.max

class MediaProcessingModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "MediaProcessingModule"

  @ReactMethod
  fun retimeVideo(
    inputPath: String,
    extension: String,
    speedFactor: Double,
    removeAudio: Boolean,
    promise: Promise,
  ) {
    if (!speedFactor.isFinite() || speedFactor <= 0.0) {
      promise.reject("invalid_speed_factor", "Fator de velocidade inválido.")
      return
    }

    Thread {
      try {
        val outputFile = createOutputFile(extension)
        remuxWithAdjustedTimestamps(inputPath, outputFile, speedFactor, removeAudio)
        promise.resolve(outputFile.absolutePath)
      } catch (error: Throwable) {
        promise.reject(
          "media_processing_failed",
          error.message ?: "Falha ao processar o vídeo.",
          error,
        )
      }
    }.start()
  }

  private fun remuxWithAdjustedTimestamps(
    inputPath: String,
    outputFile: File,
    speedFactor: Double,
    removeAudio: Boolean,
  ) {
    val extractor = MediaExtractor()
    var muxer: MediaMuxer? = null

    try {
      extractor.setDataSource(reactApplicationContext, toUri(inputPath), null)

      val selectedTracks = mutableMapOf<Int, Int>()
      var maxInputSize = 0

      muxer = MediaMuxer(
        outputFile.absolutePath,
        MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4,
      )

      readRotationDegrees(inputPath)?.let { rotation ->
        muxer.setOrientationHint(rotation)
      }

      for (trackIndex in 0 until extractor.trackCount) {
        val format = extractor.getTrackFormat(trackIndex)
        val mime = format.getString(MediaFormat.KEY_MIME) ?: continue
        val isVideoTrack = mime.startsWith("video/")
        val isAudioTrack = mime.startsWith("audio/")

        if (!isVideoTrack && (!isAudioTrack || removeAudio)) {
          continue
        }

        extractor.selectTrack(trackIndex)
        selectedTracks[trackIndex] = muxer.addTrack(format)

        if (format.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) {
          maxInputSize = max(maxInputSize, format.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE))
        }
      }

      if (selectedTracks.isEmpty()) {
        throw IllegalStateException("Nenhum track de mídia foi encontrado.")
      }

      val buffer = ByteBuffer.allocateDirect(max(maxInputSize, DEFAULT_BUFFER_SIZE))
      val bufferInfo = android.media.MediaCodec.BufferInfo()

      muxer.start()

      while (true) {
        val sampleTrackIndex = extractor.sampleTrackIndex

        if (sampleTrackIndex < 0) {
          break
        }

        val outputTrackIndex = selectedTracks[sampleTrackIndex]

        if (outputTrackIndex == null) {
          extractor.advance()
          continue
        }

        buffer.clear()
        val sampleSize = extractor.readSampleData(buffer, 0)

        if (sampleSize < 0) {
          break
        }

        val originalPresentationTimeUs = extractor.sampleTime
        bufferInfo.set(
          0,
          sampleSize,
          if (originalPresentationTimeUs < 0) {
            0
          } else {
            (originalPresentationTimeUs / speedFactor).toLong()
          },
          extractor.sampleFlags,
        )

        muxer.writeSampleData(outputTrackIndex, buffer, bufferInfo)
        extractor.advance()
      }
    } finally {
      try {
        muxer?.stop()
      } catch (_: Throwable) {
      }

      muxer?.release()
      extractor.release()
    }
  }

  private fun createOutputFile(extension: String): File {
    val outputDir = File(reactApplicationContext.cacheDir, "processed-videos")
    if (!outputDir.exists()) {
      outputDir.mkdirs()
    }

    val formatter = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss-SSS")
    val timestamp = LocalDateTime.now().format(formatter)
    val safeExtension = extension.lowercase().ifBlank { "mp4" }

    return File(outputDir, "videonly-effect-$timestamp.$safeExtension")
  }

  private fun toUri(pathLike: String): Uri {
    val parsedUri = Uri.parse(pathLike)
    if (!parsedUri.scheme.isNullOrBlank()) {
      return parsedUri
    }

    return Uri.fromFile(File(pathLike))
  }

  private fun readRotationDegrees(inputPath: String): Int? {
    val retriever = MediaMetadataRetriever()

    return try {
      retriever.setDataSource(reactApplicationContext, toUri(inputPath))
      retriever
        .extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)
        ?.toIntOrNull()
    } catch (_: Throwable) {
      null
    } finally {
      retriever.release()
    }
  }

  private companion object {
    const val DEFAULT_BUFFER_SIZE = 2 * 1024 * 1024
  }
}
