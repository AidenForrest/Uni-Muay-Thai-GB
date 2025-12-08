/**
 * Athlete QR Code Component
 *
 * Generates and displays a QR code for an athlete's medical pass.
 * When scanned, the QR code links to the athlete's public medical pass page.
 *
 * Features:
 * - Toggle to show/hide the QR code
 * - Download QR code as PNG image
 * - High error correction level (H) for reliable scanning
 */

import React, { useState } from 'react';
import QRCode from 'react-qr-code';

interface AthleteQRCodeProps {
  profileId: string;    // The athlete's unique profile ID
  athleteName: string;  // Used for the download filename
}

export default function AthleteQRCode({ profileId, athleteName }: AthleteQRCodeProps) {
  const [showQR, setShowQR] = useState(false);

  // The URL that the QR code will link to when scanned
  const medicalPassUrl = `https://app.muaythaigb.org/medical/${profileId}`;

  /**
   * Converts the SVG QR code to a PNG and triggers download.
   * This is a client-side conversion that:
   * 1. Serializes the SVG to a string
   * 2. Creates a canvas element
   * 3. Draws the SVG onto the canvas
   * 4. Exports as PNG and triggers download
   */
  const handleDownloadQR = () => {
    const svg = document.getElementById('athlete-qr-code');
    if (!svg) return;

    // Convert SVG to string
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      // Convert canvas to PNG and trigger download
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${athleteName.replace(/\s+/g, '_')}_Medical_Pass.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    // Load the SVG as a base64 image
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="qr-code-container">
      {!showQR ? (
        <button className="card-button" onClick={() => setShowQR(true)}>
          View QR Code
        </button>
      ) : (
        <div className="qr-code-display">
          <div className="qr-code-header">
            <h3>Your Medical Pass QR Code</h3>
            <button className="close-button" onClick={() => setShowQR(false)}>
              ✕
            </button>
          </div>

          <div className="qr-code-wrapper">
            <QRCode
              id="athlete-qr-code"
              value={medicalPassUrl}
              size={256}
              level="H"
              style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
            />
          </div>

          <div className="qr-code-info">
            <p className="qr-instructions">
              Medical professionals can scan this QR code to access your medical information.
            </p>
            <p className="qr-url">
              <strong>Profile ID:</strong> {profileId}
            </p>
          </div>

          <div className="qr-code-actions">
            <button className="download-button" onClick={handleDownloadQR}>
              Download QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
