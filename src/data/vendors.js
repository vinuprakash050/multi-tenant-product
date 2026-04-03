export const DEFAULT_VENDOR_THEME = {
  accent: "#1f6feb",
  surface: "#eef5ff",
};

export function slugifyVendorName(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
