import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
  headerActions: {
    width: '100%',
    flexDirection: 'row',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerIconButton: {
    flex: 1,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconButtonDisabled: {
    opacity: 0.35,
  },
  headerOptimizationButton: {
    marginRight: 2,
  },
  optimizationMenu: {
    width: '100%',
    borderRadius: 18,
    padding: 12,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    gap: 8,
    zIndex: 100,
  },
  optimizationMenuExpanded: {
    width: '100%',
    borderRadius: 18,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  optimizationMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  optimizationMenuTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  optimizationCloseButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optimizationMenuOptions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  optimizationOption: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  optimizationOptionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optimizationOptionIconWrapSelected: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  optimizationOptionLabel: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  optimizationOptionLabelSelected: {
    color: '#93c5fd',
  },
  optimizationButtonNone: {
    borderColor: '#fff',
  },
  optimizationButtonVideo: {
    borderColor: '#60a5fa',
  },
  optimizationButtonAudio: {
    borderColor: '#4ade80',
  },
  optimizationButtonBoth: {
    borderColor: '#f87171',
  },
});
