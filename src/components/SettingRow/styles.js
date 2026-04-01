import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
  sectionTitle: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 16,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
  },
  rowText: {
    flex: 1,
    paddingRight: 10,
  },
  label: {
    color: '#f9fafb',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    color: '#9ca3af',
    fontSize: 12,
    lineHeight: 17,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#374151',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#0f172a',
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipText: {
    color: '#d1d5db',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  fieldBlock: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: '#0f172a',
  },
});
