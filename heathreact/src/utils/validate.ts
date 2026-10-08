export function isExternal(path: string): boolean {
  return /^(https?:|mailto:|tel:)/.test(path);
}

export function isPassword(str: string): boolean {
  return str.length >= 6;
}

export function isString(str: unknown): str is string {
  return typeof str === 'string' || str instanceof String;
}

export function isArray(arg: unknown): arg is any[] {
  if (typeof Array.isArray === 'undefined') {
    return Object.prototype.toString.call(arg) === '[object Array]';
  }
  return Array.isArray(arg);
}

export function isPhone(str: string): boolean {
  const reg = /^1\d{10}$/;
  return reg.test(str);
}
