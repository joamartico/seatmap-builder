"use client";
import React from "react";
import { Topbar } from "@/components/Topbar";
import { Toolbar } from "@/components/Toolbar";
import { SeatCanvas } from "@/components/SeatCanvas";
import { PropertiesPanel } from "@/components/PropertiesPanel";
import { Sidebar } from "@/components/Sidebar";
import { SeatMapProvider } from "@/hooks/useSeatMapStore";

export function BuilderLayout() {
	return (
		<SeatMapProvider>
			<div className="h-screen w-screen grid grid-rows-[auto_1fr]">
				<Topbar />
				<div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto] min-h-0">
					<div className="hidden sm:block">
						<Toolbar />
					</div>
					<SeatCanvas />
					<div className="hidden md:flex md:flex-col md:w-90 border-l border-black/10 bg-white">
						<PropertiesPanel />
						<Sidebar />
					</div>
				</div>
			</div>
		</SeatMapProvider>
	);
}
