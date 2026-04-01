import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
  headerActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    flex: 1,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
