import { useCallback } from "react";
import { useSeatMapStore } from "@/hooks/useSeatMapStore";

export function usePanZoom() {
	const { state, dispatch } = useSeatMapStore();

	const screenToWorld = useCallback(
		(clientX: number, clientY: number, bounds: DOMRect) => {
			const x = (clientX - bounds.left - state.offsetX) / state.zoom;
			const y = (clientY - bounds.top - state.offsetY) / state.zoom;
			return { x, y };
		},
		[state.offsetX, state.offsetY, state.zoom]
	);

	const onWheel = useCallback(
		(e: WheelEvent, bounds: DOMRect) => {
			e.preventDefault();
			const delta = e.deltaY < 0 ? 1.1 : 0.9;
			const newZoom = Math.max(0.25, Math.min(4, state.zoom * delta));
			// zoom towards cursor
			const { x: wx, y: wy } = screenToWorld(
				e.clientX,
				e.clientY,
				bounds
			);
			const nx = e.clientX - bounds.left - wx * newZoom;
			const ny = e.clientY - bounds.top - wy * newZoom;
			dispatch({ type: "SET_ZOOM", zoom: newZoom });
			dispatch({ type: "SET_OFFSET", x: nx, y: ny });
		},
		[dispatch, screenToWorld, state.zoom]
	);

	const setOffset = useCallback(
		(x: number, y: number) => dispatch({ type: "SET_OFFSET", x, y }),
		[dispatch]
	);

	const setZoom = useCallback(
		(z: number) => dispatch({ type: "SET_ZOOM", zoom: z }),
		[dispatch]
	);

	return {
		zoom: state.zoom,
		offsetX: state.offsetX,
		offsetY: state.offsetY,
		onWheel,
		setOffset,
		setZoom,
		screenToWorld,
	};
}
