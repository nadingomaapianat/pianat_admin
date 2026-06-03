/**
 * Stub. The customer app had a global layout header that pages hid via
 * usePageHeadingOverride({ hidden: true }). This standalone admin app has no
 * such global header, so the hook is a no-op kept only so the ported pages
 * compile unchanged.
 */
export type PageHeadingOverride = { title?: string; description?: string; hidden?: boolean };

export function usePageHeadingOverride(_override: PageHeadingOverride | null): void {
  /* no-op in the admin app */
}
