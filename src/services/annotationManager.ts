import * as fabric from 'fabric';
import type { AnnotationTool } from '../types/annotation.types';
import type { SelectedObjectProps } from '../store/uiStore';
import { useUIStore } from '../store/uiStore';

interface ToolOptions {
  color?: string;
  opacity?: number;
  strokeWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  fontBold?: boolean;
  fontItalic?: boolean;
  fontUnderline?: boolean;
  fontStrikethrough?: boolean;
  stampLabel?: string;
  signatureDataURL?: string;
}

export interface CommentHighlightPayload {
  commentId: string;
  bounds: { x: number; y: number; width: number; height: number };
  fabricObjectId: string;
}

export class AnnotationManager {
  private canvas: fabric.Canvas | null = null;
  private onChangeCallback: (json: object) => void;
  private onSaveOnlyCallback: ((json: object) => void) | null = null;
  private onSelectionChangeCallback: ((props: SelectedObjectProps | null) => void) | null = null;
  private cleanupListeners: (() => void)[] = [];
  private deletedStack: fabric.FabricObject[] = [];
  private currentWidth = 1;
  private currentHeight = 1;

  /** Called when the user finishes drawing a comment highlight. */
  onCommentHighlightCreated?: (payload: CommentHighlightPayload) => void;
  constructor(onChange: (json: object) => void) {
    this.onChangeCallback = onChange;
  }

  /** Register a callback that saves annotations WITHOUT pushing to undo history. */
  onSaveOnly(cb: (json: object) => void): void {
    this.onSaveOnlyCallback = cb;
  }

  initialize(
    canvasElement: HTMLCanvasElement,
    width: number,
    height: number
  ): void {
    this.currentWidth = width;
    this.currentHeight = height;
    this.canvas = new fabric.Canvas(canvasElement, {
      width,
      height,
      selection: true,
      preserveObjectStacking: true,
      backgroundColor: 'transparent',
      allowTouchScrolling: false,
    });

    // Ensure both fabric canvases (lower + upper) are transparent
    const lowerCanvas = this.canvas.lowerCanvasEl;
    const upperCanvas = this.canvas.upperCanvasEl;
    if (lowerCanvas) lowerCanvas.style.background = 'transparent';
    if (upperCanvas) upperCanvas.style.background = 'transparent';

    // FIX: Enable copy/paste by ensuring clipboard events reach fabric IText
    const wrapperEl = this.canvas.wrapperEl;
    if (wrapperEl) {
      wrapperEl.style.pointerEvents = 'auto';
    }

    const emitChange = () => {
      if (!this.canvas) return;
      this.onChangeCallback(this.canvas.toJSON());
    };

    this.canvas.on('object:added', emitChange);
    this.canvas.on('object:modified', emitChange);
    this.canvas.on('object:removed', emitChange);

    // Selection events for Properties Panel
    const emitSelection = () => this.emitSelectionChange();
    this.canvas.on('selection:created', emitSelection);
    this.canvas.on('selection:updated', emitSelection);
    this.canvas.on('selection:cleared', () => {
      if (this.onSelectionChangeCallback) this.onSelectionChangeCallback(null);
    });
  }

  onSelectionChange(cb: (props: SelectedObjectProps | null) => void): void {
    this.onSelectionChangeCallback = cb;
  }

  private emitSelectionChange(): void {
    if (!this.canvas || !this.onSelectionChangeCallback) return;
    const obj = this.canvas.getActiveObject();
    if (!obj) { this.onSelectionChangeCallback(null); return; }

    const isText = obj instanceof fabric.IText || obj instanceof fabric.Textbox;
    const props: SelectedObjectProps = {
      type: isText ? 'text' : obj instanceof fabric.Group ? 'group' : obj instanceof fabric.Path ? 'freehand' : 'shape',
      fill: typeof obj.fill === 'string' ? obj.fill : undefined,
      stroke: typeof obj.stroke === 'string' ? obj.stroke : undefined,
      strokeWidth: obj.strokeWidth ?? undefined,
      opacity: obj.opacity ?? 1,
    };
    if (isText) {
      const t = obj as fabric.IText;
      props.fontSize = t.fontSize ?? undefined;
      props.fontFamily = t.fontFamily ?? undefined;
      props.fontWeight = t.fontWeight?.toString() ?? undefined;
      props.fontStyle = t.fontStyle ?? undefined;
      props.underline = t.underline ?? false;
      props.linethrough = t.linethrough ?? false;
    }
    this.onSelectionChangeCallback(props);
  }

  updateSelectedObject(updates: Partial<SelectedObjectProps>): void {
    if (!this.canvas) return;
    const obj = this.canvas.getActiveObject();
    if (!obj) return;

    if (updates.fill !== undefined) obj.set({ fill: updates.fill });
    if (updates.stroke !== undefined) obj.set({ stroke: updates.stroke });
    if (updates.strokeWidth !== undefined) obj.set({ strokeWidth: updates.strokeWidth });
    if (updates.opacity !== undefined) obj.set({ opacity: updates.opacity });

    if (obj instanceof fabric.IText || obj instanceof fabric.Textbox) {
      if (updates.fontSize !== undefined) obj.set({ fontSize: updates.fontSize });
      if (updates.fontFamily !== undefined) obj.set({ fontFamily: updates.fontFamily });
      if (updates.fontWeight !== undefined) obj.set({ fontWeight: updates.fontWeight });
      if (updates.fontStyle !== undefined) obj.set({ fontStyle: updates.fontStyle as '' | 'italic' | 'normal' | 'oblique' });
      if (updates.underline !== undefined) obj.set({ underline: updates.underline });
      if (updates.linethrough !== undefined) obj.set({ linethrough: updates.linethrough });
    }

    this.canvas.renderAll();
    this.onChangeCallback(this.canvas.toJSON());
    // Re-emit selection to update panel
    this.emitSelectionChange();
  }

  setTool(tool: AnnotationTool, options: ToolOptions = {}): void {
    if (!this.canvas) return;

    // Clean up previous tool listeners
    this.cleanupListeners.forEach((fn) => fn());
    this.cleanupListeners = [];
    this.canvas.isDrawingMode = false;
    this.canvas.selection = false;
    this.canvas.defaultCursor = 'default';
    this.canvas.forEachObject((obj) => {
      obj.selectable = tool === 'select';
      obj.evented = tool === 'select' || tool === 'eraser';
    });

    switch (tool) {
      case 'pan':
        // Pointer-events are disabled via CSS on the container (AnnotationLayer).
        // Nothing to set up on the Fabric side — canvas is fully transparent to events.
        this.canvas.defaultCursor = 'default';
        break;

      case 'select':
        this.canvas.selection = true;
        this.canvas.defaultCursor = 'default';
        this.setupSelectEditOnClick();
        break;

      case 'freehand':
        this.setupFreehand(options);
        break;

      case 'text':
        this.setupTextTool(options);
        break;


      case 'underline':
        this.setupLineDraw(options.color ?? '#FF0000', options.strokeWidth ?? 2, options.opacity ?? 1);
        break;

      case 'rectangle':
        this.setupRectangleDraw(
          'transparent',
          options.opacity ?? 1,
          options.strokeWidth ?? 2,
          options.color ?? '#FF0000'
        );
        break;

      case 'circle':
        this.setupCircleDraw(
          'transparent',
          options.opacity ?? 1,
          options.strokeWidth ?? 2,
          options.color ?? '#FF0000'
        );
        break;

      case 'eraser':
        this.canvas.defaultCursor = 'pointer';
        this.setupEraserTool();
        break;

      case 'arrow':
        this.setupArrowDraw(options);
        break;

      case 'stamp':
        this.setupStampTool(options);
        break;

      case 'signature':
        if (options.signatureDataURL) {
          this.setupSignaturePlacementTool(options.signatureDataURL, options.opacity ?? 1);
        }
        break;

      case 'image':
        this.setupImageTool();
        break;

      case 'redact':
        this.setupRedactTool();
        break;

      case 'comment':
        this.setupCommentTool();
        break;
    }
  }

  // In select mode, single-click on an IText enters editing mode immediately
  // (like Adobe Acrobat — no double-click needed).
  // If clicking on empty canvas, check for PDF text spans below and create
  // an editable overlay (preventing duplicates).
  private setupSelectEditOnClick(): void {
    if (!this.canvas) return;

    const handler = (e: fabric.TEvent & { target?: fabric.FabricObject }) => {
      if (!this.canvas) return;
      const target = e.target;

      // If clicked on an existing fabric IText, enter editing immediately
      if (target && target instanceof fabric.IText && !target.isEditing) {
        this.canvas.setActiveObject(target);
        target.enterEditing();
        const mouseEvent = e.e as MouseEvent;
        target.setCursorByClick(mouseEvent);
        return;
      }

      // If clicked on another fabric object, do nothing special
      if (target) return;

      // Clicked on empty canvas — check for PDF text spans below
      const mouseEvent = e.e as MouseEvent;
      const canvasEl = this.canvas.upperCanvasEl;
      if (!canvasEl) return;

      // Temporarily hide canvas to peek at elements below
      const prevPointerEvents = canvasEl.style.pointerEvents;
      canvasEl.style.pointerEvents = 'none';
      // Also hide the lower canvas
      const lowerCanvas = this.canvas.lowerCanvasEl;
      const prevLowerPointerEvents = lowerCanvas?.style.pointerEvents ?? '';
      if (lowerCanvas) lowerCanvas.style.pointerEvents = 'none';

      const elementBelow = document.elementFromPoint(mouseEvent.clientX, mouseEvent.clientY);

      canvasEl.style.pointerEvents = prevPointerEvents;
      if (lowerCanvas) lowerCanvas.style.pointerEvents = prevLowerPointerEvents;

      // Check if the element below is a text span in the textLayer
      if (
        elementBelow &&
        elementBelow.tagName === 'SPAN' &&
        elementBelow.closest('.textLayer')
      ) {
        const span = elementBelow as HTMLElement;
        const textContent = span.textContent ?? '';
        if (!textContent.trim()) return;

        const container = span.closest('.textLayer') as HTMLElement;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const spanRect = span.getBoundingClientRect();

        const x = spanRect.left - containerRect.left;
        const y = spanRect.top - containerRect.top;
        const width = spanRect.width;
        const height = spanRect.height;

        // Check if there's already a fabric IText at this position (prevent duplicates)
        const existingAtPos = this.canvas.getObjects().find((obj) => {
          if (!(obj instanceof fabric.IText)) return false;
          const objLeft = obj.left ?? 0;
          const objTop = obj.top ?? 0;
          return (
            Math.abs(objLeft - x) < 5 &&
            Math.abs(objTop - y) < 5
          );
        });

        if (existingAtPos && existingAtPos instanceof fabric.IText) {
          // Edit the existing one instead of creating a duplicate
          this.canvas.setActiveObject(existingAtPos);
          existingAtPos.enterEditing();
          existingAtPos.setCursorByClick(mouseEvent);
          return;
        }

        const computedStyle = window.getComputedStyle(span);
        const fontSize = parseFloat(computedStyle.fontSize) || 12;

        this.addEditableTextAt(x, y, textContent, fontSize, '#000000', width, height);

        // Hide the original span so it doesn't show through
        span.style.display = 'none';
      }
    };

    this.canvas.on('mouse:down', handler);
    this.cleanupListeners.push(() => this.canvas?.off('mouse:down', handler));
  }

  // FIX #4: Properly set up freehand drawing with a new brush instance
  private setupFreehand(options: ToolOptions): void {
    if (!this.canvas) return;
    this.canvas.isDrawingMode = true;
    // Create a fresh pencil brush to ensure it works
    const brush = new fabric.PencilBrush(this.canvas);
    brush.color = options.color ?? '#000000';
    brush.width = options.strokeWidth ?? 2;
    this.canvas.freeDrawingBrush = brush;
    // Apply opacity after each path is created
    const applyOpacity = (e: { path: fabric.FabricObject }) => {
      e.path.set({ opacity: options.opacity ?? 1 });
      this.canvas?.renderAll();
    };
    this.canvas.on('path:created', applyOpacity);
    this.cleanupListeners.push(() => this.canvas?.off('path:created', applyOpacity));
  }

  // FIX #1: Text tool - select all placeholder text so typing replaces it
  private setupTextTool(options: ToolOptions): void {
    if (!this.canvas) return;
    this.canvas.defaultCursor = 'text';

    const handler = (e: fabric.TEvent) => {
      if (!this.canvas) return;
      // Don't create new text if clicking on existing object
      if ((e as fabric.TEvent & { target?: fabric.FabricObject }).target) return;
      // Read font options from store at click-time so PropertiesPanel changes are
      // inherited by the next textbox without needing to re-invoke setTool().
      const s = useUIStore.getState();
      const pointer = this.canvas.getScenePoint(e.e as MouseEvent);
      const text = new fabric.IText('', {
        left: pointer.x,
        top: pointer.y,
        fontSize: s.activeFontSize ?? options.fontSize ?? 16,
        fill: s.activeColor ?? options.color ?? '#000000',
        fontFamily: s.activeFontFamily ?? options.fontFamily ?? 'Arial',
        fontWeight: (s.activeFontBold ?? options.fontBold) ? 'bold' : 'normal',
        fontStyle: (s.activeFontItalic ?? options.fontItalic) ? 'italic' : 'normal',
        underline: s.activeFontUnderline ?? options.fontUnderline ?? false,
        linethrough: s.activeFontStrikethrough ?? options.fontStrikethrough ?? false,
        opacity: s.activeOpacity ?? options.opacity ?? 1,
        editable: true,
      });
      this.canvas.add(text);
      this.canvas.setActiveObject(text);
      text.enterEditing();
    };

    this.canvas.on('mouse:down', handler);
    this.cleanupListeners.push(() => this.canvas?.off('mouse:down', handler));
  }

  // FIX #3: Rectangle draw uses proper fill with transparency
  private setupRectangleDraw(
    fill: string,
    opacity: number,
    strokeWidth: number,
    stroke?: string
  ): void {
    if (!this.canvas) return;
    this.canvas.defaultCursor = 'crosshair';

    let isDown = false;
    let startX = 0;
    let startY = 0;
    let rect: fabric.Rect | null = null;

    const onDown = (o: fabric.TEvent) => {
      if ((o as fabric.TEvent & { target?: fabric.FabricObject }).target) return; // Don't draw over existing objects
      isDown = true;
      const pointer = this.canvas!.getScenePoint(o.e as MouseEvent);
      startX = pointer.x;
      startY = pointer.y;
      rect = new fabric.Rect({
        left: startX,
        top: startY,
        width: 0,
        height: 0,
        fill: fill === 'transparent' ? 'transparent' : fill,
        opacity,
        strokeWidth,
        stroke: stroke ?? (fill === 'transparent' ? 'transparent' : fill),
        selectable: false,
        evented: false,
      });
      this.canvas!.add(rect);
    };

    const onMove = (o: fabric.TEvent) => {
      if (!isDown || !rect) return;
      const pointer = this.canvas!.getScenePoint(o.e as MouseEvent);
      rect.set({
        width: Math.abs(pointer.x - startX),
        height: Math.abs(pointer.y - startY),
        left: Math.min(pointer.x, startX),
        top: Math.min(pointer.y, startY),
      });
      this.canvas!.renderAll();
    };

    const onUp = () => {
      if (rect) {
        // Remove if too small (accidental click)
        if ((rect.width ?? 0) < 3 && (rect.height ?? 0) < 3) {
          this.canvas!.remove(rect);
        } else {
          rect.set({ selectable: true, evented: true });
          rect.setCoords();
          this.canvas!.setActiveObject(rect);
          useUIStore.getState().setTool('select');
        }
      }
      isDown = false;
      rect = null;
    };

    this.canvas.on('mouse:down', onDown);
    this.canvas.on('mouse:move', onMove);
    this.canvas.on('mouse:up', onUp);

    this.cleanupListeners.push(() => {
      this.canvas?.off('mouse:down', onDown);
      this.canvas?.off('mouse:move', onMove);
      this.canvas?.off('mouse:up', onUp);
    });
  }

  private setupCircleDraw(
    fill: string,
    opacity: number,
    strokeWidth: number,
    stroke: string
  ): void {
    if (!this.canvas) return;
    this.canvas.defaultCursor = 'crosshair';

    let isDown = false;
    let startX = 0;
    let startY = 0;
    let ellipse: fabric.Ellipse | null = null;

    const onDown = (o: fabric.TEvent) => {
      if ((o as fabric.TEvent & { target?: fabric.FabricObject }).target) return;
      isDown = true;
      const pointer = this.canvas!.getScenePoint(o.e as MouseEvent);
      startX = pointer.x;
      startY = pointer.y;
      // Use center origin so left/top always refer to the center of the ellipse,
      // preventing the reversed-position bug when dragging in any direction.
      ellipse = new fabric.Ellipse({
        left: startX,
        top: startY,
        originX: 'center',
        originY: 'center',
        rx: 0,
        ry: 0,
        fill,
        opacity,
        strokeWidth,
        stroke,
        selectable: false,
        evented: false,
      });
      this.canvas!.add(ellipse);
    };

    const onMove = (o: fabric.TEvent) => {
      if (!isDown || !ellipse) return;
      const pointer = this.canvas!.getScenePoint(o.e as MouseEvent);
      const rx = Math.abs(pointer.x - startX) / 2;
      const ry = Math.abs(pointer.y - startY) / 2;
      const centerX = (startX + pointer.x) / 2;
      const centerY = (startY + pointer.y) / 2;
      ellipse.set({ rx, ry, left: centerX, top: centerY });
      this.canvas!.renderAll();
    };

    const onUp = () => {
      if (ellipse) {
        if ((ellipse.rx ?? 0) < 2 && (ellipse.ry ?? 0) < 2) {
          this.canvas!.remove(ellipse);
        } else {
          ellipse.set({ selectable: true, evented: true });
          ellipse.setCoords();
          this.canvas!.setActiveObject(ellipse);
          useUIStore.getState().setTool('select');
        }
      }
      isDown = false;
      ellipse = null;
    };

    this.canvas.on('mouse:down', onDown);
    this.canvas.on('mouse:move', onMove);
    this.canvas.on('mouse:up', onUp);

    this.cleanupListeners.push(() => {
      this.canvas?.off('mouse:down', onDown);
      this.canvas?.off('mouse:move', onMove);
      this.canvas?.off('mouse:up', onUp);
    });
  }

  private setupLineDraw(color: string, strokeWidth: number, opacity = 1): void {
    if (!this.canvas) return;
    this.canvas.defaultCursor = 'crosshair';

    let isDown = false;
    let line: fabric.Line | null = null;

    const onDown = (o: fabric.TEvent) => {
      if ((o as fabric.TEvent & { target?: fabric.FabricObject }).target) return;
      isDown = true;
      const pointer = this.canvas!.getScenePoint(o.e as MouseEvent);
      line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
        stroke: color,
        strokeWidth,
        opacity,
        selectable: false,
        evented: false,
      });
      this.canvas!.add(line);
    };

    const onMove = (o: fabric.TEvent) => {
      if (!isDown || !line) return;
      const pointer = this.canvas!.getScenePoint(o.e as MouseEvent);
      line.set({ x2: pointer.x, y2: pointer.y });
      this.canvas!.renderAll();
    };

    const onUp = () => {
      if (line) line.set({ selectable: true, evented: true });
      isDown = false;
      line = null;
    };

    this.canvas.on('mouse:down', onDown);
    this.canvas.on('mouse:move', onMove);
    this.canvas.on('mouse:up', onUp);

    this.cleanupListeners.push(() => {
      this.canvas?.off('mouse:down', onDown);
      this.canvas?.off('mouse:move', onMove);
      this.canvas?.off('mouse:up', onUp);
    });
  }

  private setupArrowDraw(options: ToolOptions): void {
    if (!this.canvas) return;
    this.canvas.defaultCursor = 'crosshair';

    let isDown = false;
    let startX = 0;
    let startY = 0;
    let line: fabric.Line | null = null;

    const onDown = (o: fabric.TEvent) => {
      if ((o as fabric.TEvent & { target?: fabric.FabricObject }).target) return;
      isDown = true;
      const pointer = this.canvas!.getScenePoint(o.e as MouseEvent);
      startX = pointer.x;
      startY = pointer.y;
      line = new fabric.Line([startX, startY, startX, startY], {
        stroke: options.color ?? '#FF0000',
        strokeWidth: options.strokeWidth ?? 2,
        selectable: false,
        evented: false,
      });
      this.canvas!.add(line);
    };

    const onMove = (o: fabric.TEvent) => {
      if (!isDown || !line) return;
      const pointer = this.canvas!.getScenePoint(o.e as MouseEvent);
      line.set({ x2: pointer.x, y2: pointer.y });
      this.canvas!.renderAll();
    };

    const onUp = (o: fabric.TEvent) => {
      if (!isDown || !line) return;
      isDown = false;
      const pointer = this.canvas!.getScenePoint(o.e as MouseEvent);
      const endX = pointer.x;
      const endY = pointer.y;

      // Remove the temporary line
      this.canvas!.remove(line);
      line = null;

      const dx = endX - startX;
      const dy = endY - startY;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 5) return; // too small

      // Create arrow line
      const arrowLine = new fabric.Line([startX, startY, endX, endY], {
        stroke: options.color ?? '#FF0000',
        strokeWidth: options.strokeWidth ?? 2,
        selectable: false,
        evented: false,
      });

      // Create arrowhead triangle
      const headSize = Math.max(10, (options.strokeWidth ?? 2) * 4);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      const triangle = new fabric.Triangle({
        left: endX,
        top: endY,
        width: headSize,
        height: headSize,
        fill: options.color ?? '#FF0000',
        angle,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });

      const group = new fabric.Group([arrowLine, triangle], {
        selectable: true,
        evented: true,
        opacity: options.opacity ?? 1,
      });
      (group as unknown as Record<string, unknown>).data = { type: 'arrow' };
      this.canvas!.add(group);
    };

    this.canvas.on('mouse:down', onDown);
    this.canvas.on('mouse:move', onMove);
    this.canvas.on('mouse:up', onUp);

    this.cleanupListeners.push(() => {
      this.canvas?.off('mouse:down', onDown);
      this.canvas?.off('mouse:move', onMove);
      this.canvas?.off('mouse:up', onUp);
    });
  }

  private static readonly STAMP_COLORS: Record<string, string> = {
    APPROVED: '#16a34a',
    REJECTED: '#dc2626',
    DRAFT: '#ca8a04',
    CONFIDENTIAL: '#dc2626',
    'FOR REVIEW': '#2563eb',
    VOID: '#dc2626',
  };

  private setupStampTool(options: ToolOptions): void {
    if (!this.canvas) return;
    this.canvas.defaultCursor = 'crosshair';

    const handler = (e: fabric.TEvent) => {
      if (!this.canvas) return;
      if ((e as fabric.TEvent & { target?: fabric.FabricObject }).target) return;
      const pointer = this.canvas.getScenePoint(e.e as MouseEvent);

      const label = options.stampLabel ?? 'APPROVED';
      const color = AnnotationManager.STAMP_COLORS[label] ?? '#dc2626';

      const text = new fabric.Text(label, {
        fontSize: 24,
        fill: color,
        fontFamily: 'Arial',
        fontWeight: 'bold',
      });

      const padding = 12;
      const tw = text.width ?? 100;
      const th = text.height ?? 30;

      const border = new fabric.Rect({
        width: tw + padding * 2,
        height: th + padding * 2,
        fill: 'transparent',
        stroke: color,
        strokeWidth: 3,
        rx: 4,
        ry: 4,
      });

      const group = new fabric.Group([border, text], {
        left: pointer.x,
        top: pointer.y,
        opacity: options.opacity ?? 1,
      });
      (group as unknown as Record<string, unknown>).data = { type: 'stamp' };

      this.canvas.add(group);
      this.canvas.setActiveObject(group);
    };

    this.canvas.on('mouse:down', handler);
    this.cleanupListeners.push(() => this.canvas?.off('mouse:down', handler));
  }

  // FIX #5: Eraser deletes on click, stores deleted items for undo
  private setupEraserTool(): void {
    if (!this.canvas) return;
    this.canvas.defaultCursor = 'pointer';

    // Make all objects respond to clicks but show pointer cursor.
    // setCoords() ensures hit-testing bounding boxes are up-to-date.
    this.canvas.forEachObject((obj) => {
      obj.selectable = false;
      obj.evented = true;
      obj.hoverCursor = 'pointer';
      obj.setCoords();
    });

    const handler = (e: fabric.TEvent) => {
      const target = (e as fabric.TEvent & { target?: fabric.FabricObject }).target;
      if (target && this.canvas) {
        // Don't erase comment highlight rects — they're managed by the comment system
        const data = (target as unknown as Record<string, unknown>).data as { type?: string } | undefined;
        if (data?.type === 'comment-highlight') return;
        // Store for undo
        this.deletedStack.push(target);
        this.canvas.remove(target);
        this.canvas.renderAll();
      }
    };

    this.canvas.on('mouse:down', handler);
    this.cleanupListeners.push(() => this.canvas?.off('mouse:down', handler));
  }

  /** Redact tool: draw a white-filled rectangle to cover/hide content. */
  private setupRedactTool(): void {
    if (!this.canvas) return;
    this.canvas.defaultCursor = 'crosshair';

    let isDown = false;
    let startX = 0;
    let startY = 0;
    let rect: fabric.Rect | null = null;

    const onDown = (o: fabric.TEvent) => {
      if ((o as fabric.TEvent & { target?: fabric.FabricObject }).target) return;
      isDown = true;
      const pointer = this.canvas!.getScenePoint(o.e as MouseEvent);
      startX = pointer.x;
      startY = pointer.y;
      rect = new fabric.Rect({
        left: startX,
        top: startY,
        width: 0,
        height: 0,
        fill: '#ffffff',
        stroke: '#d4d4d8',
        strokeWidth: 1,
        selectable: false,
        evented: false,
      });
      this.canvas!.add(rect);
    };

    const onMove = (o: fabric.TEvent) => {
      if (!isDown || !rect) return;
      const pointer = this.canvas!.getScenePoint(o.e as MouseEvent);
      rect.set({
        width: Math.abs(pointer.x - startX),
        height: Math.abs(pointer.y - startY),
        left: Math.min(pointer.x, startX),
        top: Math.min(pointer.y, startY),
      });
      this.canvas!.renderAll();
    };

    const onUp = () => {
      if (rect) {
        if ((rect.width ?? 0) < 3 && (rect.height ?? 0) < 3) {
          this.canvas!.remove(rect);
        } else {
          rect.set({ selectable: true, evented: true });
          rect.setCoords();
          this.canvas!.setActiveObject(rect);
          useUIStore.getState().setTool('select');
        }
      }
      isDown = false;
      rect = null;
    };

    this.canvas.on('mouse:down', onDown);
    this.canvas.on('mouse:move', onMove);
    this.canvas.on('mouse:up', onUp);

    this.cleanupListeners.push(() => {
      this.canvas?.off('mouse:down', onDown);
      this.canvas?.off('mouse:move', onMove);
      this.canvas?.off('mouse:up', onUp);
    });
  }

  private setupCommentTool(): void {
    if (!this.canvas) return;
    this.canvas.defaultCursor = 'crosshair';

    let isDown = false;
    let startX = 0;
    let startY = 0;

    const onDown = (o: fabric.TEvent) => {
      if ((o as fabric.TEvent & { target?: fabric.FabricObject }).target) return;
      isDown = true;
      const pointer = this.canvas!.getScenePoint(o.e as MouseEvent);
      startX = pointer.x;
      startY = pointer.y;
    };

    const onUp = (o: fabric.TEvent) => {
      if (!isDown) return;
      isDown = false;
      const pointer = this.canvas!.getScenePoint(o.e as MouseEvent);
      const dx = Math.abs(pointer.x - startX);
      const dy = Math.abs(pointer.y - startY);

      // Only place a comment on a clean click (ignore accidental micro-drags)
      if (dx < 8 && dy < 8) {
        const commentId = crypto.randomUUID();

        // Draw a small yellow highlight at the click point so the comment is visually anchored
        const hlRect = new fabric.Rect({
          left: startX - 10,
          top: startY - 6,
          width: 20,
          height: 12,
          fill: 'rgba(255, 220, 0, 0.5)',
          stroke: 'rgba(200, 160, 0, 0.6)',
          strokeWidth: 1,
          selectable: false,
          evented: false,
        });
        (hlRect as unknown as Record<string, unknown>)._commentId = commentId;
        (hlRect as unknown as Record<string, unknown>).data = { type: 'comment-highlight' };
        this.canvas!.add(hlRect);
        this.canvas!.renderAll();

        // Convert from canvas-pixel coords (zoomed) to natural (unscaled) coords
        // so repositioning works correctly when zoom changes.
        const zoom = useUIStore.getState().zoom;
        const bounds = { x: startX / zoom, y: startY / zoom, width: 0, height: 0 };
        if (this.onCommentHighlightCreated) {
          this.onCommentHighlightCreated({ commentId, bounds, fabricObjectId: commentId });
        }
      }
    };

    this.canvas.on('mouse:down', onDown);
    this.canvas.on('mouse:up', onUp);

    this.cleanupListeners.push(() => {
      this.canvas?.off('mouse:down', onDown);
      this.canvas?.off('mouse:up', onUp);
    });
  }

  removeCommentHighlight(commentId: string): void {
    if (!this.canvas) return;
    const target = this.canvas.getObjects().find((obj) => {
      const d = (obj as unknown as Record<string, unknown>)._commentId;
      return d === commentId;
    });
    if (target) {
      this.canvas.remove(target);
      this.canvas.renderAll();
    }
  }

  // FIX #5: Undo last eraser deletion
  undoLastDelete(): boolean {
    if (!this.canvas || this.deletedStack.length === 0) return false;
    const lastDeleted = this.deletedStack.pop()!;
    this.canvas.add(lastDeleted);
    this.canvas.renderAll();
    return true;
  }

  private setupSignaturePlacementTool(dataURL: string, opacity: number): void {
    if (!this.canvas) return;
    this.canvas.defaultCursor = 'crosshair';

    const handler = (e: fabric.TEvent) => {
      if (!this.canvas) return;
      if ((e as fabric.TEvent & { target?: fabric.FabricObject }).target) return;
      const pointer = this.canvas.getScenePoint(e.e as MouseEvent);

      fabric.FabricImage.fromURL(dataURL).then((img) => {
        if (!this.canvas) return;
        img.set({ left: pointer.x, top: pointer.y, scaleX: 0.5, scaleY: 0.5, opacity });
        this.canvas.add(img);
        this.canvas.setActiveObject(img);
        this.canvas.renderAll();
        // Switch back to select after placing once
        useUIStore.getState().setPendingSignatureDataURL(null);
        useUIStore.getState().setTool('select');
      });
    };

    this.canvas.on('mouse:down', handler);
    this.cleanupListeners.push(() => this.canvas?.off('mouse:down', handler));
  }

  private setupImageTool(): void {
    if (!this.canvas) return;
    this.canvas.defaultCursor = 'crosshair';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !this.canvas) return;
      const url = URL.createObjectURL(file);
      try {
        const img = await fabric.FabricImage.fromURL(url);
        const maxW = this.currentWidth * 0.6;
        if ((img.width ?? 0) > maxW) img.scale(maxW / (img.width ?? maxW));
        img.set({ left: 50, top: 50 });
        this.canvas.add(img);
        this.canvas.setActiveObject(img);
        this.canvas.renderAll();
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    input.click();
  }

  addSignatureImage(dataURL: string, x: number, y: number): void {
    if (!this.canvas) return;
    fabric.FabricImage.fromURL(dataURL).then((img) => {
      img.set({
        left: x,
        top: y,
        scaleX: 0.5,
        scaleY: 0.5,
      });
      this.canvas!.add(img);
      this.canvas!.setActiveObject(img);
      this.canvas!.renderAll();
    });
  }

  // Add editable text overlay on existing PDF text positions
  addEditableTextAt(
    x: number,
    y: number,
    existingText: string,
    fontSize: number = 12,
    color: string = '#000000',
    width?: number,
    height?: number
  ): void {
    if (!this.canvas) return;

    // First add a white rectangle to cover the original PDF text
    if (width && height) {
      const cover = new fabric.Rect({
        left: x - 1,
        top: y - 1,
        width: width + 2,
        height: height + 2,
        fill: '#FFFFFF',
        selectable: false,
        evented: false,
        data: { type: 'text-cover' },
      });
      this.canvas.add(cover);
    }

    // Then add the editable text on top
    const text = new fabric.IText(existingText, {
      left: x,
      top: y,
      fontSize,
      fill: color,
      fontFamily: 'Arial',
      editable: true,
      padding: 2,
    });
    this.canvas.add(text);
    this.canvas.setActiveObject(text);
    text.enterEditing();
    // Select all text so user can immediately type to replace
    text.selectAll();
  }

  async loadFromJSON(json: object): Promise<void> {
    if (!this.canvas) return;
    // Guard: only load if JSON has expected Fabric.js shape
    if (
      !json ||
      typeof json !== 'object' ||
      !('objects' in json) ||
      !Array.isArray((json as { objects: unknown }).objects)
    ) return;
    await this.canvas.loadFromJSON(json);
    this.canvas.renderAll();
  }

  /** Merge new raw fabric-compatible objects into the canvas without clearing existing objects. */
  async addRawObjects(objects: object[]): Promise<void> {
    if (!this.canvas) return;
    const current = this.canvas.toJSON() as { version: string; objects: object[] };
    const merged = { ...current, objects: [...(current.objects ?? []), ...objects] };
    await this.canvas.loadFromJSON(merged);
    this.canvas.renderAll();
    this.onChangeCallback(this.canvas.toJSON());
  }

  toJSON(): object | null {
    return this.canvas ? this.canvas.toJSON() : null;
  }

  /**
   * Headless extraction: load a saved Fabric JSON into an off-screen canvas,
   * extract text and non-text PNG, then immediately discard the canvas.
   * Used during save for pages that have been scrolled away (no live manager).
   */
  static async extractFromJSON(
    json: object,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<{
    textAnnotations: Array<{
      text: string; x: number; y: number;
      fontSize: number; fontFamily: string;
      color: string; width: number; height: number;
    }>;
    nonTextDataURL: string;
  }> {
    const el = document.createElement('canvas');
    const mgr = new AnnotationManager(() => {});
    mgr.initialize(el, canvasWidth, canvasHeight);
    await mgr.loadFromJSON(json);
    const result = {
      textAnnotations: mgr.extractTextAnnotations(),
      nonTextDataURL: mgr.exportNonTextToPNG(),
    };
    mgr.destroy();
    return result;
  }

  getDimensions(): { width: number; height: number } {
    return {
      width: this.canvas?.width ?? 1,
      height: this.canvas?.height ?? 1,
    };
  }

  // Extract text objects as structured data for vector embedding in PDF
  extractTextAnnotations(): Array<{
    text: string;
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    color: string;
    width: number;
    height: number;
  }> {
    if (!this.canvas) return [];
    const results: Array<{
      text: string;
      x: number;
      y: number;
      fontSize: number;
      fontFamily: string;
      color: string;
      width: number;
      height: number;
    }> = [];

    this.canvas.forEachObject((obj) => {
      if (obj instanceof fabric.IText || obj instanceof fabric.Text) {
        const text = obj.text || '';
        if (!text.trim()) return;
        results.push({
          text,
          x: obj.left ?? 0,
          y: obj.top ?? 0,
          // Multiply by scaleY so user-resized text objects export the correct font size
          fontSize: (obj.fontSize ?? 16) * (obj.scaleY ?? 1),
          fontFamily: obj.fontFamily ?? 'Arial',
          color: (obj.fill as string) ?? '#000000',
          width: obj.getScaledWidth(),
          height: obj.getScaledHeight(),
        });
      }
    });

    return results;
  }

  // Export all annotation objects (text + shapes) as PNG at high res.
  // Text is rasterized here to guarantee pixel-perfect positioning matching what
  // the user sees on screen, avoiding the lossy canvas→PDF coordinate conversion
  // that caused text to shift after saving.
  exportNonTextToPNG(): string {
    if (!this.canvas) return '';
    if (this.canvas.getObjects().length === 0) return '';
    return this.canvas.toDataURL({ format: 'png', multiplier: 3 });
  }

  // Legacy: export everything as PNG (kept for backward compat)
  exportToPNG(): string {
    if (!this.canvas) return '';
    if (this.canvas.getObjects().length === 0) return '';
    return this.canvas.toDataURL({ format: 'png', multiplier: 1 });
  }

  resize(width: number, height: number): void {
    if (!this.canvas) return;
    const sx = width / this.currentWidth;
    const sy = height / this.currentHeight;
    if (sx === 1 && sy === 1) return;

    // Scale every object proportionally so coordinates stay correct at the new zoom
    this.canvas.forEachObject((obj) => {
      obj.set({ left: (obj.left ?? 0) * sx, top: (obj.top ?? 0) * sy });

      if (obj instanceof fabric.IText || obj instanceof fabric.Textbox) {
        // Text: scale font size and explicit box dimensions
        obj.set({
          fontSize: (obj.fontSize ?? 16) * sx,
          width: (obj.width ?? 0) * sx,
          height: (obj.height ?? 0) * sy,
        });
      } else {
        // Shapes/paths: scale via scaleX/scaleY multipliers
        obj.set({
          scaleX: (obj.scaleX ?? 1) * sx,
          scaleY: (obj.scaleY ?? 1) * sy,
        });
      }
      obj.setCoords();
    });

    this.currentWidth = width;
    this.currentHeight = height;
    this.canvas.setDimensions({ width, height });
    this.canvas.renderAll();
    // Use save-only callback so zoom resize does NOT push to undo history.
    // Falls back to onChangeCallback if no save-only callback is registered.
    const json = this.canvas.toJSON();
    if (this.onSaveOnlyCallback) {
      this.onSaveOnlyCallback(json);
    } else {
      this.onChangeCallback(json);
    }
  }

  deleteSelected(): void {
    if (!this.canvas) return;
    const active = this.canvas.getActiveObjects();
    active.forEach((obj) => {
      this.deletedStack.push(obj);
      this.canvas!.remove(obj);
    });
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  getCanvas(): fabric.Canvas | null {
    return this.canvas;
  }

  destroy(): void {
    this.cleanupListeners.forEach((fn) => fn());
    this.cleanupListeners = [];
    this.deletedStack = [];
    this.canvas?.dispose();
    this.canvas = null;
  }
}
