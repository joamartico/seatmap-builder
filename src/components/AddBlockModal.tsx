"use client";
import React, { useEffect, useState } from "react";

type Props = {
	open: boolean;
	onClose: () => void;
	onConfirm: (config: {
		rows: number;
		cols: number;
		rowLabelStyle: "alpha" | "numeric";
		seatLabelStyle: "alpha" | "numeric";
	}) => void;
};

export function AddBlockModal({ open, onClose, onConfirm }: Props) {
	const [rows, setRows] = useState(6);
	const [cols, setCols] = useState(10);
	const [rowLabelStyle, setRowLabelStyle] = useState<"alpha" | "numeric">(
		"alpha"
	);
	const [seatLabelStyle, setSeatLabelStyle] = useState<"alpha" | "numeric">(
		"numeric"
	);

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (!open) return;
			if (e.key === "Escape") onClose();
			if (e.key === "Enter")
				onConfirm({ rows, cols, rowLabelStyle, seatLabelStyle });
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, rows, cols, rowLabelStyle, seatLabelStyle, onClose, onConfirm]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<div className="bg-white rounded shadow-lg w-[92vw] max-w-md p-4">
				<div className="text-base font-semibold mb-3">
					Agregar sección
				</div>
				<div className="grid grid-cols-2 gap-3 items-center text-sm">
					<label>Filas</label>
					<input
						type="number"
						min={1}
						max={1000}
						className="border rounded px-2 py-1"
						value={rows}
						onChange={(e) => setRows(Number(e.target.value))}
					/>
					<label>Asientos por fila</label>
					<input
						type="number"
						min={1}
						max={1000}
						className="border rounded px-2 py-1"
						value={cols}
						onChange={(e) => setCols(Number(e.target.value))}
					/>
					<label>Etiquetado de filas</label>
					<select
						className="border rounded px-2 py-1"
						value={rowLabelStyle}
						onChange={(e) =>
							setRowLabelStyle(
								e.target.value as "alpha" | "numeric"
							)
						}
					>
						<option value="alpha">A, B, C</option>
						<option value="numeric">1, 2, 3</option>
					</select>
					<label>Etiquetado de asientos</label>
					<select
						className="border rounded px-2 py-1"
						value={seatLabelStyle}
						onChange={(e) =>
							setSeatLabelStyle(
								e.target.value as "alpha" | "numeric"
							)
						}
					>
						<option value="numeric">1, 2, 3</option>
						<option value="alpha">A, B, C</option>
					</select>
				</div>
				<div className="mt-4 flex justify-end gap-2">
					<button
						className="px-3 py-1.5 text-sm rounded border"
						onClick={onClose}
					>
						Cancelar
					</button>
					<button
						className="px-3 py-1.5 text-sm rounded border bg-gray-900 text-white"
						onClick={() =>
							onConfirm({
								rows,
								cols,
								rowLabelStyle,
								seatLabelStyle,
							})
						}
					>
						Agregar
					</button>
				</div>
			</div>
		</div>
	);
}
