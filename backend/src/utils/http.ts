export function normalizeError(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: string }).message ?? 'Ocurrió un error inesperado');
    return message;
  }

  return 'Ocurrió un error inesperado';
}

export function serializeError(code: string, message: string, fields?: Record<string, string>) {
  return {
    error: {
      code,
      message,
      ...(fields ? { fields } : {})
    }
  };
}
