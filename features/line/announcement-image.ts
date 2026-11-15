export const MAX_ANNOUNCEMENT_IMAGE_BYTES = 3 * 1024 * 1024;
export const ANNOUNCEMENT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ANNOUNCEMENT_IMAGE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function announcementImagePath(id: string, preview = false): string {
  if (!ANNOUNCEMENT_IMAGE_ID.test(id)) throw new Error("รหัสรูปไม่ถูกต้อง");
  return `/api/line/announcement-images/${id}${preview ? "?size=preview" : ""}`;
}

export function announcementImageMessage(id: string) {
  return {
    type: "image" as const,
    originalContentUrl: `https://chumkosoft.com${announcementImagePath(id)}`,
    previewImageUrl: `https://chumkosoft.com${announcementImagePath(id, true)}`,
  };
}
