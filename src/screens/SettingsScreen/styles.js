import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0b1020'},
  content: {padding: 16},
  title: {color: '#fff', fontSize: 26, fontWeight: '800'},
  subtitle: {color: '#cbd5e1', marginTop: 8, marginBottom: 10, lineHeight: 20},
  label: {color: '#f9fafb', fontSize: 15, fontWeight: '700', marginBottom: 10},
  helper: {color: '#9ca3af', fontSize: 12, lineHeight: 18},
  sectionSpacer: {height: 14},
  formatsContent: {gap: 10, paddingVertical: 10},
  bottomSpacer: {height: 24},
  formatChip: {
    width: 170,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    backgroundColor: '#0f172a',
    marginRight: 10,
  },
  formatChipActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  formatTitle: {color: '#fff', fontWeight: '700', marginBottom: 4},
  formatTitleActive: {color: '#fff'},
  formatMeta: {color: '#cbd5e1', fontSize: 12},
  resetButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: '#1f2937',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  resetText: {color: '#fff', fontWeight: '700'},
});
