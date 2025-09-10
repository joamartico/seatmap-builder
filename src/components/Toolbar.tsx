"use client";
import React from "react";
import { LuMousePointer2, LuHand, LuSquarePlus } from "react-icons/lu";
import { useSeatMapStore } from "@/hooks/useSeatMapStore";
import type { Tool } from "@/types/seatmap";

export function Toolbar() {
	const { state, dispatch } = useSeatMapStore();

	const setTool = (tool: Tool) => dispatch({ type: "SET_TOOL", tool });

	return (
		<div className="flex sm:flex-col gap-2 p-2 border-r border-black/10 bg-white w-full sm:w-12 sm:h-full items-center">
			<button
				className={`w-full sm:w-8 sm:h-8 px-2 py-1 rounded border ${
					state.activeTool.kind === "select"
						? "bg-gray-900 text-white"
						: "bg-white"
				}`}
				title="Select (V)"
				onClick={() => setTool({ kind: "select" })}
			>
				<LuMousePointer2 className="w-4 h-4" />
			</button>
			<button
				className={`w-full sm:w-8 sm:h-8 px-2 py-1 rounded border ${
					state.activeTool.kind === "pan"
						? "bg-gray-900 text-white"
						: "bg-white"
				}`}
				title="Pan (Space)"
				onClick={() => setTool({ kind: "pan" })}
			>
				<LuHand className="w-4 h-4" />
			</button>
			<div className="h-px sm:h-0 sm:w-full w-px bg-black/10" />
			<button
				className={`w-full sm:w-8 sm:h-8 px-2 py-1 rounded border ${
					state.activeTool.kind === "addBlock"
						? "bg-gray-900 text-white"
						: "bg-white"
				}`}
				title="Add Section"
				onClick={() =>
					setTool({
						kind: "addBlock",
						preset: {
							rows: 6,
							cols: 10,
							seatWidth: 32,
							seatHeight: 32,
							hGap: 8,
							vGap: 8,
							rowLabelStyle: "alpha",
							seatLabelStyle: "numeric",
							startRowIndex: 0,
							startColIndex: 0,
							name: "Section",
						},
					})
				}
			>
				<LuSquarePlus className="w-4 h-4" />
			</button>
		</div>
	);
}
