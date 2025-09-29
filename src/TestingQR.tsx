import React from 'react';
import QRCode from "react-qr-code";

const container = document.getElementById("Container");

const TestingQR: React.FC = () => {
    const [inputValue, setInputValue] = React.useState("");
    return (
        <div style={{ height: "auto", margin: "0 auto", maxWidth: 256, width: "100%", background: 'white', padding: '8px', border: '4px solid black' }}>
            <h1>QR Code Test</h1>
            <input
                type="text"
                placeholder="Enter text to encode"
                style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)} // Automatic updates rather than a submit box to keep codes generating dynamically
            />
            <QRCode
                size={256}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                value={inputValue} // QR code value is dynamically set based on input
                viewBox={`0 0 256 256`}
            />
        </div>
    );
};

// Can be anything instead of `maxWidth` that limits the width.


export default TestingQR;