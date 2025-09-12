"use client";
import React from "react";
import { LuMousePointer2, LuHand, LuSquarePlus } from "react-icons/lu";
import { useSeatMapStore } from "@/hooks/useSeatMapStore";
import type { Tool } from "@/types/seatmap";

export function Toolbar() {
	const { state, dispatch } = useSeatMapStore();

	const setTool = (tool: Tool) => dispatch({ type: "SET_TOOL", tool });

	return (
		<div className="flex sm:flex-col gap-2 p-2 border-r border-black/10 bg-white w-full sm:w-40 sm:h-full items-start">
			{/* Crear primero */}
			<button
				className={`w-full flex items-center gap-2 px-2 py-1 rounded border ${
					state.activeTool.kind === "addBlock"
						? "bg-gray-900 text-white border-blue-900"
						: "bg-white border-gray-300"
				}`}
				title="Crear asientos"
				onClick={() =>
					setTool({
						kind: "addBlock",
						preset: {
							rows: 6,
							cols: 10,
							rowLabelStyle: "alpha",
							seatLabelStyle: "numeric",
							startRowIndex: 0,
							startColIndex: 0,
							name: "Sección",
						},
					})
				}
			>
				<LuSquarePlus className="w-4 h-4" />
				<span className="text-sm">Crear asientos</span>
			</button>

			<button
				className={`w-full flex items-center gap-2 px-2 py-1 rounded border ${
					state.activeTool.kind === "select"
						? "bg-gray-900 text-white border-blue-900"
						: "bg-white border-gray-300"
				}`}
				title="Seleccionar (V)"
				onClick={() => setTool({ kind: "select" })}
			>
				<LuMousePointer2 className="w-4 h-4" />
				<span className="text-sm">Seleccionar</span>
			</button>

			<button
				className={`w-full flex items-center gap-2 px-2 py-1 rounded border ${
					state.activeTool.kind === "pan"
						? "bg-gray-900 text-white border-blue-900"
						: "bg-white border-gray-300"
				}`}
				title="Mover lienzo (Espacio)"
				onClick={() => setTool({ kind: "pan" })}
			>
				<LuHand className="w-4 h-4" />
				<span className="text-sm">Mover lienzo</span>
			</button>
		</div>
	);
}
