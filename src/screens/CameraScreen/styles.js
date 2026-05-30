import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1020' },
  panel: {
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    padding: 16,
    minHeight: 164,
    maxHeight: 220,
    gap: 12,
  },
  recordingMeterPanel: {
    gap: 8,
  },
  recordingMeterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  recordingMeterLabel: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  recordingMeterValue: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  recordingMeterValueClip: {
    color: '#f87171',
  },
  recordingMeterTrack: {
    position: 'relative',
    height: 12,
    borderRadius: 999,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  recordingMeterFill: {
    height: '100%',
    borderRadius: 999,
  },
  recordingMeterFillSafe: {
    backgroundColor: '#22c55e',
  },
  recordingMeterFillWarn: {
    backgroundColor: '#f59e0b',
  },
  recordingMeterFillClip: {
    backgroundColor: '#ef4444',
  },
  recordingMeterThreshold: {
    position: 'absolute',
    right: '4%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(248, 113, 113, 0.9)',
  },
  recordingMeterHint: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 15,
  },
  recordingPanelSpacer: {
    flex: 1,
  },
  panelActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  panelActionButton: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  panelActionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelActionIconDanger: {
    borderColor: 'rgba(248, 113, 113, 0.45)',
    backgroundColor: 'rgba(127, 29, 29, 0.28)',
  },
  panelActionLabel: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  savedVideosContent: {
    gap: 12,
    paddingRight: 8,
  },
  panelTitle: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  emptyText: { color: '#9ca3af' },
  savedVideosLoading: {
    flex: 1,
    minHeight: 78,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  savedVideosLoadingText: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0b1020',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 21,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
});
