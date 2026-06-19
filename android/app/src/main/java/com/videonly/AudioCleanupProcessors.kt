package com.videonly

import androidx.media3.common.C
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.audio.BaseAudioProcessor
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.sqrt

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

class LowLevelNoiseReducerAudioProcessor(
  private val thresholdDb: Float = -48f,
  private val maxReductionDb: Float = 8f,
) : BaseAudioProcessor() {
  private var envelopeSamples = FloatArray(0)
  private var attackCoefficient = 0f
  private var releaseCoefficient = 0f
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
    envelopeSamples = FloatArray(channelCount)
    attackCoefficient = smoothingCoefficient(8f, sampleRate)
    releaseCoefficient = smoothingCoefficient(120f, sampleRate)
  }

  override fun onReset() {
    envelopeSamples = FloatArray(0)
    attackCoefficient = 0f
    releaseCoefficient = 0f
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
          val processed = processSample(inputFloats.get(), channelIndex)
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
    val level = abs(sample)
    val coefficient =
      if (level > envelopeSamples[channelIndex]) attackCoefficient else releaseCoefficient
    val envelope = coefficient * envelopeSamples[channelIndex] + (1f - coefficient) * level
    envelopeSamples[channelIndex] = envelope

    val thresholdLinear = dbToLinear(thresholdDb)
    val floorLinear = dbToLinear(thresholdDb - 18f)
    val reductionLinear = dbToLinear(-maxReductionDb.coerceAtLeast(0f))

    val gain =
      when {
        envelope >= thresholdLinear -> 1f
        envelope <= floorLinear -> reductionLinear
        else -> {
          val progress = (envelope - floorLinear) / (thresholdLinear - floorLinear)
          reductionLinear + (1f - reductionLinear) * sqrt(progress.coerceIn(0f, 1f))
        }
      }

    return sample * gain
  }

  private fun smoothingCoefficient(timeMs: Float, rate: Int): Float {
    return exp(-1f / ((timeMs / 1000f) * rate.toFloat()))
  }

  private fun dbToLinear(db: Float): Float {
    return 10f.pow(db / 20f)
  }
}

class ClipRepairAudioProcessor(
  private val kneeLinear: Float = 0.88f,
  private val ceilingLinear: Float = 0.98f,
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
          outputBuffer.putFloat(processSample(inputFloats.get()))
        }
      }

      else -> {
        val inputShorts = inputBuffer.order(ByteOrder.nativeOrder()).asShortBuffer()
        while (inputShorts.hasRemaining()) {
          val sample = inputShorts.get() / Short.MAX_VALUE.toFloat()
          outputBuffer.putShort(clampToShort(processSample(sample)))
        }
      }
    }

    outputBuffer.flip()
    inputBuffer.position(inputBuffer.limit())
  }

  private fun processSample(sample: Float): Float {
    val magnitude = abs(sample)
    val knee = kneeLinear.coerceIn(0.5f, 0.98f)
    val ceiling = ceilingLinear.coerceIn(knee, 0.999f)

    if (magnitude <= knee) {
      return sample
    }

    val normalizedOver = ((magnitude - knee) / (1f - knee)).coerceIn(0f, 1f)
    val softenedOver = 1f - exp(-2.2f * normalizedOver)
    val repairedMagnitude = knee + (ceiling - knee) * softenedOver

    return if (sample < 0f) -repairedMagnitude else repairedMagnitude
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
