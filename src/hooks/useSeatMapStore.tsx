"use client";
import React, {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useReducer,
} from "react";
import type {
	Seat,
	SeatBlock,
	SeatMap,
	SeatMapState,
	Tool,
} from "@/types/seatmap";

type Action =
	| { type: "SET_TOOL"; tool: Tool }
	| { type: "SET_ZOOM"; zoom: number }
	| { type: "SET_OFFSET"; x: number; y: number }
	| { type: "ADD_BLOCK"; block: SeatBlock }
	| { type: "UPDATE_BLOCK"; blockId: string; patch: Partial<SeatBlock> }
	| { type: "REMOVE_BLOCK"; blockId: string }
	| { type: "ADD_SEATS"; seats: Seat[] }
	| { type: "UPDATE_SEAT"; seatId: string; patch: Partial<Seat> }
	| { type: "REMOVE_SEATS"; seatIds: string[] }
	| { type: "SELECT_SEATS"; ids: string[] }
	| { type: "SELECT_BLOCK"; id?: string }
	| { type: "LOAD"; seatMap: SeatMap }
	| { type: "UNDO" }
	| { type: "REDO" };

const now = () => new Date().toISOString();
const clamp = (v: number, min: number, max: number) =>
	Math.max(min, Math.min(max, v));

function withHistory(state: SeatMapState, next: SeatMap): SeatMapState {
	return {
		...state,
		seatMap: next,
		past: [...state.past, state.seatMap].slice(-50),
		future: [],
	};
}

function reducer(state: SeatMapState, action: Action): SeatMapState {
	switch (action.type) {
		case "SET_TOOL":
			return { ...state, activeTool: action.tool };
		case "SET_ZOOM":
			return { ...state, zoom: clamp(action.zoom, 0.25, 4) };
		case "SET_OFFSET":
			return { ...state, offsetX: action.x, offsetY: action.y };
		case "ADD_BLOCK": {
			const next: SeatMap = {
				...state.seatMap,
				blocks: [...state.seatMap.blocks, action.block],
				updatedAt: now(),
			};
			return withHistory(state, next);
		}
		case "UPDATE_BLOCK": {
			const next: SeatMap = {
				...state.seatMap,
				blocks: state.seatMap.blocks.map((b) =>
					b.id === action.blockId ? { ...b, ...action.patch } : b
				),
				updatedAt: now(),
			};
			return withHistory(state, next);
		}
		case "REMOVE_BLOCK": {
			const next: SeatMap = {
				...state.seatMap,
				blocks: state.seatMap.blocks.filter(
					(b) => b.id !== action.blockId
				),
				seats: state.seatMap.seats.filter(
					(s) => !s.id.startsWith(`${action.blockId}::`)
				),
				updatedAt: now(),
			};
			return withHistory(state, next);
		}
		case "ADD_SEATS": {
			const next: SeatMap = {
				...state.seatMap,
				seats: [...state.seatMap.seats, ...action.seats],
				updatedAt: now(),
			};
			return withHistory(state, next);
		}
		case "UPDATE_SEAT": {
			const next: SeatMap = {
				...state.seatMap,
				seats: state.seatMap.seats.map((s) =>
					s.id === action.seatId ? { ...s, ...action.patch } : s
				),
				updatedAt: now(),
			};
			return withHistory(state, next);
		}
		case "REMOVE_SEATS": {
			const ids = new Set(action.seatIds);
			const next: SeatMap = {
				...state.seatMap,
				seats: state.seatMap.seats.filter((s) => !ids.has(s.id)),
				updatedAt: now(),
			};
			return withHistory(state, next);
		}
		case "SELECT_SEATS":
			return { ...state, selectedSeatIds: action.ids };
		case "SELECT_BLOCK":
			return { ...state, selectedBlockId: action.id };
		case "LOAD":
			return {
				...state,
				seatMap: { ...action.seatMap, updatedAt: now() },
				past: [],
				future: [],
				selectedSeatIds: [],
				selectedBlockId: undefined,
			};
		case "UNDO": {
			const past = state.past.slice();
			const prev = past.pop();
			if (!prev) return state;
			return {
				...state,
				seatMap: prev,
				past,
				future: [state.seatMap, ...state.future],
			};
		}
		case "REDO": {
			const [next, ...rest] = state.future;
			if (!next) return state;
			return {
				...state,
				seatMap: next,
				past: [...state.past, state.seatMap],
				future: rest,
			};
		}
		default:
			return state;
	}
}

function alphaLabel(n: number) {
	// 0 -> A, 25 -> Z, 26 -> AA, ...
	let s = "";
	n = Math.floor(n);
	while (n >= 0) {
		s = String.fromCharCode((n % 26) + 65) + s;
		n = Math.floor(n / 26) - 1;
	}
	return s;
}

function buildSeatsForBlock(block: SeatBlock): Seat[] {
	const seats: Seat[] = [];
	for (let r = 0; r < block.rows; r++) {
		for (let c = 0; c < block.cols; c++) {
			const rowIndex = block.startRowIndex + r;
			const colIndex = block.startColIndex + c;
			const id = `${block.id}::${rowIndex}-${colIndex}`;
			const x = block.originX + c * (block.seatWidth + block.hGap);
			const y = block.originY + r * (block.seatHeight + block.vGap);
			const rowLabel =
				block.rowLabelStyle === "alpha"
					? alphaLabel(rowIndex)
					: String(rowIndex + 1);
			const label = `${rowLabel}${colIndex + 1}`;
			seats.push({
				id,
				x,
				y,
				row: rowIndex,
				col: colIndex,
				width: block.seatWidth,
				height: block.seatHeight,
				label,
				type: "standard",
				status: "available",
			});
		}
	}
	return seats;
}

function createInitialSeatMap(): SeatMap {
	const id =
		crypto.randomUUID?.() ?? `sm_${Math.random().toString(36).slice(2)}`;
	const timestamp = new Date().toISOString();
	return {
		id,
		name: "New Seat Map",
		width: 1600,
		height: 900,
		backgroundColor: "#fafafa",
		blocks: [],
		seats: [],
		zones: [],
		createdAt: timestamp,
		updatedAt: timestamp,
	};
}

const SeatMapContext = createContext<{
	state: SeatMapState;
	dispatch: React.Dispatch<Action>;
	addBlockAt: (x: number, y: number, preset?: Partial<SeatBlock>) => void;
	addSeatsForBlock: (block: SeatBlock) => void;
	rebuildBlockSeats: (blockId: string, patch?: Partial<SeatBlock>) => void;
} | null>(null);

export function SeatMapProvider({ children }: { children: React.ReactNode }) {
	const initialState: SeatMapState = useMemo(
		() => ({
			seatMap: createInitialSeatMap(),
			selectedSeatIds: [],
			selectedBlockId: undefined,
			activeTool: { kind: "select" },
			zoom: 1,
			offsetX: 0,
			offsetY: 0,
			past: [],
			future: [],
		}),
		[]
	);

	const [state, dispatch] = useReducer(reducer, initialState);

	const addSeatsForBlock = useCallback(
		(block: SeatBlock) => {
			const seats = buildSeatsForBlock(block);
			dispatch({ type: "ADD_SEATS", seats });
		},
		[dispatch]
	);

	const addBlockAt = useCallback(
		(x: number, y: number, preset: Partial<SeatBlock> = {}) => {
			const id =
				crypto.randomUUID?.() ??
				`blk_${Math.random().toString(36).slice(2)}`;
			const block: SeatBlock = {
				id,
				name: preset.name ?? "Block",
				rows: preset.rows ?? 5,
				cols: preset.cols ?? 10,
				originX: x,
				originY: y,
				seatWidth: preset.seatWidth ?? 32,
				seatHeight: preset.seatHeight ?? 32,
				hGap: preset.hGap ?? 8,
				vGap: preset.vGap ?? 8,
				rowLabel: "",
				rowLabelStyle: preset.rowLabelStyle ?? "alpha",
				startRowIndex: preset.startRowIndex ?? 0,
				startColIndex: preset.startColIndex ?? 0,
			};
			dispatch({ type: "ADD_BLOCK", block });
			addSeatsForBlock(block);
			dispatch({ type: "SELECT_BLOCK", id });
		},
		[addSeatsForBlock]
	);

	const rebuildBlockSeats = useCallback(
		(blockId: string, patch?: Partial<SeatBlock>) => {
			const current = state.seatMap.blocks.find((b) => b.id === blockId);
			if (!current) return;
			const updated: SeatBlock = { ...current, ...(patch ?? {}) };
			// update block first
			if (patch && Object.keys(patch).length) {
				dispatch({ type: "UPDATE_BLOCK", blockId, patch });
			}
			// remove existing seats for this block
			const oldSeatIds = state.seatMap.seats
				.filter((s) => s.id.startsWith(`${blockId}::`))
				.map((s) => s.id);
			if (oldSeatIds.length)
				dispatch({ type: "REMOVE_SEATS", seatIds: oldSeatIds });
			// add new seats
			const seats = buildSeatsForBlock(updated);
			if (seats.length) dispatch({ type: "ADD_SEATS", seats });
		},
		[state.seatMap.blocks, state.seatMap.seats]
	);

	const value = useMemo(
		() => ({
			state,
			dispatch,
			addBlockAt,
			addSeatsForBlock,
			rebuildBlockSeats,
		}),
		[state, addBlockAt, addSeatsForBlock, rebuildBlockSeats]
	);

	return (
		<SeatMapContext.Provider value={value}>
			{children}
		</SeatMapContext.Provider>
	);
}

export function useSeatMapStore() {
	const ctx = useContext(SeatMapContext);
	if (!ctx)
		throw new Error("useSeatMapStore must be used within SeatMapProvider");
	return ctx;
}
