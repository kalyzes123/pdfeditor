import { useEffect, useState, useCallback } from 'react';
import { pdfRenderer } from '../../services/pdfRenderer';
import { CanvasLayer } from './CanvasLayer';
import { TextLayer } from './TextLayer';
import { AnnotationLayer } from './AnnotationLayer';
import { annotationManagers } from '../../services/annotationRegistry';
import { useAnnotationStore } from '../../store/annotationStore';
import { useUIStore } from '../../store/uiStore';
import { CommentIcon } from '../annotations/CommentIcon';
import { CommentInput } from '../annotations/CommentInput';
import { CommentPopup } from '../annotations/CommentPopup';

interface PDFPageProps {
  pageIndex: number;
  scale: number;
}

interface PendingComment {
  commentId: string;
  bounds: { x: number; y: number; width: number; height: number };
  fabricObjectId: string;
}

export function PDFPage({ pageIndex, scale }: PDFPageProps) {
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const [pendingComment, setPendingComment] = useState<PendingComment | null>(null);
  const [activePopupId, setActivePopupId] = useState<string | null>(null);

  const activeTool = useUIStore((s) => s.activeTool);
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

  // Detect text selection on mouseup when comment tool is active.
  // The Fabric canvas is transparent to pointer events in this mode (see AnnotationLayer),
  // so the browser's native text selection works normally.
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'comment') return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const pageEl = e.currentTarget;

    // Only handle selections within this page
    if (!pageEl.contains(range.commonAncestorContainer)) return;

    const pageRect = pageEl.getBoundingClientRect();
    const selRect = range.getBoundingClientRect();

    if (selRect.width < 2 && selRect.height < 2) return;

    // Canvas-pixel coords (page-relative, same coordinate space as Fabric canvas at 0,0)
    const canvasBounds = {
      x: selRect.left - pageRect.left,
      y: selRect.top - pageRect.top,
      width: selRect.width,
      height: selRect.height,
    };

    // Natural (unscaled) coords for storage — CommentIcon/Input/Popup multiply by scale
    const naturalBounds = {
      x: canvasBounds.x / scale,
      y: canvasBounds.y / scale,
      width: canvasBounds.width / scale,
      height: canvasBounds.height / scale,
    };

    const commentId = crypto.randomUUID();
    const manager = annotationManagers.get(pageIndex);
    manager?.addCommentHighlight(commentId, canvasBounds);

    setPendingComment({ commentId, bounds: naturalBounds, fabricObjectId: commentId });
    selection.removeAllRanges();
  }, [activeTool, pageIndex, scale]);

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
      onMouseUp={handleMouseUp}
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
