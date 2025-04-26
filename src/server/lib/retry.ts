export async function retry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (attempts <= 1) throw error;
    await new Promise((r) => setTimeout(r, delay));
    return retry(fn, attempts - 1, delay * 2);
  }
}
