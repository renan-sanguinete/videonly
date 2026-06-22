import {translate} from '../i18n/translations';

export function buildVideoResolutionOptions(t) {
  const tx = typeof t === 'function' ? t : translate;

  return [
    {
      label: tx('common.automatic'),
      value: 'auto',
    },
    {label: '480p', value: '480p'},
    {label: '720p', value: '720p'},
    {label: '1080p', value: '1080p'},
    {label: '2K', value: '2k'},
    {label: '4K', value: '4k'},
  ];
}
