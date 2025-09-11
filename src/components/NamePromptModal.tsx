"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";

type Props = {
	open: boolean;
	title?: string;
	label?: string;
	defaultValue?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	placeholder?: string;
	onConfirm: (value: string) => void;
	onClose: () => void;
};

export function NamePromptModal({
	open,
	title = "Nombre",
	label = "Nombre",
	defaultValue = "",
	confirmLabel = "Confirmar",
	cancelLabel = "Cancelar",
	placeholder,
	onConfirm,
	onClose,
}: Props) {
	const [value, setValue] = useState(defaultValue);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (open) setValue(defaultValue);
	}, [open, defaultValue]);

	const handleConfirm = useCallback(() => {
		const v = (value ?? "").trim();
		onConfirm(v);
	}, [onConfirm, value]);

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (!open) return;
			if (e.key === "Escape") onClose();
			if (e.key === "Enter") handleConfirm();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose, handleConfirm]);

	useEffect(() => {
		if (open) setTimeout(() => inputRef.current?.focus(), 0);
	}, [open]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<div className="bg-white rounded shadow-lg w-[92vw] max-w-sm p-4">
				<div className="text-base font-semibold mb-2">{title}</div>
				<div className="space-y-2">
					<label className="text-sm text-gray-700">{label}</label>
					<input
						ref={inputRef}
						className="w-full border rounded px-2 py-1"
						value={value}
						onChange={(e) => setValue(e.target.value)}
						placeholder={placeholder}
					/>
					<div className="text-[11px] text-gray-500">
						Puedes dejarlo vacío para usar el valor sugerido.
					</div>
				</div>
				<div className="mt-4 flex justify-end gap-2">
					<button
						className="px-3 py-1.5 text-sm rounded border bg-white hover:bg-gray-50"
						onClick={onClose}
					>
						{cancelLabel}
					</button>
					<button
						className="px-3 py-1.5 text-sm rounded border bg-gray-900 text-white hover:opacity-95"
						onClick={handleConfirm}
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
