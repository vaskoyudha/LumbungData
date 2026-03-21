import QRCode from 'qrcode';

export async function generateQRCode(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: 'L',
    margin: 2,
    width: 400,
  });
}

export class ScanNotImplementedError extends Error {
  constructor() {
    super('QR scanning not yet implemented. Camera API integration is a TODO.');
    this.name = 'ScanNotImplementedError';
  }
}

export async function scanQRCode(): Promise<string> {
  throw new ScanNotImplementedError();
}
