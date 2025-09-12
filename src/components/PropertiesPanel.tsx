"use client";
import React, { useEffect, useState } from "react";
import { useSeatMapStore } from "@/hooks/useSeatMapStore";

export function PropertiesPanel() {
	const { state, dispatch, rebuildBlockSeats } = useSeatMapStore();
	const [rowDraft, setRowDraft] = useState<{ key?: string; value: string }>({
		key: undefined,
		value: "",
	});
	const [rowStartDraft, setRowStartDraft] = useState<{
		key?: string;
		value: string;
	}>({ key: undefined, value: "" });
	const [colStartDraft, setColStartDraft] = useState<{
		key?: string;
		value: string;
	}>({ key: undefined, value: "" });
	const selected = state.selectedSeatIds[0]
		? state.seatMap.seats.find((s) => s.id === state.selectedSeatIds[0])
		: undefined;
	const selectedBlock = state.selectedBlockId
		? state.seatMap.blocks.find((b) => b.id === state.selectedBlockId)
		: undefined;
	const selectedRow =
		state.selectedRow && state.selectedRow.blockId === selectedBlock?.id
			? state.selectedRow
			: undefined;

	function alphaLabel(n: number) {
		let s = "";
		n = Math.floor(n);
		while (n >= 0) {
			s = String.fromCharCode((n % 26) + 65) + s;
			n = Math.floor(n / 26) - 1;
		}
		return s;
	}

	function alphaToIndex(s: string): number | null {
		const t = s.trim().toUpperCase();
		if (!/^[A-Z]+$/.test(t)) return null;
		let n = 0;
		for (let i = 0; i < t.length; i++) {
			n = n * 26 + (t.charCodeAt(i) - 65 + 1);
		}
		return n - 1; // 0-based
	}

	function parseStart(style: "alpha" | "numeric", v: string): number | null {
		const trimmed = v.trim();
		if (trimmed === "") return null;
		if (style === "alpha") {
			const asAlpha = alphaToIndex(trimmed);
			if (asAlpha != null) return Math.max(0, asAlpha);
			const asNum = Number(trimmed);
			if (!Number.isNaN(asNum)) return Math.max(0, Math.floor(asNum - 1));
			return null;
		} else {
			const asNum = Number(trimmed);
			if (!Number.isNaN(asNum)) return Math.max(0, Math.floor(asNum - 1));
			const asAlpha = alphaToIndex(trimmed);
			if (asAlpha != null) return Math.max(0, asAlpha);
			return null;
		}
	}

	const rowEdit = (() => {
		if (selectedRow) {
			const b = state.seatMap.blocks.find(
				(x) => x.id === selectedRow.blockId
			);
			if (!b) return undefined;
			const rel = selectedRow.row;
			const rowIndex = b.startRowIndex + rel;
			const def =
				b.rowLabelStyle === "alpha"
					? alphaLabel(rowIndex)
					: String(rowIndex + 1);
			const cur = b.rowLabelOverrides?.[rel] ?? def;
			return { block: b, relRow: rel, defaultLabel: def, current: cur };
		}
		if (selected) {
			const blockId = selected.id.split("::")[0];
			const b = state.seatMap.blocks.find((x) => x.id === blockId);
			if (!b) return undefined;
			const rel = selected.row - b.startRowIndex;
			if (rel < 0 || rel >= b.rows) return undefined;
			const rowIndex = b.startRowIndex + rel;
			const def =
				b.rowLabelStyle === "alpha"
					? alphaLabel(rowIndex)
					: String(rowIndex + 1);
			const cur = b.rowLabelOverrides?.[rel] ?? def;
			return { block: b, relRow: rel, defaultLabel: def, current: cur };
		}
		return undefined;
	})();

	// keep rowDraft in sync with current rowEdit target
	useEffect(() => {
		if (!rowEdit) {
			setRowDraft({ key: undefined, value: "" });
			return;
		}
		const key = `${rowEdit.block.id}:${rowEdit.relRow}`;
		setRowDraft((prev) =>
			prev.key === key ? prev : { key, value: rowEdit.current }
		);
	}, [rowEdit]);

	// reset start drafts when block or styles change
	useEffect(() => {
		if (!selectedBlock) {
			setRowStartDraft({ key: undefined, value: "" });
			setColStartDraft({ key: undefined, value: "" });
			return;
		}
		const rowKey = `row-start:${selectedBlock.id}:${selectedBlock.rowLabelStyle}`;
		const colKey = `col-start:${selectedBlock.id}:${
			selectedBlock.seatLabelStyle ?? "numeric"
		}`;
		setRowStartDraft((prev) =>
			prev.key === rowKey ? prev : { key: undefined, value: "" }
		);
		setColStartDraft((prev) =>
			prev.key === colKey ? prev : { key: undefined, value: "" }
		);
	}, [selectedBlock]);

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
						<label>Rotación</label>
						<input
							type="number"
							min={-180}
							max={180}
							step={1}
							className="border rounded px-2 py-1"
							value={selectedBlock.rotation ?? 0}
							onChange={(e) =>
								dispatch({
									type: "UPDATE_BLOCK",
									blockId: selectedBlock.id,
									patch: { rotation: Number(e.target.value) },
								})
							}
						/>

						<label>Separación de asientos</label>
						<input
							type="number"
							min={0}
							className="border rounded px-2 py-1"
							value={selectedBlock.hGap ?? 0}
							onChange={(e) =>
								rebuildBlockSeats(selectedBlock.id, {
									hGap: Number(e.target.value),
								})
							}
						/>

						<label>Separación de filas</label>
						<input
							type="number"
							min={0}
							className="border rounded px-2 py-1"
							value={selectedBlock.vGap ?? 0}
							onChange={(e) =>
								rebuildBlockSeats(selectedBlock.id, {
									vGap: Number(e.target.value),
								})
							}
						/>
						<label>Etiquetado de filas</label>
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
							<option value="alpha">Alfabético</option>
							<option value="numeric">Numérico</option>
						</select>

						<label>Empezando por</label>
						<input
							className="border rounded px-2 py-1"
							placeholder={
								selectedBlock.rowLabelStyle === "alpha"
									? "A"
									: "1"
							}
							value={(() => {
								const key = `row-start:${selectedBlock.id}:${selectedBlock.rowLabelStyle}`;
								return rowStartDraft.key === key
									? rowStartDraft.value
									: selectedBlock.rowLabelStyle === "alpha"
									? alphaLabel(selectedBlock.startRowIndex)
									: String(selectedBlock.startRowIndex + 1);
							})()}
							onChange={(e) => {
								const key = `row-start:${selectedBlock.id}:${selectedBlock.rowLabelStyle}`;
								const next = e.target.value;
								setRowStartDraft({ key, value: next });
								const idx = parseStart(
									selectedBlock.rowLabelStyle,
									next
								);
								if (idx != null)
									rebuildBlockSeats(selectedBlock.id, {
										startRowIndex: idx,
									});
							}}
							onBlur={() =>
								setRowStartDraft({ key: undefined, value: "" })
							}
						/>

						<label>Etiquetado de columnas</label>
						<select
							className="border rounded px-2 py-1"
							value={selectedBlock.seatLabelStyle ?? "numeric"}
							onChange={(e) => {
								const v = e.target.value as "alpha" | "numeric";
								rebuildBlockSeats(selectedBlock.id, {
									seatLabelStyle: v,
								});
							}}
						>
							<option value="numeric">Numérico</option>
							<option value="alpha">Alfabético</option>
						</select>

						<label>Empezando por</label>
						<input
							className="border rounded px-2 py-1"
							placeholder={
								(selectedBlock.seatLabelStyle ?? "numeric") ===
								"alpha"
									? "A"
									: "1"
							}
							value={(() => {
								const style = (selectedBlock.seatLabelStyle ??
									"numeric") as "alpha" | "numeric";
								const key = `col-start:${selectedBlock.id}:${style}`;
								return colStartDraft.key === key
									? colStartDraft.value
									: style === "alpha"
									? alphaLabel(selectedBlock.startColIndex)
									: String(selectedBlock.startColIndex + 1);
							})()}
							onChange={(e) => {
								const style = (selectedBlock.seatLabelStyle ??
									"numeric") as "alpha" | "numeric";
								const key = `col-start:${selectedBlock.id}:${style}`;
								const next = e.target.value;
								setColStartDraft({ key, value: next });
								const idx = parseStart(style, next);
								if (idx != null)
									rebuildBlockSeats(selectedBlock.id, {
										startColIndex: idx,
									});
							}}
							onBlur={() =>
								setColStartDraft({ key: undefined, value: "" })
							}
						/>

						{rowEdit && (
							<>
								<div className="col-span-2 h-px bg-gray-200 my-1" />
								<div className="col-span-2 text-xs text-gray-500">
									Fila seleccionada: {rowEdit.relRow + 1}
								</div>
								<label>Etiqueta de fila</label>
								<input
									className="border rounded px-2 py-1"
									value={
										rowDraft.key ===
										`${rowEdit.block.id}:${rowEdit.relRow}`
											? rowDraft.value
											: rowEdit.current
									}
									onChange={(e) => {
										const next = e.target.value;
										setRowDraft({
											key: `${rowEdit.block.id}:${rowEdit.relRow}`,
											value: next,
										});
										dispatch({
											type: "SET_ROW_LABEL",
											blockId: rowEdit.block.id,
											row: rowEdit.relRow,
											label: next,
										});
									}}
								/>
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
