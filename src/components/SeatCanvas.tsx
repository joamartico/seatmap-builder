"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSeatMapStore } from "@/hooks/useSeatMapStore";
import { usePanZoom } from "@/hooks/usePanZoom";
import { ConfirmModal } from "@/components/ConfirmModal";
// icons removed; section toolbar was converted to SVG-only interactions
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
	const rotating = useRef<{
		blockId: string;
		startAngle: number; // degrees
		startRotation: number; // degrees
	} | null>(null);
	const canvasCursor = (() => {
		const panLike = state.activeTool.kind === "pan" || spaceHeld;
		if (panLike)
			return dragging.current ? "cursor-grabbing" : "cursor-grab";
		if (state.activeTool.kind === "addBlock") return "cursor-copy";
		return "cursor-default";
	})();
	// drag-to-create addBlock interaction state
	const creatingStart = useRef<{ x: number; y: number } | null>(null);
	const [creationPreview, setCreationPreview] = useState<{
		originX: number;
		originY: number;
		rows: number;
		cols: number;
		bw: number;
		bh: number;
	} | null>(null);
	// previously used for HTML overlay editing; removed when toolbar moved into SVG
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
			// delete selected section with Delete/Backspace (if not typing)
			if (
				state.selectedBlockId &&
				(e.key === "Delete" || e.key === "Backspace")
			) {
				const target = e.target as HTMLElement | null;
				const tag = target?.tagName || "";
				const isEditable =
					/^(INPUT|TEXTAREA)$/.test(tag) ||
					Boolean((target as HTMLElement)?.isContentEditable);
				if (!isEditable) {
					e.preventDefault();
					setShowDeleteConfirm(true);
				}
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
	}, [dispatch, zoom, state.selectedBlockId]);

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
			creatingStart.current = { x, y };
			setCreationPreview({
				originX: x,
				originY: y,
				rows: 1,
				cols: 1,
				bw: SEAT_WIDTH,
				bh: SEAT_HEIGHT,
			});
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
		// update creation preview during drag
		if (creatingStart.current && bounds) {
			const start = creatingStart.current;
			const { x: wx, y: wy } = screenToWorld(
				e.clientX,
				e.clientY,
				bounds
			);
			const x0 = Math.min(start.x, wx);
			const y0 = Math.min(start.y, wy);
			const w = Math.max(0, Math.abs(wx - start.x));
			const h = Math.max(0, Math.abs(wy - start.y));
			const hGap = H_GAP;
			const vGap = V_GAP;
			const cols = Math.max(
				1,
				Math.floor((w + hGap) / (SEAT_WIDTH + hGap))
			);
			const rows = Math.max(
				1,
				Math.floor((h + vGap) / (SEAT_HEIGHT + vGap))
			);
			const bw = cols * SEAT_WIDTH + (cols - 1) * hGap;
			const bh = rows * SEAT_HEIGHT + (rows - 1) * vGap;
			setCreationPreview({
				originX: x0,
				originY: y0,
				rows,
				cols,
				bw,
				bh,
			});
		}
		// rotating selected section via handle
		if (rotating.current && bounds) {
			const current = rotating.current;
			const { x: wx, y: wy } = screenToWorld(
				e.clientX,
				e.clientY,
				bounds
			);
			// find block center
			const b = state.seatMap.blocks.find(
				(x) => x.id === current.blockId
			);
			if (b) {
				const hGap = b.hGap ?? H_GAP;
				const vGap = b.vGap ?? V_GAP;
				const bw = b.cols * SEAT_WIDTH + (b.cols - 1) * hGap;
				const bh = b.rows * SEAT_HEIGHT + (b.rows - 1) * vGap;
				const cx = b.originX + bw / 2;
				const cy = b.originY + bh / 2;
				const ang = (Math.atan2(wy - cy, wx - cx) * 180) / Math.PI; // degrees
				let rot = current.startRotation + (ang - current.startAngle);
				// normalize to [-180, 180]
				rot = ((((rot + 180) % 360) + 360) % 360) - 180;
				rot = Math.round(rot);
				dispatch({
					type: "UPDATE_BLOCK",
					blockId: b.id,
					patch: { rotation: rot },
				});
			}
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
		rotating.current = null;
		// finalize block creation
		if (creatingStart.current && creationPreview) {
			const preset =
				state.activeTool.kind === "addBlock"
					? state.activeTool.preset
					: undefined;
			addBlockAt(creationPreview.originX, creationPreview.originY, {
				rows: creationPreview.rows,
				cols: creationPreview.cols,
				rowLabelStyle: preset?.rowLabelStyle ?? "alpha",
				seatLabelStyle: preset?.seatLabelStyle ?? "numeric",
				startRowIndex: preset?.startRowIndex ?? 0,
				startColIndex: preset?.startColIndex ?? 0,
				rotation: 0,
			});
			creatingStart.current = null;
			setCreationPreview(null);
		}
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
	// overlay move helper removed; dragging now done via SVG handlers on the selection rect

	function onSeatClick(seat: Seat, e: React.MouseEvent) {
		e.stopPropagation();
		if (state.activeTool.kind === "addBlock") return; // ignore seat clicks while creating
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

					{/* per-block rendering in rotated groups */}
					{state.seatMap.blocks.map((b) => {
						const hGap = b.hGap ?? H_GAP;
						const vGap = b.vGap ?? V_GAP;
						const bw = b.cols * SEAT_WIDTH + (b.cols - 1) * hGap;
						const bh = b.rows * SEAT_HEIGHT + (b.rows - 1) * vGap;
						const cx = b.originX + bw / 2;
						const cy = b.originY + bh / 2;
						// prepare row labels data
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
								r * (SEAT_HEIGHT + vGap) +
								SEAT_HEIGHT / 2;
							const x = b.originX - Math.max(8, hGap) - 8;
							labels.push({
								x,
								y,
								text: rowText,
								key: `${b.id}-rowlbl-${rowIndex}`,
								relRow: r,
							});
						}
						return (
							<g
								key={`blk-${b.id}`}
								transform={`rotate(${
									b.rotation ?? 0
								}, ${cx}, ${cy})`}
							>
								{/* row labels for this block */}
								{labels.map((L) => {
									const isSelected =
										state.selectedRow?.blockId === b.id &&
										state.selectedRow?.row === L.relRow;
									if (isSelected) return null;
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
											fill={"#6b7280"}
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

								{/* seats for this block */}
								{state.seatMap.seats
									.filter((s) => s.id.startsWith(`${b.id}::`))
									.map((s) => (
										<g
											key={s.id}
											onMouseDown={(e) =>
												onSeatClick(s, e)
											}
										>
											<SeatRect
												seat={s}
												selected={state.selectedSeatIds.includes(
													s.id
												)}
											/>
										</g>
									))}

								{/* selected overlay for this block */}
								{state.selectedBlockId === b.id && (
									<g>
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
											stroke="#3b82f6"
											strokeWidth={2}
											strokeDasharray="6 4"
											shapeRendering="crispEdges"
											className="cursor-move"
											onMouseDown={(ev) => {
												ev.stopPropagation();
												moving.current = {
													blockId: b.id,
													startX: ev.clientX,
													startY: ev.clientY,
													startOriginX: b.originX,
													startOriginY: b.originY,
												};
											}}
										/>
										<rect
											x={b.originX - 4}
											y={b.originY - 4}
											width={bw + 8}
											height={bh + 8}
											fill="transparent"
											className="cursor-move"
											onMouseDown={(ev) => {
												ev.stopPropagation();
												moving.current = {
													blockId: b.id,
													startX: ev.clientX,
													startY: ev.clientY,
													startOriginX: b.originX,
													startOriginY: b.originY,
												};
											}}
										/>
										{/* rotation handle (blue dot) above the block */}
										{(() => {
											const handleY = b.originY - 28; // further above top edge for more separation
											const handleX = b.originX + bw / 2; // centered horizontally
											return (
												<g
													className="cursor-grab"
													onMouseDown={(ev) => {
														ev.stopPropagation();
														// start rotation; compute initial angle from center to handle
														const ang =
															(Math.atan2(
																handleY -
																	(b.originY +
																		bh / 2),
																handleX -
																	(b.originX +
																		bw / 2)
															) *
																180) /
															Math.PI;
														rotating.current = {
															blockId: b.id,
															startAngle: ang,
															startRotation:
																b.rotation ?? 0,
														};
													}}
												>
													<line
														x1={b.originX + bw / 2}
														y1={b.originY - 6}
														x2={handleX}
														y2={handleY + 6}
														stroke="#3b82f6"
														strokeWidth={2}
													/>
													<circle
														cx={handleX}
														cy={handleY}
														r={6}
														fill="#3b82f6"
														className="cursor-grab hover:cursor-grab"
													/>
												</g>
											);
										})()}
									</g>
								)}
							</g>
						);
					})}

					{/* creation preview overlay */}
					{creationPreview && (
						<g pointerEvents="none">
							<rect
								x={creationPreview.originX - 4}
								y={creationPreview.originY - 4}
								width={creationPreview.bw + 8}
								height={creationPreview.bh + 8}
								fill="#3b82f6"
								fillOpacity={0.08}
							/>
							<rect
								x={creationPreview.originX - 6}
								y={creationPreview.originY - 6}
								width={creationPreview.bw + 12}
								height={creationPreview.bh + 12}
								fill="none"
								stroke="#3b82f6"
								strokeWidth={2}
								strokeDasharray="6 4"
								shapeRendering="crispEdges"
							/>

							{/* seat previews */}
							{(() => {
								const preset =
									state.activeTool.kind === "addBlock"
										? state.activeTool.preset
										: {
												rowLabelStyle: "alpha" as const,
												seatLabelStyle:
													"numeric" as const,
												startRowIndex: 0,
												startColIndex: 0,
										  };
								const hGap = H_GAP;
								const vGap = V_GAP;
								const nodes = [] as React.ReactNode[];
								for (let r = 0; r < creationPreview.rows; r++) {
									for (
										let c = 0;
										c < creationPreview.cols;
										c++
									) {
										const x =
											creationPreview.originX +
											c * (SEAT_WIDTH + hGap);
										const y =
											creationPreview.originY +
											r * (SEAT_HEIGHT + vGap);
										const rowIndex =
											preset.startRowIndex + r;
										const colIndex =
											preset.startColIndex + c;
										const rowLabel =
											preset.rowLabelStyle === "alpha"
												? alphaLabel(rowIndex)
												: String(rowIndex + 1);
										const colLabel =
											(preset.seatLabelStyle ??
												"numeric") === "alpha"
												? alphaLabel(colIndex)
												: String(colIndex + 1);
										const label = `${rowLabel}${colLabel}`;
										nodes.push(
											<g key={`prev-${r}-${c}`}>
												<rect
													x={x}
													y={y}
													width={SEAT_WIDTH}
													height={SEAT_HEIGHT}
													rx={4}
													ry={4}
													className="stroke-gray-400 fill-white"
													opacity={0.9}
												/>
												<text
													x={x + SEAT_WIDTH / 2}
													y={y + SEAT_HEIGHT / 2}
													textAnchor="middle"
													alignmentBaseline="middle"
													fontSize={Math.max(
														10,
														Math.floor(
															SEAT_HEIGHT * 0.45
														)
													)}
													fill="#374151"
												>
													{label}
												</text>
											</g>
										);
									}
								}
								return nodes;
							})()}

							<text
								x={
									creationPreview.originX +
									creationPreview.bw / 2
								}
								y={
									creationPreview.originY +
									creationPreview.bh / 2
								}
								textAnchor="middle"
								alignmentBaseline="middle"
								fontSize={14}
								fill="#1e3a8a"
							>
								{creationPreview.rows}x{creationPreview.cols}
							</text>
						</g>
					)}
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
					if ((b.rotation ?? 0) !== 0) return null; // skip overlay when rotated
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
					const vGap = b.vGap ?? V_GAP;
					const hGap = b.hGap ?? H_GAP;
					const y =
						b.originY +
						rel * (SEAT_HEIGHT + vGap) +
						SEAT_HEIGHT / 2;
					const x = b.originX - Math.max(8, hGap) - 8; // same anchor as SVG label (textAnchor="end")
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

			{/* NOTE: removed HTML overlay toolbar for selected section. Dragging is handled via the SVG selection rect below. */}

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
