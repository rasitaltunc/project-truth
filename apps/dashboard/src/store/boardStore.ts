// ═══════════════════════════════════════════════════════════
// PROJECT TRUTH: INVESTIGATION BOARD STORE
// Sprint 8 — "Soruşturma Panosu"
// 2D Investigation Board state management
// Sürükle-bırak, zoom/pan, yapışkan notlar, undo/redo
// ═══════════════════════════════════════════════════════════

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export interface BoardNodePosition {
  x: number;
  y: number;
}

export interface StickyNote {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: 'yellow' | 'pink' | 'blue' | 'green';
  createdAt: number;
}

export interface MediaCard {
  id: string;
  x: number;
  y: number;
  type: 'image' | 'video' | 'pdf' | 'document';
  url: string;
  title: string;
  thumbnailUrl?: string;
  createdAt: number;
}

export interface BoardSnapshot {
  nodePositions: Record<string, BoardNodePosition>;
  stickyNotes: StickyNote[];
  mediaCards: MediaCard[];
  zoom: number;
  panX: number;
  panY: number;
}

type UndoAction =
  | { type: 'move_node'; nodeId: string; from: BoardNodePosition; to: BoardNodePosition }
  | { type: 'add_sticky'; stickyId: string; sticky: StickyNote }
  | { type: 'remove_sticky'; sticky: StickyNote }
  | { type: 'edit_sticky'; stickyId: string; oldText: string; newText: string }
  | { type: 'add_media'; mediaId: string; media: MediaCard }
  | { type: 'remove_media'; media: MediaCard }
  | { type: 'remove_node'; nodeId: string }
  | { type: 'batch'; actions: UndoAction[] };

interface BoardState {
  // ── Canvas State ──
  zoom: number;
  panX: number;
  panY: number;
  gridSnap: boolean;

  // ── Node Positions (board layout) ──
  nodePositions: Record<string, BoardNodePosition>;

  // ── Sticky Notes ──
  stickyNotes: StickyNote[];

  // ── Media Cards ──
  mediaCards: MediaCard[];

  // ── Selection ──
  selectedNodeId: string | null;
  selectedStickyId: string | null;
  selectedMediaId: string | null;
  isDragging: boolean;
  dragTargetId: string | null;
  dragTargetType: 'node' | 'sticky' | 'media' | null;

  // ── Undo/Redo ──
  undoStack: UndoAction[];
  redoStack: UndoAction[];

  // ── Board Mode ──
  isBoardMode: boolean;
  isTransitioning: boolean;

  // ── Actions: Canvas ──
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setPan: (x: number, y: number) => void;
  panBy: (dx: number, dy: number) => void;
  toggleGridSnap: () => void;
  resetView: () => void;

  // ── Actions: Node Positions ──
  setNodePosition: (nodeId: string, pos: BoardNodePosition) => void;
  moveNode: (nodeId: string, from: BoardNodePosition, to: BoardNodePosition) => void;
  initializePositions: (nodes: Array<{ id: string; tier?: number | string }>, force?: boolean) => void;

  // ── Actions: Sticky Notes ──
  addStickyNote: (x: number, y: number, color?: StickyNote['color']) => string;
  updateStickyText: (id: string, text: string) => void;
  moveStickyNote: (id: string, x: number, y: number) => void;
  removeStickyNote: (id: string) => void;

  // ── Actions: Media Cards ──
  addMediaCard: (x: number, y: number, type: MediaCard['type'], url: string, title: string) => string;
  moveMediaCard: (id: string, x: number, y: number) => void;
  removeMediaCard: (id: string) => void;

  // ── Actions: Node Removal (from board only, not DB) ──
  removeNodeFromBoard: (nodeId: string) => void;

  // ── Actions: Selection ──
  selectNode: (id: string | null) => void;
  selectSticky: (id: string | null) => void;
  selectMedia: (id: string | null) => void;
  clearSelection: () => void;
  startDrag: (id: string, type: 'node' | 'sticky' | 'media') => void;
  endDrag: () => void;

  // ── Actions: Undo/Redo ──
  undo: () => void;
  redo: () => void;
  pushUndo: (action: UndoAction) => void;

  // ── Actions: Board Mode ──
  enterBoardMode: () => void;
  exitBoardMode: () => void;

  // ── Actions: Persistence ──
  getSnapshot: () => BoardSnapshot;
  loadSnapshot: (snapshot: BoardSnapshot) => void;
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

const GRID_SIZE = 20;
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.15;
const MAX_UNDO = 50;

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Radyal 2D layout: tier 0-1 merkezde, dış tier'lar halka halinde
function computeInitialLayout(
  nodes: Array<{ id: string; tier?: number | string }>
): Record<string, BoardNodePosition> {
  const positions: Record<string, BoardNodePosition> = {};

  // Merkez noktası — sayfanın mantıksal ortası
  const centerX = 800;
  const centerY = 600;

  // Group by tier
  const tierGroups: Record<number, string[]> = {};
  nodes.forEach(n => {
    const tier = typeof n.tier === 'string'
      ? parseInt(n.tier.replace(/\D/g, '')) || 3
      : (n.tier ?? 3);
    if (!tierGroups[tier]) tierGroups[tier] = [];
    tierGroups[tier].push(n.id);
  });

  const tiers = Object.keys(tierGroups).map(Number).sort();

  // Her tier için artan yarıçapta halka
  const BASE_RADIUS = 100;   // Tier 0-1 için küçük halka
  const RING_SPACING = 250;  // Halkalar arası mesafe
  const MIN_ARC_SPACING = 200; // Node'lar arası minimum yay mesafesi

  tiers.forEach((tier, tierIndex) => {
    const group = tierGroups[tier];

    if (group.length === 1 && tierIndex === 0) {
      // Tek merkez node (Epstein gibi)
      positions[group[0]] = { x: centerX, y: centerY };
      return;
    }

    // Halka yarıçapı: tier'a göre büyür
    const radius = BASE_RADIUS + tierIndex * RING_SPACING;

    // Minimum yarıçap: node'lar çakışmasın
    const minRadiusForSpacing = (group.length * MIN_ARC_SPACING) / (2 * Math.PI);
    const effectiveRadius = Math.max(radius, minRadiusForSpacing);

    // Node'ları halkaya eşit dağıt
    const angleStep = (2 * Math.PI) / group.length;
    // Üst tier için rastgele başlangıç açısı — monotonluk kırılsın
    const startAngle = -Math.PI / 2 + (tierIndex * 0.4);

    group.forEach((nodeId, i) => {
      const angle = startAngle + i * angleStep;
      // Hafif jitter — dümdüz daire olmasın
      const jitterR = (Math.random() - 0.5) * 40;
      const jitterA = (Math.random() - 0.5) * 0.15;

      positions[nodeId] = {
        x: centerX + (effectiveRadius + jitterR) * Math.cos(angle + jitterA),
        y: centerY + (effectiveRadius + jitterR) * Math.sin(angle + jitterA),
      };
    });
  });

  return positions;
}

// ═══════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════

export const useBoardStore = create<BoardState>()(
  devtools(
    persist(
      (set, get) => ({
        // ── Initial State ──
        zoom: 1,
        panX: 0,
        panY: 0,
        gridSnap: false,
        nodePositions: {},
        stickyNotes: [],
        mediaCards: [],
        selectedNodeId: null,
        selectedStickyId: null,
        selectedMediaId: null,
        isDragging: false,
        dragTargetId: null,
        dragTargetType: null,
        undoStack: [],
        redoStack: [],
        isBoardMode: false,
        isTransitioning: false,

        // ── Canvas Actions ──
        setZoom: (zoom) => set({ zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)) }),
        zoomIn: () => {
          const { zoom } = get();
          set({ zoom: Math.min(MAX_ZOOM, zoom + ZOOM_STEP) });
        },
        zoomOut: () => {
          const { zoom } = get();
          set({ zoom: Math.max(MIN_ZOOM, zoom - ZOOM_STEP) });
        },
        setPan: (x, y) => set({ panX: x, panY: y }),
        panBy: (dx, dy) => {
          const { panX, panY } = get();
          set({ panX: panX + dx, panY: panY + dy });
        },
        toggleGridSnap: () => set(s => ({ gridSnap: !s.gridSnap })),
        resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),

        // ── Node Position Actions ──
        setNodePosition: (nodeId, pos) => {
          const { gridSnap, nodePositions } = get();
          const finalPos = gridSnap
            ? { x: snapToGrid(pos.x), y: snapToGrid(pos.y) }
            : pos;
          set({ nodePositions: { ...nodePositions, [nodeId]: finalPos } });
        },

        moveNode: (nodeId, from, to) => {
          const { gridSnap, nodePositions } = get();
          const finalTo = gridSnap
            ? { x: snapToGrid(to.x), y: snapToGrid(to.y) }
            : to;
          set({ nodePositions: { ...nodePositions, [nodeId]: finalTo } });
          get().pushUndo({ type: 'move_node', nodeId, from, to: finalTo });
        },

        initializePositions: (nodes, force = false) => {
          const { nodePositions } = get();
          if (!force && Object.keys(nodePositions).length > 0) return;
          set({ nodePositions: computeInitialLayout(nodes) });
        },

        // ── Sticky Note Actions ──
        addStickyNote: (x, y, color = 'yellow') => {
          const id = generateId();
          const note: StickyNote = {
            id, x, y,
            width: 180, height: 140,
            text: '',
            color,
            createdAt: Date.now(),
          };
          set(s => ({ stickyNotes: [...s.stickyNotes, note] }));
          get().pushUndo({ type: 'add_sticky', stickyId: id, sticky: note });
          return id;
        },

        updateStickyText: (id, text) => {
          const { stickyNotes } = get();
          const note = stickyNotes.find(n => n.id === id);
          if (!note) return;
          const oldText = note.text;
          set({
            stickyNotes: stickyNotes.map(n =>
              n.id === id ? { ...n, text } : n
            ),
          });
          get().pushUndo({ type: 'edit_sticky', stickyId: id, oldText, newText: text });
        },

        moveStickyNote: (id, x, y) => {
          const { gridSnap, stickyNotes } = get();
          const finalX = gridSnap ? snapToGrid(x) : x;
          const finalY = gridSnap ? snapToGrid(y) : y;
          set({
            stickyNotes: stickyNotes.map(n =>
              n.id === id ? { ...n, x: finalX, y: finalY } : n
            ),
          });
        },

        removeStickyNote: (id) => {
          const { stickyNotes } = get();
          const note = stickyNotes.find(n => n.id === id);
          if (!note) return;
          set({ stickyNotes: stickyNotes.filter(n => n.id !== id) });
          get().pushUndo({ type: 'remove_sticky', sticky: note });
        },

        // ── Media Card Actions ──
        addMediaCard: (x, y, type, url, title) => {
          const id = generateId();
          const card: MediaCard = { id, x, y, type, url, title, createdAt: Date.now() };
          set(s => ({ mediaCards: [...s.mediaCards, card] }));
          get().pushUndo({ type: 'add_media', mediaId: id, media: card });
          return id;
        },

        moveMediaCard: (id, x, y) => {
          const { gridSnap, mediaCards } = get();
          const finalX = gridSnap ? snapToGrid(x) : x;
          const finalY = gridSnap ? snapToGrid(y) : y;
          set({
            mediaCards: mediaCards.map(c =>
              c.id === id ? { ...c, x: finalX, y: finalY } : c
            ),
          });
        },

        removeMediaCard: (id) => {
          const { mediaCards } = get();
          const card = mediaCards.find(c => c.id === id);
          if (!card) return;
          set({ mediaCards: mediaCards.filter(c => c.id !== id) });
          get().pushUndo({ type: 'remove_media', media: card });
        },

        // ── Node Removal (from board only) ──
        removeNodeFromBoard: (nodeId) => {
          const { nodePositions } = get();
          if (!nodePositions[nodeId]) return;
          const newPositions = { ...nodePositions };
          delete newPositions[nodeId];
          set({
            nodePositions: newPositions,
            selectedNodeId: null,
          });
          get().pushUndo({ type: 'remove_node', nodeId });
        },

        // ── Selection Actions ──
        selectNode: (id) => set({ selectedNodeId: id, selectedStickyId: null, selectedMediaId: null }),
        selectSticky: (id) => set({ selectedStickyId: id, selectedNodeId: null, selectedMediaId: null }),
        selectMedia: (id) => set({ selectedMediaId: id, selectedNodeId: null, selectedStickyId: null }),
        clearSelection: () => set({ selectedNodeId: null, selectedStickyId: null, selectedMediaId: null }),

        startDrag: (id, type) => set({ isDragging: true, dragTargetId: id, dragTargetType: type }),
        endDrag: () => set({ isDragging: false, dragTargetId: null, dragTargetType: null }),

        // ── Undo/Redo ──
        pushUndo: (action) => {
          set(s => ({
            undoStack: [...s.undoStack.slice(-MAX_UNDO), action],
            redoStack: [], // new action clears redo
          }));
        },

        undo: () => {
          const { undoStack, nodePositions, stickyNotes, mediaCards } = get();
          if (undoStack.length === 0) return;

          const action = undoStack[undoStack.length - 1];
          const newUndo = undoStack.slice(0, -1);

          switch (action.type) {
            case 'move_node':
              set({
                nodePositions: { ...nodePositions, [action.nodeId]: action.from },
                undoStack: newUndo,
                redoStack: [...get().redoStack, action],
              });
              break;
            case 'add_sticky':
              set({
                stickyNotes: stickyNotes.filter(n => n.id !== action.stickyId),
                undoStack: newUndo,
                redoStack: [...get().redoStack, action],
              });
              break;
            case 'remove_sticky':
              set({
                stickyNotes: [...stickyNotes, action.sticky],
                undoStack: newUndo,
                redoStack: [...get().redoStack, action],
              });
              break;
            case 'edit_sticky':
              set({
                stickyNotes: stickyNotes.map(n =>
                  n.id === action.stickyId ? { ...n, text: action.oldText } : n
                ),
                undoStack: newUndo,
                redoStack: [...get().redoStack, action],
              });
              break;
            case 'add_media':
              set({
                mediaCards: mediaCards.filter(c => c.id !== action.mediaId),
                undoStack: newUndo,
                redoStack: [...get().redoStack, action],
              });
              break;
            case 'remove_media':
              set({
                mediaCards: [...mediaCards, action.media],
                undoStack: newUndo,
                redoStack: [...get().redoStack, action],
              });
              break;
            case 'remove_node':
              // Undo remove → node'u geri getir (varsayılan pozisyon: 0,0)
              // NOT: Gerçek pozisyonu bilmiyoruz ama en azından visible olsun
              set({
                nodePositions: { ...nodePositions, [action.nodeId]: { x: 400, y: 300 } },
                undoStack: newUndo,
                redoStack: [...get().redoStack, action],
              });
              break;
          }
        },

        redo: () => {
          const { redoStack, nodePositions, stickyNotes, mediaCards } = get();
          if (redoStack.length === 0) return;

          const action = redoStack[redoStack.length - 1];
          const newRedo = redoStack.slice(0, -1);

          switch (action.type) {
            case 'move_node':
              set({
                nodePositions: { ...nodePositions, [action.nodeId]: action.to },
                redoStack: newRedo,
                undoStack: [...get().undoStack, action],
              });
              break;
            case 'add_sticky': {
              // Re-add the sticky note from stored data
              set({
                stickyNotes: [...stickyNotes, action.sticky],
                redoStack: newRedo,
                undoStack: [...get().undoStack, action],
              });
              break;
            }
            case 'remove_sticky':
              set({
                stickyNotes: stickyNotes.filter(n => n.id !== action.sticky.id),
                redoStack: newRedo,
                undoStack: [...get().undoStack, action],
              });
              break;
            case 'edit_sticky':
              set({
                stickyNotes: stickyNotes.map(n =>
                  n.id === action.stickyId ? { ...n, text: action.newText } : n
                ),
                redoStack: newRedo,
                undoStack: [...get().undoStack, action],
              });
              break;
            case 'add_media':
              // Re-add the media card from stored data
              set({
                mediaCards: [...mediaCards, action.media],
                redoStack: newRedo,
                undoStack: [...get().undoStack, action],
              });
              break;
            case 'remove_media':
              set({
                mediaCards: mediaCards.filter(c => c.id !== action.media.id),
                redoStack: newRedo,
                undoStack: [...get().undoStack, action],
              });
              break;
            case 'remove_node': {
              const newPos = { ...nodePositions };
              delete newPos[action.nodeId];
              set({
                nodePositions: newPos,
                redoStack: newRedo,
                undoStack: [...get().undoStack, action],
              });
              break;
            }
          }
        },

        // ── Board Mode ──
        enterBoardMode: () => set({ isBoardMode: true, isTransitioning: true }),
        exitBoardMode: () => set({ isBoardMode: false, isTransitioning: true }),

        // ── Persistence ──
        getSnapshot: () => {
          const { nodePositions, stickyNotes, mediaCards, zoom, panX, panY } = get();
          return { nodePositions, stickyNotes, mediaCards, zoom, panX, panY };
        },

        loadSnapshot: (snapshot) => {
          set({
            nodePositions: snapshot.nodePositions,
            stickyNotes: snapshot.stickyNotes,
            mediaCards: snapshot.mediaCards,
            zoom: snapshot.zoom,
            panX: snapshot.panX,
            panY: snapshot.panY,
          });
        },
      }),
      {
        name: 'truth-board-store',
        version: 2, // v2: radyal layout — eski pozisyonları sıfırla
        partialize: (state) => ({
          nodePositions: state.nodePositions,
          stickyNotes: state.stickyNotes,
          mediaCards: state.mediaCards,
          zoom: state.zoom,
          panX: state.panX,
          panY: state.panY,
          gridSnap: state.gridSnap,
        }),
        migrate: () => {
          // v1 → v2: eski clustered layout'u sıfırla
          return {
            nodePositions: {},
            stickyNotes: [],
            mediaCards: [],
            zoom: 1,
            panX: 0,
            panY: 0,
            gridSnap: false,
          };
        },
      }
    ),
    { name: 'BoardStore' }
  )
);
