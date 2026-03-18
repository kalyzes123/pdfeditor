import type { AnnotationManager } from './annotationManager';

// Global registry of annotation managers so save flow and shortcuts can access them
export const annotationManagers = new Map<number, AnnotationManager>();
