import { useEffect, useState } from 'react';
import { fetchDocumentBlobUrl, storeDocument } from '../services/api';

// Blob URLs are cached per document so a scan is downloaded once per page visit
const urlCache = new Map();

export const getStoredDocumentUrl = (docId) => {
  if (!urlCache.has(docId)) {
    const pending = fetchDocumentBlobUrl(docId).catch((err) => {
      urlCache.delete(docId);
      throw err;
    });
    urlCache.set(docId, pending);
  }
  return urlCache.get(docId);
};

// Returns a viewable source for a document: its data URL (older scans) or its Dropbox copy
export const useDocumentSrc = (doc) => {
  const dataUrl = doc?.dataUrl || null;
  const docId = doc?.docId || null;
  const [src, setSrc] = useState(dataUrl);

  useEffect(() => {
    if (dataUrl || !docId) {
      setSrc(dataUrl);
      return undefined;
    }
    let cancelled = false;
    getStoredDocumentUrl(docId)
      .then((url) => { if (!cancelled) setSrc(url); })
      .catch(() => { if (!cancelled) setSrc(null); });
    return () => { cancelled = true; };
  }, [dataUrl, docId]);

  return src;
};

// True when a booking has an ID scan, either in the old data-URL form or stored in Dropbox
export const hasIdScan = (booking) => (
  Boolean(booking?.idCard) || (booking?.documents || []).some((d) => d && (d.docId || d.dataUrl))
);

// Uploads a newly picked ID scan and returns the entry kept in booking.documents.
// The file is named <bookingId>_<guestName>_<original file name> and stored in the docs folder.
export const storeIdScan = async (file, bookingId, { type = 'Aadhaar Card', number = '', guestName = '' } = {}) => {
  const fileName = [bookingId, guestName, file.name].filter(Boolean).join('_').replace(/\s+/g, '_');
  const stored = await storeDocument(file, fileName, { docType: 'id_scan', refId: bookingId, folder: 'docs' });
  return {
    docId: stored.id,
    type,
    number: number || '',
    fileName: file.name,
    fileSize: '',
  };
};
