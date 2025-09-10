"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSeatMapStore } from "@/hooks/useSeatMapStore";
import { usePanZoom } from "@/hooks/usePanZoom";
import { AddBlockModal } from "@/components/AddBlockModal";
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
		}
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

					{/* row labels per block */}
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
				</g>
			</svg>

			{/* HUD */}
			<div className="absolute bottom-2 right-2 bg-white/90 border rounded px-2 py-1 text-xs shadow">
				{Math.round(zoom * 100)}% · {Math.round(offsetX)},{" "}
				{Math.round(offsetY)}
			</div>

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
		</div>
	);
}
