export type Seat = {
	id: string;
	x: number; // canvas coordinates (px)
	y: number; // canvas coordinates (px)
	row: number;
	col: number;
	label: string; // e.g., A1
};

export type Zone = {
	id: string;
	name: string;
	color: string; // hex
};

export type SeatBlock = {
	id: string;
	name: string;
	rows: number;
	cols: number;
	originX: number; // top-left of block (px)
	originY: number; // top-left of block (px)
	rowLabelStyle: "alpha" | "numeric";
	seatLabelStyle?: "alpha" | "numeric"; // how to label seats within a row (columns)
	// Optional overrides for row labels per block (relative row index 0..rows-1)
	rowLabelOverrides?: { [relativeRow: number]: string };
	startRowIndex: number; // 0-based
	startColIndex: number; // 0-based
};

export type SeatMap = {
	id: string;
	name: string;
	width: number; // canvas width in px
	height: number; // canvas height in px
	backgroundColor: string;
	blocks: SeatBlock[];
	seats: Seat[];
	zones: Zone[];
	createdAt: string;
	updatedAt: string;
};

export type Tool =
	| { kind: "select" }
	| { kind: "pan" }
	| {
			kind: "addBlock";
			preset: Pick<
				SeatBlock,
				| "rows"
				| "cols"
				| "rowLabelStyle"
				| "seatLabelStyle"
				| "startRowIndex"
				| "startColIndex"
			> & { name?: string };
	  };

export type SeatMapState = {
	seatMap: SeatMap;
	selectedSeatIds: string[];
	selectedBlockId?: string;
	selectedRow?: { blockId: string; row: number };
	activeTool: Tool;
	zoom: number; // 0.25 - 4
	offsetX: number;
	offsetY: number;
	// undo/redo
	past: SeatMap[];
	future: SeatMap[];
};
