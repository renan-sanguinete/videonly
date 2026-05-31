import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0b1020'},
  content: {padding: 16},
  title: {color: '#fff', fontSize: 26, fontWeight: '800'},
  subtitle: {color: '#cbd5e1', marginTop: 8, marginBottom: 10, lineHeight: 20},
  label: {color: '#f9fafb', fontSize: 15, fontWeight: '700', marginBottom: 10},
  helper: {color: '#9ca3af', fontSize: 12, lineHeight: 18},
  sectionSpacer: {height: 14},
  bottomSpacer: {height: 24},
  audioStatusBox: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  audioStatusBoxSafe: {
    backgroundColor: '#052e16',
    borderColor: '#166534',
  },
  audioStatusBoxWarning: {
    backgroundColor: '#3f1d0d',
    borderColor: '#9a3412',
  },
  audioStatusTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  audioStatusText: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
  },
  resetButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: '#1f2937',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  resetText: {color: '#fff', fontWeight: '700'},
  exportButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: '#0f766e',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  exportText: {color: '#ecfeff', fontWeight: '700'},
});
