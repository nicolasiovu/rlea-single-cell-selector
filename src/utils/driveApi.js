/**
 * Google Drive API utilities
 */

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_BASE = 'https://www.googleapis.com/upload/drive/v3';

export async function listFolders(folderId, accessToken) {
  const response = await fetch(
    `${DRIVE_API_BASE}/files?q='${folderId}'+in+parents+and+mimeType='application/vnd.google-apps.folder'&fields=files(id,name)&orderBy=name`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  
  if (!response.ok) throw new Error(`Failed to list folders: ${response.statusText}`);
  const data = await response.json();
  return data.files || [];
}

export async function listImages(folderId, accessToken, pageToken = null) {
  const query = `'${folderId}' in parents and (mimeType contains 'image/')`;
  let url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&pageSize=100&fields=files(id,name),nextPageToken`;
  
  if (pageToken) url += `&pageToken=${pageToken}`;
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (!response.ok) throw new Error(`Failed to list images: ${response.statusText}`);
  return await response.json();
}

export async function downloadImage(fileId, accessToken) {
  const response = await fetch(
    `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  
  if (!response.ok) throw new Error(`Failed to download image: ${response.statusText}`);
  return await response.blob();
}

export async function uploadCroppedImage(blob, fileName, parentFolderId, metadata, accessToken) {
  const fileMetadata = {
    name: fileName,
    parents: [parentFolderId],
    description: JSON.stringify({
      originalImage: metadata.originalImage,
      cropLocation: metadata.cropLocation,
      label: metadata.label,
      timestamp: metadata.timestamp
    }),
    appProperties: {
      originalImage: metadata.originalImage,
      cropX: String(metadata.cropLocation.x),
      cropY: String(metadata.cropLocation.y),
      cropWidth: String(metadata.cropLocation.width),
      cropHeight: String(metadata.cropLocation.height),
      label: metadata.label,
      timestamp: String(metadata.timestamp)
    }
  };
  
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
  form.append('file', blob);
  
  const response = await fetch(`${UPLOAD_API_BASE}/files?uploadType=multipart`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` },
    body: form
  });
  
  if (!response.ok) throw new Error(`Failed to upload image: ${response.statusText}`);
  return await response.json();
}

export async function moveFile(fileId, newParentId, oldParentId, accessToken) {
  const response = await fetch(
    `${DRIVE_API_BASE}/files/${fileId}?addParents=${newParentId}&removeParents=${oldParentId}`,
    {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );
  
  if (!response.ok) throw new Error(`Failed to move file: ${response.statusText}`);
  return await response.json();
}

export async function batchMoveFiles(fileIds, newParentId, oldParentId, accessToken) {
  const promises = fileIds.map(fileId => 
    moveFile(fileId, newParentId, oldParentId, accessToken)
  );
  return await Promise.all(promises);
}