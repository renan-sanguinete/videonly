package com.videonly

import android.media.AudioFormat
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.net.Uri
import androidx.media3.common.C
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.audio.BaseAudioProcessor
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.abs
import kotlin.math.log10
import kotlin.math.roundToInt
import kotlin.math.sqrt

data class AudioLoudnessAnalysis(
  val peakDb: Float,
  val rmsDb: Float,
  val suggestedGainDb: Float,
)

private fun isSupportedPcmEncoding(encoding: Int): Boolean {
  return encoding == C.ENCODING_PCM_16BIT || encoding == C.ENCODING_PCM_FLOAT
}

private fun clampToShort(value: Float): Short {
  val scaled = (value * Short.MAX_VALUE.toFloat()).roundToInt()
  return scaled.coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
}

class GainAudioProcessor(
  private val gainLinear: Float,
) : BaseAudioProcessor() {
  private var encoding = C.ENCODING_INVALID

  override fun onConfigure(
    inputAudioFormat: AudioProcessor.AudioFormat,
  ): AudioProcessor.AudioFormat {
    if (!isSupportedPcmEncoding(inputAudioFormat.encoding)) {
      throw AudioProcessor.UnhandledAudioFormatException(inputAudioFormat)
    }

    encoding = inputAudioFormat.encoding
    return inputAudioFormat
  }

  override fun onReset() {
    encoding = C.ENCODING_INVALID
  }

  override fun queueInput(inputBuffer: ByteBuffer) {
    if (!inputBuffer.hasRemaining()) {
      return
    }

    val outputBuffer = replaceOutputBuffer(inputBuffer.remaining())
    outputBuffer.order(ByteOrder.nativeOrder())

    when (encoding) {
      C.ENCODING_PCM_FLOAT -> {
        val inputFloats = inputBuffer.order(ByteOrder.nativeOrder()).asFloatBuffer()
        while (inputFloats.hasRemaining()) {
          outputBuffer.putFloat(inputFloats.get() * gainLinear)
        }
      }

      else -> {
        val inputShorts = inputBuffer.order(ByteOrder.nativeOrder()).asShortBuffer()
        while (inputShorts.hasRemaining()) {
          val normalized = inputShorts.get() / Short.MAX_VALUE.toFloat()
          outputBuffer.putShort(clampToShort(normalized * gainLinear))
        }
      }
    }

    outputBuffer.flip()
    inputBuffer.position(inputBuffer.limit())
  }
}

object AudioLoudnessAnalyzer {
  private const val TIMEOUT_US = 10_000L

  fun analyze(
    reactContext: android.content.Context,
    inputUri: Uri,
    targetRmsDb: Float = -18f,
    maxGainDb: Float = 8f,
  ): AudioLoudnessAnalysis? {
    val extractor = MediaExtractor()
    var decoder: MediaCodec? = null

    return try {
      extractor.setDataSource(reactContext, inputUri, emptyMap<String, String>())

      val trackIndex =
        (0 until extractor.trackCount).firstOrNull { index ->
          val mime = extractor.getTrackFormat(index).getString(MediaFormat.KEY_MIME)
          mime?.startsWith("audio/") == true
        } ?: return null

      val inputFormat = extractor.getTrackFormat(trackIndex)
      val mime = inputFormat.getString(MediaFormat.KEY_MIME) ?: return null

      extractor.selectTrack(trackIndex)
      decoder = MediaCodec.createDecoderByType(mime)
      decoder.configure(inputFormat, null, null, 0)
      decoder.start()

      val info = MediaCodec.BufferInfo()
      var inputDone = false
      var outputDone = false
      var outputEncoding = C.ENCODING_PCM_16BIT
      var peak = 0f
      var sumSquares = 0.0
      var sampleCount = 0L

      while (!outputDone) {
        if (!inputDone) {
          val inputIndex = decoder.dequeueInputBuffer(TIMEOUT_US)
          if (inputIndex >= 0) {
            val inputBuffer = decoder.getInputBuffer(inputIndex)
            if (inputBuffer == null) {
              decoder.queueInputBuffer(
                inputIndex,
                0,
                0,
                0L,
                MediaCodec.BUFFER_FLAG_END_OF_STREAM,
              )
              inputDone = true
            } else {
              inputBuffer.clear()
              val sampleSize = extractor.readSampleData(inputBuffer, 0)
              if (sampleSize < 0) {
                decoder.queueInputBuffer(
                  inputIndex,
                  0,
                  0,
                  0L,
                  MediaCodec.BUFFER_FLAG_END_OF_STREAM,
                )
                inputDone = true
              } else {
                decoder.queueInputBuffer(
                  inputIndex,
                  0,
                  sampleSize,
                  extractor.sampleTime,
                  0,
                )
                extractor.advance()
              }
            }
          }
        }

        when (val outputIndex = decoder.dequeueOutputBuffer(info, TIMEOUT_US)) {
          MediaCodec.INFO_TRY_AGAIN_LATER -> Unit
          MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
            outputEncoding =
              if (decoder.outputFormat.containsKey(MediaFormat.KEY_PCM_ENCODING)) {
                decoder.outputFormat.getInteger(MediaFormat.KEY_PCM_ENCODING)
              } else {
                AudioFormat.ENCODING_PCM_16BIT
              }
          }

          MediaCodec.INFO_OUTPUT_BUFFERS_CHANGED -> Unit

          else -> {
            if (outputIndex >= 0) {
              val outputBuffer = decoder.getOutputBuffer(outputIndex)
              if (outputBuffer != null && info.size > 0) {
                val sampleBuffer = outputBuffer.duplicate()
                sampleBuffer.position(info.offset)
                sampleBuffer.limit(info.offset + info.size)
                accumulateSamples(
                  sampleBuffer.slice().order(ByteOrder.nativeOrder()),
                  outputEncoding,
                  { normalized ->
                    if (normalized > peak) {
                      peak = normalized
                    }
                    sumSquares += normalized * normalized
                    sampleCount += 1
                  },
                )
              }

              decoder.releaseOutputBuffer(outputIndex, false)

              if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) {
                outputDone = true
              }
            }
          }
        }
      }

      if (sampleCount <= 0L) {
        return null
      }

      val rms = sqrt(sumSquares / sampleCount.toDouble()).toFloat()
      val peakDb = toDbFs(peak)
      val rmsDb = toDbFs(rms)
      val suggestedGainDb =
        (targetRmsDb - rmsDb).coerceIn(-maxGainDb, maxGainDb)

      AudioLoudnessAnalysis(
        peakDb = peakDb,
        rmsDb = rmsDb,
        suggestedGainDb = suggestedGainDb,
      )
    } catch (_: Throwable) {
      null
    } finally {
      try {
        decoder?.stop()
      } catch (_: Throwable) {
      }

      try {
        decoder?.release()
      } catch (_: Throwable) {
      }

      try {
        extractor.release()
      } catch (_: Throwable) {
      }
    }
  }

  private fun accumulateSamples(
    buffer: ByteBuffer,
    encoding: Int,
    onSample: (Float) -> Unit,
  ) {
    when (encoding) {
      AudioFormat.ENCODING_PCM_FLOAT -> {
        val floatBuffer = buffer.asFloatBuffer()
        while (floatBuffer.hasRemaining()) {
          onSample(abs(floatBuffer.get()).coerceIn(0f, 1f))
        }
      }

      else -> {
        val shortBuffer = buffer.asShortBuffer()
        while (shortBuffer.hasRemaining()) {
          onSample(
            (abs(shortBuffer.get().toFloat()) / Short.MAX_VALUE.toFloat()).coerceIn(0f, 1f),
          )
        }
      }
    }
  }

  private fun toDbFs(level: Float): Float {
    return if (level <= 0f) {
      -120f
    } else {
      (20f * log10(level)).coerceAtLeast(-120f)
    }
  }
}
