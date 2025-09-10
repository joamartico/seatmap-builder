"use client";
import React, { useState } from "react";
import { useSeatMapStore } from "@/hooks/useSeatMapStore";
import { ConfirmModal } from "@/components/ConfirmModal";

export function Sidebar() {
	const { state, dispatch } = useSeatMapStore();
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
	const pending = state.seatMap.blocks.find((b) => b.id === pendingDeleteId);

	return (
		<div className="h-full w-full sm:w-64 border-l border-black/10 bg-white flex flex-col">
			<div className="p-3 border-b text-sm font-semibold">Sections</div>
			<div className="flex-1 overflow-auto">
				{state.seatMap.blocks.length === 0 ? (
					<div className="p-3 text-sm text-gray-500">
						No sections yet. Use ⊞ to add.
					</div>
				) : (
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
										dispatch({
											type: "SELECT_BLOCK",
											id: b.id,
										})
									}
								>
									{b.name || "Untitled section"} · {b.rows}x
									{b.cols}
								</button>
								<button
									title="Delete"
									className="text-red-600"
									onClick={() => setPendingDeleteId(b.id)}
								>
									✖
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
			<div className="p-3 text-xs text-gray-600">
				Selected seats: {state.selectedSeatIds.length}
			</div>

			<ConfirmModal
				open={!!pendingDeleteId}
				title="Delete section"
				message={
					<>
						Are you sure you want to delete{" "}
						<span className="font-medium">
							{pending?.name || "Untitled section"}
						</span>
						?
						<br />
						This will remove the section and all its seats.
					</>
				}
				confirmLabel="Delete"
				cancelLabel="Cancel"
				onConfirm={() => {
					if (pendingDeleteId) {
						dispatch({
							type: "REMOVE_BLOCK",
							blockId: pendingDeleteId,
						});
						if (state.selectedBlockId === pendingDeleteId) {
							dispatch({ type: "SELECT_BLOCK", id: undefined });
						}
					}
					setPendingDeleteId(null);
				}}
				onClose={() => setPendingDeleteId(null)}
			/>
		</div>
	);
}
