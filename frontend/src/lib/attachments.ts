import type { Attachment, AttachmentKind } from './types';
import {
  ALLOWED_IMAGE_MIMES,
  ALLOWED_TEXT_EXTENSIONS,
  BLOCKED_EXTENSIONS,
  MAX_ATTACHMENTS_PER_MESSAGE,
  MAX_ATTACHMENT_IMAGE_DIM,
  MAX_IMAGE_BYTES,
  MAX_TEXT_FILE_BYTES,
  MAX_TEXT_PREVIEW_CHARS,
} from './validation';
import { sanitizeContent } from './storage';

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Strip paths, control chars and over-long names. Never trust client filenames. */
export function sanitizeFileName(raw: string): string {
  const base = (raw || 'file').split(/[\\/]/).pop() || 'file';
  return base.replace(/[\0-\x1f\x7f<>:"|?*]/g, '').trim().slice(0, 80) || 'file';
}

function extensionOf(name: string): string {
  const parts = name.toLowerCase().split('.');
  return parts.length > 1 ? (parts.pop() ?? '') : '';
}

/** Human size, e.g. 512 B, 12 KB, 3.1 MB. */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function classify(name: string, mime: string): AttachmentKind | null {
  const ext = extensionOf(name);
  if ((BLOCKED_EXTENSIONS as readonly string[]).includes(ext)) return null;
  if ((ALLOWED_IMAGE_MIMES as readonly string[]).includes(mime)) return 'image';
  // Some browsers report odd image mimes (image/jpg, image/pjpeg) — accept by extension.
  if (mime.startsWith('image/') && ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
    return 'image';
  }
  if (
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/x-javascript' ||
    mime === '' ||
    (ALLOWED_TEXT_EXTENSIONS as readonly string[]).includes(ext)
  ) {
    return 'text';
  }
  // PDFs, docs, zips, audio… travel as metadata only (never parsed, never uploaded).
  return 'file';
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error(`Could not read “${file.name}”.`));
    reader.readAsDataURL(file);
  });
}

/**
 * Downscale an image to MAX_ATTACHMENT_IMAGE_DIM via canvas so the vision
 * payload + localStorage stay small. GIFs keep the original bytes (animation).
 * Falls back to the original data URL on any failure.
 */
function downscaleImage(dataUrl: string, mime: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined' || mime === 'image/gif') {
        resolve(dataUrl);
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          const { naturalWidth: w, naturalHeight: h } = img;
          if (!w || !h) {
            resolve(dataUrl);
            return;
          }
          if (w <= MAX_ATTACHMENT_IMAGE_DIM && h <= MAX_ATTACHMENT_IMAGE_DIM) {
            resolve(dataUrl);
            return;
          }
          const scale = Math.min(MAX_ATTACHMENT_IMAGE_DIM / w, MAX_ATTACHMENT_IMAGE_DIM / h);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(w * scale));
          canvas.height = Math.max(1, Math.round(h * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          // White base so transparent PNG/WebP → JPEG doesn't turn black.
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const outMime = mime === 'image/png' ? 'image/png' : 'image/jpeg';
          resolve(canvas.toDataURL(outMime, 0.82));
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}

async function fileToAttachment(file: File): Promise<Attachment> {
  const name = sanitizeFileName(file.name);
  const kind = classify(name, file.type);
  if (!kind) {
    throw new Error(`“${name}” is not an accepted file type. Executables are blocked.`);
  }
  const base = { id: uid(), name, mime: file.type || 'application/octet-stream', size: file.size };

  if (kind === 'image') {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`“${name}” is too large (${formatFileSize(file.size)}). Images must be under ${formatFileSize(MAX_IMAGE_BYTES)}.`);
    }
    const original = await readAsDataURL(file);
    const dataUrl = await downscaleImage(original, file.type);
    return { ...base, kind, dataUrl };
  }

  if (kind === 'text') {
    if (file.size > MAX_TEXT_FILE_BYTES) {
      throw new Error(`“${name}” is too large (${formatFileSize(file.size)}). Text files must be under ${formatFileSize(MAX_TEXT_FILE_BYTES)}.`);
    }
    const raw = await file.text();
    const textContent = sanitizeContent(raw).slice(0, MAX_TEXT_PREVIEW_CHARS);
    return { ...base, kind, textContent };
  }

  return { ...base, kind };
}

export type PreparedAttachments = {
  attachments: Attachment[];
  errors: string[];
};

/**
 * Validate + read a batch of dropped/picked files.
 * Never throws for individual files — collects per-file errors instead.
 * Attachments stay on-device: images are downscaled data URLs, text is
 * truncated plain text, everything else is metadata only.
 */
export async function prepareAttachments(
  existingCount: number,
  files: FileList | File[]
): Promise<PreparedAttachments> {
  const list = Array.from(files ?? []);
  const attachments: Attachment[] = [];
  const errors: string[] = [];

  const room = MAX_ATTACHMENTS_PER_MESSAGE - existingCount;
  if (room <= 0) {
    return { attachments, errors: [`Up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`] };
  }
  const batch = list.slice(0, room);
  if (list.length > batch.length) {
    errors.push(`Only the first ${room} file(s) were kept (max ${MAX_ATTACHMENTS_PER_MESSAGE} per message).`);
  }

  for (const file of batch) {
    try {
      attachments.push(await fileToAttachment(file));
    } catch (err) {
      errors.push(err instanceof Error ? err.message : `Could not read “${file.name}”.`);
    }
  }
  return { attachments, errors };
}

/** Text appended to the user content for non-image attachments. */
export function attachmentContextBlock(att: Attachment): string {
  if (att.kind === 'text' && att.textContent) {
    const truncated = att.textContent.length >= MAX_TEXT_PREVIEW_CHARS ? '\n[…truncated]' : '';
    return `[Attached file: ${att.name} (${formatFileSize(att.size)})]\n"""${att.textContent}${truncated}"""`;
  }
  return `[Attached file: ${att.name} (${att.mime}, ${formatFileSize(att.size)}) — content not readable in chat; acknowledge it by name only.]`;
}

/** Short label for the composer/title when the message has no text. */
export function attachmentSummary(attachments: Attachment[]): string {
  if (attachments.length === 0) return '';
  const images = attachments.filter((a) => a.kind === 'image').length;
  if (images === attachments.length) {
    return images === 1 ? 'Image attachment' : `${images} images attached`;
  }
  return `${attachments.length} file(s) attached`;
}
