"use client";
import React from "react";
import { useSeatMapStore } from "@/hooks/useSeatMapStore";

export function Sidebar() {
	const { state, dispatch } = useSeatMapStore();
	return (
		<div className="h-full w-full sm:w-64 border-l border-black/10 bg-white flex flex-col">
			<div className="p-3 border-b text-sm font-semibold">Blocks</div>
			<div className="flex-1 overflow-auto">
				{state.seatMap.blocks.length === 0 && (
					<div className="p-3 text-sm text-gray-500">
						No blocks yet. Use ⊞ to add.
					</div>
				)}
				<ul>
					{state.seatMap.blocks.map((b) => (
						<li
							key={b.id}
							className={`flex items-center justify-between px-3 py-2 text-sm border-b ${
								state.selectedBlockId === b.id
									? "bg-blue-50"
									: ""
							}`}
						>
							<button
								className="text-left flex-1"
								onClick={() =>
									dispatch({ type: "SELECT_BLOCK", id: b.id })
								}
							>
								{b.name} · {b.rows}x{b.cols}
							</button>
							<button
								title="Delete"
								className="text-red-600"
								onClick={() =>
									dispatch({
										type: "REMOVE_BLOCK",
										blockId: b.id,
									})
								}
							>
								✖
							</button>
						</li>
					))}
				</ul>
			</div>
			<div className="p-3 text-xs text-gray-600">
				Selected seats: {state.selectedSeatIds.length}
			</div>
		</div>
	);
}
