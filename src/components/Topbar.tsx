"use client";
import React, { useRef } from "react";
import { useSeatMapStore } from "@/hooks/useSeatMapStore";

export function Topbar() {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { state, dispatch } = useSeatMapStore();

	const handleExport = () => {
		const blob = new Blob([JSON.stringify(state.seatMap, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${state.seatMap.name || "seatmap"}.json`;
		a.click();
		URL.revokeObjectURL(url);
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
			alert("Invalid file");
		}
		// e.currentTarget.value = "";
	};

	return (
		<div className="flex items-center justify-between border-b border-black/10 bg-white px-3 h-12">
			<div className="flex items-center gap-2">
				<span className="font-semibold">Seatmap Builder</span>
				<input
					className="border rounded px-2 py-1 text-sm"
					value={state.seatMap.name}
					onChange={(e) =>
						dispatch({
							type: "LOAD",
							seatMap: { ...state.seatMap, name: e.target.value },
						})
					}
				/>
			</div>
			<div className="flex items-center gap-2">
				<button
					className="px-2 py-1 text-sm rounded border bg-white hover:bg-gray-50"
					onClick={() => dispatch({ type: "UNDO" })}
				>
					Deshacer
				</button>
				<button
					className="px-2 py-1 text-sm rounded border bg-white hover:bg-gray-50"
					onClick={() => dispatch({ type: "REDO" })}
				>
					Rehacer
				</button>
				<button
					className="px-2 py-1 text-sm rounded border"
					onClick={handleExport}
				>
					Exportar JSON
				</button>
				<button
					className="px-2 py-1 text-sm rounded border"
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
			</div>
		</div>
	);
}
