package com.videonly

import androidx.media3.common.C
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.audio.BaseAudioProcessor
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.PI
import kotlin.math.roundToInt

private fun isSupportedPcmEncoding(encoding: Int): Boolean {
  return encoding == C.ENCODING_PCM_16BIT || encoding == C.ENCODING_PCM_FLOAT
}

private fun clampToShort(value: Float): Short {
  val scaled = (value * Short.MAX_VALUE.toFloat()).roundToInt()
  return scaled.coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
}

class HighPassAudioProcessor(
  private val cutoffHz: Float = 80f,
) : BaseAudioProcessor() {
  private var previousInputSamples = FloatArray(0)
  private var previousOutputSamples = FloatArray(0)
  private var alpha = 0f
  private var channelCount = 0
  private var sampleRate = 0
  private var encoding = C.ENCODING_INVALID

  override fun onConfigure(
    inputAudioFormat: AudioProcessor.AudioFormat,
  ): AudioProcessor.AudioFormat {
    if (!isSupportedPcmEncoding(inputAudioFormat.encoding) ||
      inputAudioFormat.sampleRate <= 0 ||
      inputAudioFormat.channelCount <= 0
    ) {
      throw AudioProcessor.UnhandledAudioFormatException(inputAudioFormat)
    }

    encoding = inputAudioFormat.encoding
    return inputAudioFormat
  }

  override fun onFlush() {
    channelCount = outputAudioFormat.channelCount
    sampleRate = outputAudioFormat.sampleRate
    previousInputSamples = FloatArray(channelCount)
    previousOutputSamples = FloatArray(channelCount)
    val dt = 1f / sampleRate.toFloat()
    val rc = 1f / (2f * PI.toFloat() * cutoffHz)
    alpha = rc / (rc + dt)
  }

  override fun onReset() {
    previousInputSamples = FloatArray(0)
    previousOutputSamples = FloatArray(0)
    alpha = 0f
    channelCount = 0
    sampleRate = 0
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
        var index = 0
        while (inputFloats.hasRemaining()) {
          val channelIndex = index % channelCount
          val sample = inputFloats.get()
          val processed = processSample(sample, channelIndex)
          outputBuffer.putFloat(processed)
          index += 1
        }
      }

      else -> {
        val inputShorts = inputBuffer.order(ByteOrder.nativeOrder()).asShortBuffer()
        var index = 0
        while (inputShorts.hasRemaining()) {
          val channelIndex = index % channelCount
          val sample = inputShorts.get() / Short.MAX_VALUE.toFloat()
          val processed = processSample(sample, channelIndex)
          outputBuffer.putShort(clampToShort(processed))
          index += 1
        }
      }
    }

    outputBuffer.flip()
    inputBuffer.position(inputBuffer.limit())
  }

  private fun processSample(sample: Float, channelIndex: Int): Float {
    val filtered =
      alpha * (previousOutputSamples[channelIndex] + sample - previousInputSamples[channelIndex])
    previousInputSamples[channelIndex] = sample
    previousOutputSamples[channelIndex] = filtered
    return filtered
  }
}

class HardLimiterAudioProcessor(
  private val thresholdLinear: Float = 0.9f,
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
    val threshold = thresholdLinear.coerceIn(0f, 1f)
    val minimumShort = (-threshold * Short.MAX_VALUE).roundToInt()
    val maximumShort = (threshold * Short.MAX_VALUE).roundToInt()

    when (encoding) {
      C.ENCODING_PCM_FLOAT -> {
        val inputFloats = inputBuffer.order(ByteOrder.nativeOrder()).asFloatBuffer()
        while (inputFloats.hasRemaining()) {
          val sample = inputFloats.get().coerceIn(-threshold, threshold)
          outputBuffer.putFloat(sample)
        }
      }

      else -> {
        val inputShorts = inputBuffer.order(ByteOrder.nativeOrder()).asShortBuffer()
        while (inputShorts.hasRemaining()) {
          val sample = inputShorts.get().toInt().coerceIn(minimumShort, maximumShort)
          outputBuffer.putShort(sample.toShort())
        }
      }
    }

    outputBuffer.flip()
    inputBuffer.position(inputBuffer.limit())
  }
}
