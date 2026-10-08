import { network } from './net.config';
import { setting } from './setting.config';

export const settings = {
  ...network,
  ...setting,
} as const;
