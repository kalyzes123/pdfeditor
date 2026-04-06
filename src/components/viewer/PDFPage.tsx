import { useEffect, useState, useCallback } from 'react';
import { pdfRenderer } from '../../services/pdfRenderer';
import { CanvasLayer } from './CanvasLayer';
import { TextLayer } from './TextLayer';
import { AnnotationLayer } from './AnnotationLayer';
import { annotationManagers } from '../../services/annotationRegistry';
import { useAnnotationStore } from '../../store/annotationStore';
import type { CommentHighlightPayload } from '../../services/annotationManager';
import { CommentIcon } from '../annotations/CommentIcon';
import { CommentInput } from '../annotations/CommentInput';
import { CommentPopup } from '../annotations/CommentPopup';

interface PDFPageProps {
  pageIndex: number;
  scale: number;
}

export function PDFPage({ pageIndex, scale }: PDFPageProps) {
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const [pendingComment, setPendingComment] = useState<CommentHighlightPayload | null>(null);
  const [activePopupId, setActivePopupId] = useState<string | null>(null);

  const allComments = useAnnotationStore((s) => s.comments);
  const comments = allComments.filter((c) => c.pageIndex === pageIndex);
  const addComment = useAnnotationStore((s) => s.addComment);
  const updateComment = useAnnotationStore((s) => s.updateComment);
  const deleteComment = useAnnotationStore((s) => s.deleteComment);

  useEffect(() => {
    let cancelled = false;
    const loadDimensions = async () => {
      try {
        const page = await pdfRenderer.getPage(pageIndex + 1);
        if (cancelled) return;
        const viewport = pdfRenderer.getPageViewport(page, scale);
        setDimensions({ width: viewport.width, height: viewport.height });
      } catch (err) {
        if (!cancelled) console.error('Error loading page dimensions', err);
      }
    };
    loadDimensions();
    return () => { cancelled = true; };
  }, [pageIndex, scale]);

  // Wire onCommentHighlightCreated callback once AnnotationLayer has mounted
  useEffect(() => {
    if (!dimensions) return;
    const manager = annotationManagers.get(pageIndex);
    if (!manager) return;

    manager.onCommentHighlightCreated = (payload) => {
      setPendingComment(payload);
    };

    return () => {
      if (manager) manager.onCommentHighlightCreated = undefined;
    };
  }, [pageIndex, dimensions]);

  const handleCommentSubmit = useCallback((text: string) => {
    if (!pendingComment) return;
    addComment({
      pageIndex,
      highlightBounds: pendingComment.bounds,
      text,
      fabricObjectId: pendingComment.fabricObjectId,
    });
    setPendingComment(null);
  }, [pendingComment, pageIndex, addComment]);

  const handleCommentCancel = useCallback(() => {
    if (!pendingComment) return;
    const manager = annotationManagers.get(pageIndex);
    manager?.removeCommentHighlight(pendingComment.commentId);
    setPendingComment(null);
  }, [pendingComment, pageIndex]);

  const handleDeleteComment = useCallback((id: string) => {
    const comment = comments.find((c) => c.id === id);
    const manager = annotationManagers.get(pageIndex);
    if (comment?.fabricObjectId) {
      manager?.removeCommentHighlight(id);
    }
    deleteComment(id);
    setActivePopupId(null);
  }, [comments, pageIndex, deleteComment]);

  const activeComment = activePopupId ? comments.find((c) => c.id === activePopupId) : null;

  if (!dimensions) {
    return (
      <div className="flex items-center justify-center bg-surface-raised rounded" style={{ width: 600, height: 800 }}>
        <div className="text-text-muted text-sm">Loading page {pageIndex + 1}...</div>
      </div>
    );
  }

  return (
    <div
      className="relative bg-white shadow-xl shadow-black/50"
      style={{
        width: dimensions.width,
        height: dimensions.height,
      }}
    >
      <CanvasLayer pageIndex={pageIndex} scale={scale} />
      <TextLayer pageIndex={pageIndex} scale={scale} />
      <AnnotationLayer
        pageIndex={pageIndex}
        width={dimensions.width}
        height={dimensions.height}
      />

      {/* Comment overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
        {comments.map((c) => (
          <CommentIcon
            key={c.id}
            comment={c}
            scale={scale}
            isActive={activePopupId === c.id}
            onClick={(id) => setActivePopupId((prev) => (prev === id ? null : id))}
          />
        ))}

        {activeComment && (
          <CommentPopup
            comment={activeComment}
            scale={scale}
            onClose={() => setActivePopupId(null)}
            onEdit={(id, text) => updateComment(id, text)}
            onDelete={handleDeleteComment}
          />
        )}

        {pendingComment && (
          <CommentInput
            commentId={pendingComment.commentId}
            bounds={pendingComment.bounds}
            scale={scale}
            onSubmit={handleCommentSubmit}
            onCancel={handleCommentCancel}
          />
        )}
      </div>
    </div>
  );
}
