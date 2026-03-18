export type SignatureMode = 'draw' | 'type';

export interface SignatureData {
  id: string;
  mode: SignatureMode;
  dataURL: string;
}
