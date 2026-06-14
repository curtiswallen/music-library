async function resizeToJpeg(file: File, maxPx = 600): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(maxPx / bmp.width, maxPx / bmp.height, 1);
  const w = Math.round(bmp.width * s);
  const h = Math.round(bmp.height * s);
  const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h });
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  return new Promise(res => canvas.toBlob(b => res(b!), 'image/jpeg', 0.85));
}

async function uploadCover(file: File): Promise<string> {
  const blob = await resizeToJpeg(file);
  const fd = new FormData();
  fd.append('file', blob, 'cover.jpg');
  const res = await fetch('/api/upload-cover', { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Upload failed');
  return ((await res.json()) as { url: string }).url;
}

export function initCoverUpload() {
  const preview     = document.getElementById('cover-preview')  as HTMLElement;
  const uploadWrap  = document.getElementById('cover-upload-wrap') as HTMLElement;
  const img         = document.getElementById('cover-img')       as HTMLImageElement;
  const fileInput   = document.getElementById('cover-file')      as HTMLInputElement;
  const statusEl    = document.getElementById('cover-upload-status') as HTMLElement;
  const replaceBtn  = document.getElementById('cover-replace-btn') as HTMLButtonElement | null;

  replaceBtn?.addEventListener('click', () => {
    preview.style.display     = 'none';
    uploadWrap.style.display  = '';
  });

  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    statusEl.textContent = 'Uploading...';
    statusEl.className   = 'cover-upload-status';
    try {
      const url = await uploadCover(file);
      (document.getElementById('f-cover-url') as HTMLInputElement).value = url;
      img.onload = () => {
        preview.style.display    = 'block';
        uploadWrap.style.display = 'none';
        statusEl.textContent     = '';
      };
      img.src = url;
    } catch {
      statusEl.textContent = 'Upload failed.';
      statusEl.className   = 'cover-upload-status error';
    }
  });
}
