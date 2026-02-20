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
  // Create a human-readable description
  const readableDescription = `Label: ${metadata.label}\nOriginal Image: ${metadata.originalImage}\nCrop Location: X: ${metadata.cropLocation.x}, Y: ${metadata.cropLocation.y}, Width: ${metadata.cropLocation.width}, Height: ${metadata.cropLocation.height}`;

  const fileMetadata = {
    name: fileName,
    parents: [parentFolderId],
    description: readableDescription,
    appProperties: {
      originalImage: metadata.originalImage,
      cropX: String(metadata.cropLocation.x),
      cropY: String(metadata.cropLocation.y),
      cropWidth: String(metadata.cropLocation.width),
      cropHeight: String(metadata.cropLocation.height),
      label: metadata.label
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

export async function moveFile(fileId, newParentId, accessToken) {
  // 1. Get current parents
  const parentRes = await fetch(
    `${DRIVE_API_BASE}/files/${fileId}?fields=parents`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!parentRes.ok) {
    throw new Error('Failed to fetch current file parents');
  }

  const parentData = await parentRes.json();
  const previousParents = parentData.parents?.join(',') || '';

  // 2. Move file (with the required JSON body and headers)
  const response = await fetch(
    `${DRIVE_API_BASE}/files/${fileId}?addParents=${newParentId}&removeParents=${previousParents}`,
    {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json' // Crucial for Drive API PATCH
      },
      body: JSON.stringify({}) // Crucial for Drive API PATCH
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || response.statusText);
  }

  return await response.json();
}

// Update batchMoveFiles to match the new signature (no oldParentId)
export async function batchMoveFiles(fileIds, newParentId, accessToken) {
  const promises = fileIds.map(fileId => 
    moveFile(fileId, newParentId, accessToken)
  );
  return await Promise.all(promises);
}