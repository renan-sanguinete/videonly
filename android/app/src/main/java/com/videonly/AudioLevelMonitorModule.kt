package com.videonly

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Process
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.concurrent.thread
import kotlin.math.abs
import kotlin.math.log10
import kotlin.math.sqrt

private data class AudioLevelSample(
  val level: Float,
  val peakDb: Float,
  val rmsDb: Float,
  val clipping: Boolean,
)

class AudioLevelMonitorModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val lock = Any()
  private var audioRecord: AudioRecord? = null
  private var monitorThread: Thread? = null
  private var isMonitoring = false

  override fun getName(): String = "AudioLevelMonitorModule"

  @ReactMethod
  fun addListener(eventName: String?) {
    // Required for NativeEventEmitter compatibility.
  }

  @ReactMethod
  fun removeListeners(count: Double) {
    // Required for NativeEventEmitter compatibility.
  }

  @ReactMethod
  fun startMonitoring(options: ReadableMap?, promise: Promise) {
    synchronized(lock) {
      if (isMonitoring) {
        promise.resolve(true)
        return
      }

      val sampleRate = options?.getInt("sampleRate") ?: 48000
      val bufferDurationMs = options?.getInt("bufferDurationMs") ?: 50
      val bufferSizeInBytes =
        maxOf(
          AudioRecord.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
          ),
          (sampleRate * bufferDurationMs / 1000) * 2,
        )

      if (bufferSizeInBytes <= 0) {
        promise.reject("audio_monitor_invalid_buffer", "Nao foi possivel calcular o buffer de áudio.")
        return
      }

      val record =
        AudioRecord.Builder()
          .setAudioSource(MediaRecorder.AudioSource.MIC)
          .setAudioFormat(
            AudioFormat.Builder()
              .setSampleRate(sampleRate)
              .setChannelMask(AudioFormat.CHANNEL_IN_MONO)
              .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
              .build(),
          )
          .setBufferSizeInBytes(bufferSizeInBytes)
          .build()

      if (record.state != AudioRecord.STATE_INITIALIZED) {
        record.release()
        promise.reject(
          "audio_monitor_unavailable",
          "Nao foi possivel iniciar o medidor de áudio neste aparelho.",
        )
        return
      }

      audioRecord = record
      isMonitoring = true
      monitorThread =
        thread(
          name = "videonly-audio-level-monitor",
          isDaemon = true,
        ) {
          Process.setThreadPriority(Process.THREAD_PRIORITY_AUDIO)
          runMonitorLoop(record, bufferSizeInBytes)
        }

      promise.resolve(true)
    }
  }

  @ReactMethod
  fun stopMonitoring() {
    synchronized(lock) {
      isMonitoring = false

      try {
        audioRecord?.stop()
      } catch (_: Throwable) {
      }

      try {
        audioRecord?.release()
      } catch (_: Throwable) {
      }

      audioRecord = null
      monitorThread = null
    }
  }

  private fun runMonitorLoop(record: AudioRecord, bufferSizeInBytes: Int) {
    val sampleCount = maxOf(1, bufferSizeInBytes / 2)
    val buffer = ShortArray(sampleCount)

    try {
      record.startRecording()

      while (true) {
        val shouldContinue =
          synchronized(lock) {
            isMonitoring && audioRecord === record
          }

        if (!shouldContinue) {
          break
        }

        val readResult = record.read(buffer, 0, buffer.size)
        if (readResult <= 0) {
          continue
        }

        emitSample(analyzeBuffer(buffer, readResult))
      }
    } catch (_: Throwable) {
      // Best effort: the overlay simply stops updating if the device refuses the parallel record.
    } finally {
      synchronized(lock) {
        if (audioRecord === record) {
          isMonitoring = false
          audioRecord = null
          monitorThread = null
        }
      }

      try {
        record.stop()
      } catch (_: Throwable) {
      }

      try {
        record.release()
      } catch (_: Throwable) {
      }
    }
  }

  private fun analyzeBuffer(buffer: ShortArray, length: Int): AudioLevelSample {
    var peak = 0f
    var sumSquares = 0.0

    for (index in 0 until length) {
      val normalized = abs(buffer[index].toFloat()) / Short.MAX_VALUE.toFloat()
      if (normalized > peak) {
        peak = normalized
      }

      sumSquares += normalized * normalized
    }

    val rms = sqrt(sumSquares / length.coerceAtLeast(1)).toFloat()
    val peakDb = toDbFs(peak)
    val rmsDb = toDbFs(rms)
    val clipping = peak >= 0.96f || peakDb >= -1.5f

    return AudioLevelSample(peak, peakDb, rmsDb, clipping)
  }

  private fun toDbFs(level: Float): Float {
    return if (level <= 0f) {
      -120f
    } else {
      (20f * log10(level)).coerceAtLeast(-120f)
    }
  }

  private fun emitSample(sample: AudioLevelSample) {
    if (!reactApplicationContext.hasActiveCatalystInstance()) {
      return
    }

    val payload = Arguments.createMap().apply {
      putDouble("level", sample.level.toDouble())
      putDouble("peakDb", sample.peakDb.toDouble())
      putDouble("rmsDb", sample.rmsDb.toDouble())
      putBoolean("isClipping", sample.clipping)
    }

    reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("videonlyAudioLevel", payload)
  }
}
