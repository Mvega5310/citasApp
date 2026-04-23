const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const cleanText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export const cleanOptionalText = (value: unknown) => {
  const normalized = cleanText(value);
  return normalized ? normalized : null;
};

export const isValidEmail = (value: string) => EMAIL_REGEX.test(value);
export const isValidPhone = (value: string) => PHONE_REGEX.test(value);
export const isValidUuid = (value: string) => UUID_REGEX.test(value);

export function parsePaginationParams(url: string) {
  const { searchParams } = new URL(url);
  const rawLimit = Number.parseInt(searchParams.get('limit') || '50', 10);
  const rawOffset = Number.parseInt(searchParams.get('offset') || '0', 10);

  return {
    limit: Number.isNaN(rawLimit) ? 50 : Math.min(Math.max(rawLimit, 1), 100),
    offset: Number.isNaN(rawOffset) ? 0 : Math.max(rawOffset, 0),
  };
}
