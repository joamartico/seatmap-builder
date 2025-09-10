"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSeatMapStore } from "@/hooks/useSeatMapStore";
import { usePanZoom } from "@/hooks/usePanZoom";
import { AddBlockModal } from "@/components/AddBlockModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import type { Seat } from "@/types/seatmap";

function SeatRect({ seat, selected }: { seat: Seat; selected: boolean }) {
	const fontSize = Math.max(10, Math.floor(seat.height * 0.45));
	const textColor = selected ? "#1e3a8a" : "#374151"; // blue-800 or gray-700
	return (
		<g>
			<rect
				x={seat.x}
				y={seat.y}
				width={seat.width}
				height={seat.height}
				rx={4}
				ry={4}
				className={`stroke-1 ${
					selected
						? "stroke-blue-500 fill-blue-100"
						: "stroke-gray-400 fill-white"
				}`}
			/>
			<text
				x={seat.x + seat.width / 2}
				y={seat.y + seat.height / 2}
				textAnchor="middle"
				alignmentBaseline="middle"
				fontSize={fontSize}
				fill={textColor}
				pointerEvents="none"
			>
				{seat.label}
			</text>
		</g>
	);
}

function alphaLabel(n: number) {
	// 0 -> A, 25 -> Z, 26 -> AA, ...
	let s = "";
	n = Math.floor(n);
	while (n >= 0) {
		s = String.fromCharCode((n % 26) + 65) + s;
		n = Math.floor(n / 26) - 1;
	}
	return s;
}

export function SeatCanvas() {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);
	const dragging = useRef<{
		x: number;
		y: number;
		ox: number;
		oy: number;
	} | null>(null);
	const spaceDown = useRef(false);
	const { state, dispatch, addBlockAt } = useSeatMapStore();
	const { zoom, offsetX, offsetY, onWheel, setOffset, screenToWorld } =
		usePanZoom();
	const [bounds, setBounds] = useState<DOMRect | null>(null);
	const canvasCursor =
		state.activeTool.kind === "pan"
			? "cursor-grab"
			: state.activeTool.kind === "addBlock"
			? "cursor-copy"
			: "cursor-default";
	const [pendingAddAt, setPendingAddAt] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const [showAddModal, setShowAddModal] = useState(false);
	const [editingName, setEditingName] = useState(false);
	const [nameDraft, setNameDraft] = useState("");
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	useEffect(() => {
		const el = wrapperRef.current;
		if (!el) return;
		const update = () => setBounds(el.getBoundingClientRect());
		update();
		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.code === "Space") {
				spaceDown.current = true;
			}
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
				e.preventDefault();
				if (e.shiftKey) dispatch({ type: "REDO" });
				else dispatch({ type: "UNDO" });
			}
			if ((e.metaKey || e.ctrlKey) && ["+", "="].includes(e.key)) {
				e.preventDefault();
				dispatch({ type: "SET_ZOOM", zoom: Math.min(4, zoom * 1.1) });
			}
			if ((e.metaKey || e.ctrlKey) && e.key === "-") {
				e.preventDefault();
				dispatch({
					type: "SET_ZOOM",
					zoom: Math.max(0.25, zoom / 1.1),
				});
			}
		};
		const onKeyUp = (e: KeyboardEvent) => {
			if (e.code === "Space") spaceDown.current = false;
		};
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
		};
	}, [dispatch, zoom]);

	const worldTransform = useMemo(
		() => `translate(${offsetX}, ${offsetY}) scale(${zoom})`,
		[offsetX, offsetY, zoom]
	);

	function startPan(clientX: number, clientY: number) {
		dragging.current = { x: clientX, y: clientY, ox: offsetX, oy: offsetY };
	}

	function onMouseDown(e: React.MouseEvent) {
		if (!bounds) return;
		const isPan = state.activeTool.kind === "pan" || spaceDown.current;
		if (isPan) {
			startPan(e.clientX, e.clientY);
			return;
		}

		if (state.activeTool.kind === "addBlock") {
			const { x, y } = screenToWorld(e.clientX, e.clientY, bounds);
			setPendingAddAt({ x, y });
			setShowAddModal(true);
			return;
		}

		// Clicked on empty canvas: clear seat and section selection
		dispatch({ type: "SELECT_SEATS", ids: [] });
		dispatch({ type: "SELECT_BLOCK", id: undefined });
	}

	function onMouseMove(e: React.MouseEvent) {
		if (dragging.current) {
			const dx = e.clientX - dragging.current.x;
			const dy = e.clientY - dragging.current.y;
			setOffset(dragging.current.ox + dx, dragging.current.oy + dy);
		}
	}

	function onMouseUp() {
		dragging.current = null;
	}

	function onSvgWheel(e: React.WheelEvent) {
		if (!bounds) return;
		onWheel(e.nativeEvent, bounds);
	}

	function onSeatClick(seat: Seat, e: React.MouseEvent) {
		e.stopPropagation();
		const set = new Set(state.selectedSeatIds);
		if (e.shiftKey || e.metaKey) {
			if (set.has(seat.id)) set.delete(seat.id);
			else set.add(seat.id);
		} else {
			set.clear();
			set.add(seat.id);
		}
		dispatch({ type: "SELECT_SEATS", ids: Array.from(set) });
		// Also select the section (block) this seat belongs to
		const blockId = seat.id.split("::")[0] || undefined;
		dispatch({ type: "SELECT_BLOCK", id: blockId });
	}

	return (
		<div
			ref={wrapperRef}
			className="relative w-full h-full overflow-hidden bg-gray-50"
		>
			<svg
				ref={svgRef}
				className={`w-full h-full cursor-[inherit] ${canvasCursor}`}
				onMouseDown={onMouseDown}
				onMouseMove={onMouseMove}
				onMouseUp={onMouseUp}
				onWheel={onSvgWheel}
			>
				{/* background pattern */}
				<defs>
					<pattern
						id="grid"
						width="32"
						height="32"
						patternUnits="userSpaceOnUse"
					>
						<path
							d="M 32 0 L 0 0 0 32"
							fill="none"
							stroke="#e5e7eb"
							strokeWidth="1"
						/>
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill="url(#grid)" />

				<g transform={worldTransform}>
					{/* canvas frame */}
					<rect
						x={0}
						y={0}
						width={state.seatMap.width}
						height={state.seatMap.height}
						fill={state.seatMap.backgroundColor}
						stroke="#ddd"
					/>

					{/* row labels per section */}
					{state.seatMap.blocks.map((b) => {
						const labels: {
							x: number;
							y: number;
							text: string;
							key: string;
						}[] = [];
						for (let r = 0; r < b.rows; r++) {
							const rowIndex = b.startRowIndex + r;
							const rowText =
								b.rowLabelStyle === "alpha"
									? alphaLabel(rowIndex)
									: String(rowIndex + 1);
							const y =
								b.originY +
								r * (b.seatHeight + b.vGap) +
								b.seatHeight / 2;
							const x = b.originX - Math.max(8, b.hGap) - 8; // left padding before first seat
							labels.push({
								x,
								y,
								text: rowText,
								key: `${b.id}-rowlbl-${rowIndex}`,
							});
						}
						return (
							<g key={`rowlabels-${b.id}`}>
								{labels.map((L) => (
									<text
										key={L.key}
										x={L.x}
										y={L.y}
										textAnchor="end"
										alignmentBaseline="middle"
										fontSize={Math.max(
											11,
											Math.floor(b.seatHeight * 0.5)
										)}
										fill="#6b7280" // gray-500
									>
										{L.text}
									</text>
								))}
							</g>
						);
					})}

					{/* seats */}
					{state.seatMap.seats.map((s) => (
						<g key={s.id} onMouseDown={(e) => onSeatClick(s, e)}>
							<SeatRect
								seat={s}
								selected={state.selectedSeatIds.includes(s.id)}
							/>
						</g>
					))}

					{/* selected section overlay */}
					{state.selectedBlockId &&
						(() => {
							const b = state.seatMap.blocks.find(
								(x) => x.id === state.selectedBlockId
							);
							if (!b) return null;
							const bw =
								b.cols * b.seatWidth + (b.cols - 1) * b.hGap;
							const bh =
								b.rows * b.seatHeight + (b.rows - 1) * b.vGap;
							return (
								<g key={`sel-${b.id}`}>
									{/* subtle highlight */}
									<rect
										x={b.originX - 4}
										y={b.originY - 4}
										width={bw + 8}
										height={bh + 8}
										fill="#3b82f6"
										fillOpacity={0.06}
										pointerEvents="none"
									/>
									<rect
										x={b.originX - 6}
										y={b.originY - 6}
										width={bw + 12}
										height={bh + 12}
										fill="none"
										stroke="#3b82f6" /* blue-500 */
										strokeWidth={2}
										strokeDasharray="6 4"
										shapeRendering="crispEdges"
									/>
								</g>
							);
						})()}
				</g>
			</svg>

			{/* HUD */}
			<div className="absolute bottom-2 right-2 bg-white/90 border rounded px-2 py-1 text-xs shadow">
				{Math.round(zoom * 100)}% · {Math.round(offsetX)},{" "}
				{Math.round(offsetY)}
			</div>

			{/* Selected section toolbar (HTML overlay) */}
			{state.selectedBlockId &&
				bounds &&
				(() => {
					const b = state.seatMap.blocks.find(
						(x) => x.id === state.selectedBlockId
					);
					if (!b) return null;
					const bw = b.cols * b.seatWidth + (b.cols - 1) * b.hGap;
					const sx = offsetX + b.originX * zoom;
					const sy = offsetY + b.originY * zoom;
					const top = Math.max(8, sy - 36);
					const left = Math.max(8, sx);
					const width = Math.max(
						140,
						Math.min(bounds.width - left - 8, bw * zoom)
					);
					const label = b.name || "Untitled section";
					return (
						<div
							className="absolute z-10 pointer-events-auto"
							style={{ top, left, width }}
						>
							<div className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-white/95 shadow px-2 py-1">
								{editingName ? (
									<form
										onSubmit={(e) => {
											e.preventDefault();
											const next = nameDraft.trim();
											if (next) {
												dispatch({
													type: "UPDATE_BLOCK",
													blockId: b.id,
													patch: { name: next },
												});
											}
											setEditingName(false);
										}}
									>
										<input
											autoFocus
											className="border rounded px-2 py-0.5 text-sm"
											value={nameDraft}
											onChange={(e) =>
												setNameDraft(e.target.value)
											}
											onBlur={() => setEditingName(false)}
										/>
									</form>
								) : (
									<span
										className="text-sm text-blue-900 font-medium truncate"
										style={{ maxWidth: width - 90 }}
									>
										{label}
									</span>
								)}
								<div className="flex items-center gap-1">
									<button
										title="Edit name"
										className="px-1.5 py-0.5 text-xs rounded border hover:bg-gray-50"
										onClick={() => {
											setNameDraft(label);
											setEditingName(true);
										}}
									>
										✎
									</button>
									<button
										title="Delete section"
										className="px-1.5 py-0.5 text-xs rounded border text-red-600 hover:bg-red-50"
										onClick={() =>
											setShowDeleteConfirm(true)
										}
									>
										🗑
									</button>
								</div>
							</div>
						</div>
					);
				})()}

			<AddBlockModal
				open={showAddModal}
				onClose={() => setShowAddModal(false)}
				onConfirm={(cfg) => {
					setShowAddModal(false);
					if (pendingAddAt) {
						const basePreset =
							state.activeTool.kind === "addBlock"
								? state.activeTool.preset
								: {};
						addBlockAt(pendingAddAt.x, pendingAddAt.y, {
							...basePreset,
							...cfg,
						});
						setPendingAddAt(null);
					}
				}}
			/>

			{/* Delete confirmation */}
			{state.selectedBlockId && (
				<ConfirmModal
					open={showDeleteConfirm}
					title="Delete section"
					message={(() => {
						const b = state.seatMap.blocks.find(
							(x) => x.id === state.selectedBlockId
						);
						return (
							<>
								Are you sure you want to delete{" "}
								<span className="font-medium">
									{b?.name || "Untitled section"}
								</span>
								?
								<br />
								This will remove the section and all its seats.
							</>
						);
					})()}
					confirmLabel="Delete"
					cancelLabel="Cancel"
					onConfirm={() => {
						const id = state.selectedBlockId!;
						dispatch({ type: "REMOVE_BLOCK", blockId: id });
						dispatch({ type: "SELECT_BLOCK", id: undefined });
						setShowDeleteConfirm(false);
					}}
					onClose={() => setShowDeleteConfirm(false)}
				/>
			)}
		</div>
	);
}
