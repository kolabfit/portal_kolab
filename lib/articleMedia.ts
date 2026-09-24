// Preserve every completed upload before waiting for processing or saving the
// article. A failed retry reuses asset IDs rather than uploading the same bytes.
export async function prepareArticleMedia(snapshot: any, api: any, callbacks: any) {
  let imageUrl = snapshot.imageUrl || '';
  let thumbnail = snapshot.thumbnail;
  const attachments = [...snapshot.attachments];
  const tasks: (() => Promise<void>)[] = [];
  const ready = async (asset: any) => {
    if (asset.cdnStatus === 'PROCESSING' || asset.cdnStatus === 'UPLOADING') {
      return { ...asset, ...(await api.waitForAssetReady(asset.id || asset.fileId)) };
    }
    if (asset.cdnStatus === 'FAILED') throw new Error('File gagal diproses oleh storage. Pilih ulang file.');
    return asset;
  };
  if (snapshot.imagePreview?.startsWith('data:') || thumbnail) tasks.push(async () => {
    if (!thumbnail) {
      const blob = await (await fetch(snapshot.imagePreview)).blob();
      const extension = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png';
      const result = await api.uploadFileCdn(new File([blob], `${snapshot.id}.${extension}`, { type: blob.type }), 'ARTICLE_THUMBNAIL', snapshot.id, 'public');
      if (result?.status !== 'success' || !result.asset?.id) throw new Error(result?.message || 'Upload gambar gagal.');
      thumbnail = result.asset;
      callbacks.thumbnail(thumbnail);
    }
    thumbnail = await ready(thumbnail);
    callbacks.thumbnail(thumbnail);
    imageUrl = thumbnail.deliveryUrl || thumbnail.url;
  });
  else if (snapshot.imagePreview) imageUrl = snapshot.imagePreview;

  for (const attachment of snapshot.attachments) {
    if (attachment.cdnStatus === 'PROCESSING' || attachment.cdnStatus === 'UPLOADING') tasks.push(async () => {
      const result = await ready({ ...attachment, id: attachment.fileId });
      Object.assign(attachment, { cdnStatus: result.cdnStatus });
      callbacks.attachments([...attachments]);
    });
  }
  for (const file of snapshot.files) tasks.push(async () => {
    const result = await api.uploadFileCdn(file, 'ARTICLE_ATTACHMENT', snapshot.id, 'public');
    if (result?.status !== 'success' || !result.asset?.id) throw new Error(result?.message || `Upload ${file.name} gagal.`);
    const attachment = { fileId: result.asset.id, originalName: file.name, mimeType: file.type, size: file.size, cdnStatus: result.asset.cdnStatus };
    attachments.push(attachment);
    callbacks.attachments([...attachments]);
    callbacks.uploaded(file);
    const asset = await ready(result.asset);
    attachment.cdnStatus = asset.cdnStatus;
    callbacks.attachments([...attachments]);
  });
  let cursor = 0;
  let firstError: unknown;
  async function worker() {
    while (cursor < tasks.length && !firstError) {
      const task = tasks[cursor++];
      try { await task(); } catch (error) { firstError ||= error; }
    }
  }
  // Wait for both workers, including successful uploads, before enabling retry.
  await Promise.all([worker(), worker()]);
  if (firstError) throw firstError;
  return { imageUrl, attachments: attachments.map(a => ({ fileId: a.fileId })) };
}
