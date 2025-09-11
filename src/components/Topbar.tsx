"use client";
import React, { useRef, useState, useCallback } from "react";
import { useSeatMapStore } from "@/hooks/useSeatMapStore";
import type { SeatMap } from "@/types/seatmap";
import { NamePromptModal } from "./NamePromptModal";

export function Topbar() {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { state, dispatch } = useSeatMapStore();
	const [exportOpen, setExportOpen] = useState(false);
	const [exportSuggested, setExportSuggested] = useState("Mapa");

	const doExport = useCallback(
		(exportName: string) => {
			const mapToExport = { ...state.seatMap, name: exportName };
			const blob = new Blob([JSON.stringify(mapToExport, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${exportName}.json`;
			a.click();
			URL.revokeObjectURL(url);
		},
		[state.seatMap]
	);

	const handleExport = () => {
		const suggested = state.seatMap.name?.trim() || "Mapa";
		setExportSuggested(suggested);
		setExportOpen(true);
	};

	const handleNewMap = () => {
		const now = new Date().toISOString();
		const newMap: SeatMap = {
			id:
				crypto.randomUUID?.() ??
				`sm_${Math.random().toString(36).slice(2)}`,
			name: "Nuevo mapa",
			width: state.seatMap.width,
			height: state.seatMap.height,
			backgroundColor: state.seatMap.backgroundColor || "#fafafa",
			blocks: [],
			seats: [],
			zones: [],
			createdAt: now,
			updatedAt: now,
		};
		dispatch({ type: "LOAD", seatMap: newMap });
	};

	const handleImportClick = () => fileInputRef.current?.click();

	const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const text = await file.text();
		try {
			const json = JSON.parse(text);
			dispatch({ type: "LOAD", seatMap: json });
		} catch {
			alert("Archivo inválido");
		}
	};

	return (
		<div className="flex items-center justify-between border-b border-black/10 bg-white px-3 h-12">
			<div className="flex items-center gap-2">
				<span className="font-semibold">Seatmap Builder</span>
			</div>
			<div className="flex items-center gap-2">
				<button
					className="px-2 py-1 text-sm rounded border bg-white hover:bg-gray-50 cursor-pointer"
					onClick={() => dispatch({ type: "UNDO" })}
				>
					Deshacer
				</button>
				<button
					className="px-2 py-1 text-sm rounded border bg-white hover:bg-gray-50 cursor-pointer"
					onClick={() => dispatch({ type: "REDO" })}
				>
					Rehacer
				</button>
				<button
					className="px-2 py-1 text-sm rounded border bg-white hover:bg-gray-50 cursor-pointer"
					onClick={handleNewMap}
				>
					Nuevo mapa
				</button>
				<button
					className="px-2 py-1 text-sm rounded border cursor-pointer bg-white hover:bg-gray-50"
					onClick={handleExport}
				>
					Exportar JSON
				</button>
				<button
					className="px-2 py-1 text-sm rounded border cursor-pointer bg-white hover:bg-gray-50"
					onClick={handleImportClick}
				>
					Importar JSON
				</button>
				<input
					ref={fileInputRef}
					className="hidden"
					type="file"
					accept="application/json"
					onChange={handleImport}
				/>
				<NamePromptModal
					open={exportOpen}
					title="Exportar mapa"
					label="Nombre del mapa"
					defaultValue={exportSuggested}
					confirmLabel="Exportar"
					cancelLabel="Cancelar"
					placeholder="Escribe un nombre o déjalo vacío para usar el sugerido"
					onConfirm={(value) => {
						const exportName = (
							value?.trim() || exportSuggested
						).replace(/\s+/g, " ");
						doExport(exportName);
						setExportOpen(false);
					}}
					onClose={() => setExportOpen(false)}
				/>
			</div>
		</div>
	);
}
