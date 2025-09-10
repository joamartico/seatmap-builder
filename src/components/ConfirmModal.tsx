"use client";
import React, { useEffect } from "react";

type Props = {
	open: boolean;
	title?: string;
	message?: string | React.ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	onConfirm: () => void;
	onClose: () => void;
};

export function ConfirmModal({
	open,
	title = "Confirm",
	message = "Are you sure?",
	confirmLabel = "Delete",
	cancelLabel = "Cancel",
	onConfirm,
	onClose,
}: Props) {
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (!open) return;
			if (e.key === "Escape") onClose();
			if (e.key === "Enter") onConfirm();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose, onConfirm]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<div className="bg-white rounded shadow-lg w-[92vw] max-w-md p-4">
				<div className="text-base font-semibold mb-2">{title}</div>
				<div className="text-sm text-gray-700 mb-4">{message}</div>
				<div className="flex justify-end gap-2">
					<button
						className="px-3 py-1.5 text-sm rounded border"
						onClick={onClose}
					>
						{cancelLabel}
					</button>
					<button
						className="px-3 py-1.5 text-sm rounded border bg-red-600 text-white"
						onClick={onConfirm}
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
