import { useState } from 'react';

export function useLoading(initial = false) {
  return useState<boolean>(initial);
}
