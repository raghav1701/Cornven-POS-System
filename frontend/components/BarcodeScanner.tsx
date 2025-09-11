'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { X, Camera } from 'lucide-react';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  isLoading?: boolean;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ isOpen, onClose, onScan, isLoading = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const [codeReader, setCodeReader] = useState<BrowserMultiFormatReader | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const isScanningActiveRef = useRef(false);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setHasScanned(false);
      hasScannedRef.current = false;
      isScanningActiveRef.current = true;
      startScanning();
    } else {
      isScanningActiveRef.current = false;
      stopScanning();
    }

    return () => {
      isScanningActiveRef.current = false;
      stopScanning();
    };
  }, [isOpen]);

  const startScanning = async () => {
    try {
      setError('');
      setIsScanning(true);
      isScanningActiveRef.current = true;

      // Request camera permission
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();

        // Initialize barcode reader
        const reader = new BrowserMultiFormatReader();
        setCodeReader(reader);
        
        // Start scanning with faster detection interval
        reader.decodeFromVideoDevice(null, videoRef.current, (result, error) => {
          if (result && !hasScannedRef.current && isScanningActiveRef.current) {
            hasScannedRef.current = true;
            isScanningActiveRef.current = false;
            setHasScanned(true);
            const barcode = result.getText();
            console.log('Barcode detected:', barcode);
            
            // Immediately stop camera and scanning
            stopScanning();
            
            // Call onScan callback
            onScan(barcode);
          }
          if (error && !(error instanceof NotFoundException)) {
            console.error('Barcode scanning error:', error);
          }
        });
      }
    } catch (err) {
      console.error('Error starting camera:', err);
      setError('Failed to access camera. Please ensure camera permissions are granted.');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    isScanningActiveRef.current = false;
    if (codeReader) {
      codeReader.reset();
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setCodeReader(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Scan Barcode
          </h3>
          <button
            onClick={() => {
              stopScanning();
              onClose();
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error ? (
          <div className="text-center py-8">
            <div className="text-red-500 mb-4">{error}</div>
            <button
              onClick={startScanning}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full h-64 bg-black rounded-lg object-cover"
              playsInline
              muted
            />
            {isScanning && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-green-500 w-48 h-32 rounded-lg animate-pulse"></div>
              </div>
            )}
            {isLoading && (
              <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-lg font-semibold">Looking up product...</p>
                  <p className="text-sm opacity-75">Please wait</p>
                </div>
              </div>
            )}
            <div className="text-center mt-4 text-sm text-gray-600">
              {isLoading ? 'Processing barcode...' : 'Position the barcode within the green frame'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeScanner;