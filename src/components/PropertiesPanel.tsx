"use client";
import React from "react";
import { useSeatMapStore } from "@/hooks/useSeatMapStore";

export function PropertiesPanel() {
	const { state, dispatch, rebuildBlockSeats } = useSeatMapStore();
	const selected = state.selectedSeatIds[0]
		? state.seatMap.seats.find((s) => s.id === state.selectedSeatIds[0])
		: undefined;
	const selectedBlock = state.selectedBlockId
		? state.seatMap.blocks.find((b) => b.id === state.selectedBlockId)
		: undefined;

	if (!selected && !selectedBlock) {
		return (
			<div className="p-3 text-sm text-gray-500">
				No selection. Select a seat or block.
			</div>
		);
	}

	return (
		<div className="p-3 space-y-4">
			{selected && (
				<div className="space-y-2">
					<div className="font-semibold">Seat</div>
					<div className="grid grid-cols-2 gap-2 items-center text-sm">
						<label>Label</label>
						<input
							className="border rounded px-2 py-1"
							value={selected.label}
							onChange={(e) =>
								dispatch({
									type: "UPDATE_SEAT",
									seatId: selected.id,
									patch: { label: e.target.value },
								})
							}
						/>
						<label>Type</label>
						<select
							className="border rounded px-2 py-1"
							value={selected.type}
							onChange={(e) => {
								const v = e.target.value as
									| "standard"
									| "vip"
									| "accessible"
									| "companion";
								dispatch({
									type: "UPDATE_SEAT",
									seatId: selected.id,
									patch: { type: v },
								});
							}}
						>
							<option value="standard">Standard</option>
							<option value="vip">VIP</option>
							<option value="accessible">Accessible</option>
							<option value="companion">Companion</option>
						</select>
						<label>Status</label>
						<select
							className="border rounded px-2 py-1"
							value={selected.status}
							onChange={(e) => {
								const v = e.target.value as
									| "available"
									| "reserved"
									| "blocked";
								dispatch({
									type: "UPDATE_SEAT",
									seatId: selected.id,
									patch: { status: v },
								});
							}}
						>
							<option value="available">Available</option>
							<option value="reserved">Reserved</option>
							<option value="blocked">Blocked</option>
						</select>
					</div>
				</div>
			)}

			{selectedBlock && (
				<div className="space-y-2">
					<div className="font-semibold">Block</div>
					<div className="grid grid-cols-2 gap-2 items-center text-sm">
						<label>Name</label>
						<input
							className="border rounded px-2 py-1"
							value={selectedBlock.name}
							onChange={(e) =>
								rebuildBlockSeats(selectedBlock.id, {
									name: e.target.value,
								})
							}
						/>
						<label>Rows</label>
						<input
							type="number"
							className="border rounded px-2 py-1"
							value={selectedBlock.rows}
							onChange={(e) =>
								rebuildBlockSeats(selectedBlock.id, {
									rows: Number(e.target.value),
								})
							}
						/>
						<label>Cols</label>
						<input
							type="number"
							className="border rounded px-2 py-1"
							value={selectedBlock.cols}
							onChange={(e) =>
								rebuildBlockSeats(selectedBlock.id, {
									cols: Number(e.target.value),
								})
							}
						/>
						<label>Seat W</label>
						<input
							type="number"
							className="border rounded px-2 py-1"
							value={selectedBlock.seatWidth}
							onChange={(e) =>
								rebuildBlockSeats(selectedBlock.id, {
									seatWidth: Number(e.target.value),
								})
							}
						/>
						<label>Seat H</label>
						<input
							type="number"
							className="border rounded px-2 py-1"
							value={selectedBlock.seatHeight}
							onChange={(e) =>
								rebuildBlockSeats(selectedBlock.id, {
									seatHeight: Number(e.target.value),
								})
							}
						/>
						<label>H Gap</label>
						<input
							type="number"
							className="border rounded px-2 py-1"
							value={selectedBlock.hGap}
							onChange={(e) =>
								rebuildBlockSeats(selectedBlock.id, {
									hGap: Number(e.target.value),
								})
							}
						/>
						<label>V Gap</label>
						<input
							type="number"
							className="border rounded px-2 py-1"
							value={selectedBlock.vGap}
							onChange={(e) =>
								rebuildBlockSeats(selectedBlock.id, {
									vGap: Number(e.target.value),
								})
							}
						/>
						<label>Row Labels</label>
						<select
							className="border rounded px-2 py-1"
							value={selectedBlock.rowLabelStyle}
							onChange={(e) => {
								const v = e.target.value as "alpha" | "numeric";
								rebuildBlockSeats(selectedBlock.id, {
									rowLabelStyle: v,
								});
							}}
						>
							<option value="alpha">A, B, C</option>
							<option value="numeric">1, 2, 3</option>
						</select>
					</div>
				</div>
			)}
		</div>
	);
}
