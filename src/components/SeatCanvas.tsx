"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSeatMapStore } from "@/hooks/useSeatMapStore";
import { usePanZoom } from "@/hooks/usePanZoom";
import type { Seat } from "@/types/seatmap";

function SeatRect({ seat, selected }: { seat: Seat; selected: boolean }) {
	return (
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
	);
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
			addBlockAt(x, y, state.activeTool.preset);
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
				className="w-full h-full cursor-[inherit]"
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
		</div>
	);
}
