"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSeatMapStore } from "@/hooks/useSeatMapStore";
import { usePanZoom } from "@/hooks/usePanZoom";
import { AddBlockModal } from "@/components/AddBlockModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { LuPencil, LuTrash2 } from "react-icons/lu";
import type { Seat } from "@/types/seatmap";
import { H_GAP, SEAT_HEIGHT, SEAT_WIDTH, V_GAP } from "@/types/constants";

function SeatRect({ seat, selected }: { seat: Seat; selected: boolean }) {
	const fontSize = Math.max(10, Math.floor(SEAT_HEIGHT * 0.45));
	const textColor = selected ? "#1e3a8a" : "#374151"; // blue-800 or gray-700
	return (
		<g>
			<rect
				x={seat.x}
				y={seat.y}
				width={SEAT_WIDTH}
				height={SEAT_HEIGHT}
				rx={4}
				ry={4}
				className={`stroke-1 ${
					selected
						? "stroke-blue-500 fill-blue-100"
						: "stroke-gray-400 fill-white"
				}`}
			/>
			<text
				x={seat.x + SEAT_WIDTH / 2}
				y={seat.y + SEAT_HEIGHT / 2}
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
	const [spaceHeld, setSpaceHeld] = useState(false);
	const { state, dispatch, addBlockAt, rebuildBlockSeats } =
		useSeatMapStore();
	const { zoom, offsetX, offsetY, onWheel, setOffset, screenToWorld } =
		usePanZoom();
	const [bounds, setBounds] = useState<DOMRect | null>(null);
	const moving = useRef<{
		blockId: string;
		startX: number;
		startY: number;
		startOriginX: number;
		startOriginY: number;
	} | null>(null);
	const canvasCursor = (() => {
		const panLike = state.activeTool.kind === "pan" || spaceHeld;
		if (panLike)
			return dragging.current ? "cursor-grabbing" : "cursor-grab";
		if (state.activeTool.kind === "addBlock") return "cursor-copy";
		return "cursor-default";
	})();
	const [pendingAddAt, setPendingAddAt] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const [showAddModal, setShowAddModal] = useState(false);
	const [editingName, setEditingName] = useState(false);
	const [nameDraft, setNameDraft] = useState("");
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	// Local draft for the selected row label input to avoid fallback-to-default while editing
	const [rowLabelDraft, setRowLabelDraft] = useState<{
		key?: string;
		value: string;
	}>({ key: undefined, value: "" });

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
				// avoid page scroll with spacebar
				if (
					!/^(INPUT|TEXTAREA)$/.test(
						(e.target as HTMLElement)?.tagName || ""
					)
				) {
					e.preventDefault();
				}
				spaceDown.current = true;
				setSpaceHeld(true);
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
			if (e.code === "Space") {
				spaceDown.current = false;
				setSpaceHeld(false);
			}
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
		const isPan = state.activeTool.kind === "pan" || spaceHeld;
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
		// dragging selected section by border
		if (
			moving.current &&
			state.selectedBlockId === moving.current.blockId
		) {
			const dxWorld = (e.clientX - moving.current.startX) / zoom;
			const dyWorld = (e.clientY - moving.current.startY) / zoom;
			const nx = moving.current.startOriginX + dxWorld;
			const ny = moving.current.startOriginY + dyWorld;
			rebuildBlockSeats(moving.current.blockId, {
				originX: nx,
				originY: ny,
			});
		}
	}

	function onMouseUp() {
		dragging.current = null;
		moving.current = null;
	}

	function onSvgWheel(e: React.WheelEvent) {
		if (!bounds) return;
		onWheel(e.nativeEvent, bounds);
	}

	// Sync draft value when selection changes to a different row
	useEffect(() => {
		const sel = state.selectedRow;
		if (!sel) {
			setRowLabelDraft({ key: undefined, value: "" });
			return;
		}
		const b = state.seatMap.blocks.find((x) => x.id === sel.blockId);
		if (!b) return;
		const rel = sel.row;
		if (rel < 0 || rel >= b.rows) return;
		const rowIndex = b.startRowIndex + rel;
		const override = b.rowLabelOverrides?.[rel];
		const def =
			b.rowLabelStyle === "alpha"
				? alphaLabel(rowIndex)
				: String(rowIndex + 1);
		const current = override ?? def;
		const key = `${b.id}:${rel}`;
		setRowLabelDraft((prev) =>
			prev.key === key ? prev : { key, value: current }
		);
	}, [state.selectedRow, state.seatMap.blocks]);

	// Start moving from the HTML overlay (label area)
	function startOverlayMove(
		ev: React.MouseEvent,
		blockId: string,
		originX: number,
		originY: number
	) {
		ev.preventDefault();
		ev.stopPropagation();
		moving.current = {
			blockId,
			startX: ev.clientX,
			startY: ev.clientY,
			startOriginX: originX,
			startOriginY: originY,
		};

		const onMove = (e: MouseEvent) => {
			if (!moving.current) return;
			if (moving.current.blockId !== blockId) return;
			const dxWorld = (e.clientX - moving.current.startX) / zoom;
			const dyWorld = (e.clientY - moving.current.startY) / zoom;
			rebuildBlockSeats(blockId, {
				originX: moving.current.startOriginX + dxWorld,
				originY: moving.current.startOriginY + dyWorld,
			});
		};

		const onUp = () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
			moving.current = null;
		};

		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
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
							relRow: number;
						}[] = [];
						for (let r = 0; r < b.rows; r++) {
							const rowIndex = b.startRowIndex + r;
							const override = b.rowLabelOverrides?.[r];
							const rowText =
								override != null && override !== ""
									? override
									: b.rowLabelStyle === "alpha"
									? alphaLabel(rowIndex)
									: String(rowIndex + 1);
							const y =
								b.originY +
								r * (SEAT_HEIGHT + V_GAP) +
								SEAT_HEIGHT / 2;
							const x = b.originX - Math.max(8, H_GAP) - 8; // left padding before first seat
							labels.push({
								x,
								y,
								text: rowText,
								key: `${b.id}-rowlbl-${rowIndex}`,
								relRow: r,
							});
						}
						return (
							<g key={`rowlabels-${b.id}`}>
								{labels.map((L) => {
									const isSelected =
										state.selectedRow?.blockId === b.id &&
										state.selectedRow?.row === L.relRow;
									if (isSelected) {
										// Replace the label with an input overlay; hide this SVG text
										return null;
									}
									return (
										<text
											key={L.key}
											x={L.x}
											y={L.y}
											textAnchor="end"
											alignmentBaseline="middle"
											fontSize={Math.max(
												11,
												Math.floor(SEAT_HEIGHT * 0.5)
											)}
											fill={
												isSelected
													? "#1d4ed8" // blue-700
													: "#6b7280"
											}
											className="cursor-pointer select-none"
											onMouseDown={(ev) => {
												ev.stopPropagation();
												dispatch({
													type: "SELECT_ROW",
													blockId: b.id,
													row: L.relRow,
												});
											}}
										>
											{L.text}
										</text>
									);
								})}
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
								b.cols * SEAT_WIDTH + (b.cols - 1) * H_GAP;
							const bh =
								b.rows * SEAT_HEIGHT + (b.rows - 1) * V_GAP;
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
										className="cursor-move"
										onMouseDown={(ev) => {
											ev.stopPropagation();
											// start moving the selected section
											moving.current = {
												blockId: b.id,
												startX: ev.clientX,
												startY: ev.clientY,
												startOriginX: b.originX,
												startOriginY: b.originY,
											};
										}}
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

			{/* Inline row label editor when a row is selected (HTML overlay), replacing the SVG label position */}
			{state.selectedRow &&
				bounds &&
				(() => {
					const sel = state.selectedRow!;
					const b = state.seatMap.blocks.find(
						(x) => x.id === sel.blockId
					);
					if (!b) return null;
					const rel = sel.row;
					if (rel < 0 || rel >= b.rows) return null;
					const rowIndex = b.startRowIndex + rel;
					const override = b.rowLabelOverrides?.[rel];
					const def =
						b.rowLabelStyle === "alpha"
							? alphaLabel(rowIndex)
							: String(rowIndex + 1);
					const key = `${b.id}:${rel}`;
					const current =
						rowLabelDraft.key === key
							? rowLabelDraft.value
							: override ?? def;
					const y =
						b.originY +
						rel * (SEAT_HEIGHT + V_GAP) +
						SEAT_HEIGHT / 2;
					const x = b.originX - Math.max(8, H_GAP) - 8; // same anchor as SVG label (textAnchor="end")
					const width = 40; // much narrower
					const inputHeight = 20;
					const left = offsetX + x * zoom - width; // right-align to label x
					const top = offsetY + y * zoom - inputHeight / 2; // vertically centered
					return (
						<input
							className="absolute z-10 border rounded px-1 py-0.5 text-xs bg-white shadow"
							style={{
								left: Math.max(4, left),
								top: Math.max(4, top),
								width,
							}}
							value={current}
							onChange={(e) => {
								const next = e.target.value;
								setRowLabelDraft({ key, value: next });
								dispatch({
									type: "SET_ROW_LABEL",
									blockId: b.id,
									row: rel,
									label: next,
								});
							}}
						/>
					);
				})()}

			{/* Selected section toolbar (HTML overlay) */}
			{state.selectedBlockId &&
				bounds &&
				(() => {
					const b = state.seatMap.blocks.find(
						(x) => x.id === state.selectedBlockId
					);
					if (!b) return null;
					const bw = b.cols * SEAT_WIDTH + (b.cols - 1) * H_GAP;
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
										className="text-sm text-blue-900 font-medium truncate cursor-move"
										style={{ maxWidth: width - 90 }}
										title="Drag to move section"
										onMouseDown={(ev) =>
											startOverlayMove(
												ev,
												b.id,
												b.originX,
												b.originY
											)
										}
									>
										{label}
									</span>
								)}
								<div className="flex items-center gap-1">
									<button
										title="Editar nombre"
										className="px-1.5 py-0.5 text-xs rounded border hover:bg-gray-50"
										onClick={() => {
											setNameDraft(label);
											setEditingName(true);
										}}
									>
										<LuPencil className="w-4 h-4" />
									</button>
									<button
										title="Eliminar sección"
										className="px-1.5 py-0.5 text-xs rounded border text-red-600 hover:bg-red-50"
										onClick={() =>
											setShowDeleteConfirm(true)
										}
									>
										<LuTrash2 className="w-4 h-4" />
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
					title="Eliminar sección"
					message={(() => {
						const b = state.seatMap.blocks.find(
							(x) => x.id === state.selectedBlockId
						);
						return (
							<>
								¿Seguro que quieres eliminar la sección{" "}
								<span className="font-medium">
									{b?.name || "Sección sin nombre"}
								</span>
								?
								<br />
								Esto eliminará la sección y todos sus asientos.
							</>
						);
					})()}
					confirmLabel="Eliminar"
					cancelLabel="Cancelar"
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
