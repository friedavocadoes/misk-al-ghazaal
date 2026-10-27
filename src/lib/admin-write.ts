/** A failed database mutation must not become a successful admin toast. */
export async function assertAdminWrite(
  result: PromiseLike<{ error: { message: string } | null }>,
): Promise<void> {
  const { error } = await result;
  if (error) throw new Error(error.message);
}
