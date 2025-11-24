import React, { useState } from 'react';
import QRCode from 'react-qr-code';

interface AthleteQRCodeProps {
  profileId: string;
  athleteName: string;
}

export default function AthleteQRCode({ profileId, athleteName }: AthleteQRCodeProps) {
  const [showQR, setShowQR] = useState(false);

  // Generate the medical pass URL
  const medicalPassUrl = `https://app.muaythaigb.org/medical/${profileId}`;

  const handleDownloadQR = () => {
    const svg = document.getElementById('athlete-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${athleteName.replace(/\s+/g, '_')}_Medical_Pass.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

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
