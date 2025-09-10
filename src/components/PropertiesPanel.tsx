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
				Selecciona un asiento o una sección.
			</div>
		);
	}

	return (
		<div className="p-3 space-y-4">
			{selected && (
				<div className="space-y-2">
					<div className="font-semibold">Asiento</div>
					<div className="grid grid-cols-2 gap-2 items-center text-sm">
						<label>Etiqueta</label>
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
					</div>
				</div>
			)}

			{selectedBlock && (
				<div className="space-y-2">
					<div className="font-semibold">Sección</div>
					<div className="grid grid-cols-2 gap-2 items-center text-sm">
						<label>Nombre</label>
						<input
							className="border rounded px-2 py-1"
							value={selectedBlock.name}
							onChange={(e) =>
								rebuildBlockSeats(selectedBlock.id, {
									name: e.target.value,
								})
							}
						/>
						<label>Filas</label>
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
						<label>Columnas</label>
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
						{/* Removed seat dimensions and gaps per request */}
						<label>Etiquetas de filas</label>
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
