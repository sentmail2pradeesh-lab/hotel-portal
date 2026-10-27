import React from 'react';
import { useDocumentSrc } from '../utils/storedDocuments';

// Shows a scan image whether it is stored in Dropbox (docId) or still held as a data URL
export const StoredDocumentImage = ({ doc, ...imgProps }) => {
  const src = useDocumentSrc(doc);
  if (!src) return null;
  return <img src={src} {...imgProps} />;
};
