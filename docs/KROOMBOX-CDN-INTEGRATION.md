# Kroombox CDN Integration

## Overview
Portal Ko+Lab has been migrated to use Kroombox CDN for file hosting, moving away from storing binary files in the database (\ile_blobs\ table). This reduces the database size and significantly improves content delivery speed and scalability.

## Architecture

### Storage
All uploaded files (assets, profile avatars, ID cards, article thumbnails, article attachments, event thumbnails, startup logos) are sent directly to Kroombox API using multipart form uploads.

### Database
- \cdn_assets\: A new table that tracks all files uploaded to Kroombox CDN.
  - \sset_id\: The ID returned by Kroombox.
  - \	ype\: SYSTEM, PROFILE, ARTICLE, EVENT, STARTUP, or GENERAL.
  - \eature_id\: Maps the asset to a specific entity (e.g. article ID, user ID).
- Legacy tables:
  - \epo.storage_provider\: Added to distinguish between 'LEGACY' (still in \ile_blobs\) and 'KROOMBOX_CDN'.
  - \rticle_attachments.storage_provider\ and \rticle_attachments.cdn_asset_id\ added to track Kroombox assets.

## API Integration

### \pi/lib/kroomboxCdn.js\
This module wraps Kroombox's REST API. It handles:
- \upload(fileBuffer, originalName, mimeType)\: Uploads file to CDN.
- \getDeliveryUrl(assetId, accessType, expirySeconds)\: Returns public URLs or signed URLs for private assets.
- \generateSignedUrl(assetId, expirySeconds)\: Signs URLs securely using HMAC-SHA256 for private delivery.

### \pi/routes/assets.js\
Provides the \/api/assets/upload\ endpoint which expects \multipart/form-data\.
Files are streamed to Kroombox in-memory using Multer. The asset details are saved into \cdn_assets\ table.

## Frontend Migration
The frontend uses \uploadFileCdn\ in \pi.ts\ to upload files via FormData, replacing the old \postData('uploadFile')\ Base64 approach.

### Modified Components
- **App.tsx**: Modified \handleFileUpload\ to route Profile/System uploads to CDN.
- **ArticleView.tsx**: Patched to upload article thumbnails and attachments to CDN.
- **EventsView.tsx**: Patched to upload event thumbnails to CDN.
- **MemberManagementView.tsx**: Patched to upload startup logos to CDN.

## Security Considerations
1. No credentials are hardcoded. \KROOMBOX_API_KEY\ and \KROOMBOX_API_SECRET\ are pulled exclusively from \.env\.
2. Private assets use temporary signed URLs that expire after 15 minutes by default.
3. Only authorized backend endpoints can upload files, ensuring students cannot upload arbitrary large files without tracking.
