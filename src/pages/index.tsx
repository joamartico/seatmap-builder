import dynamic from "next/dynamic";

const BuilderLayout = dynamic(
	() => import("./index_impl").then((m) => m.Page),
	{ ssr: false }
);

export default function Home() {
	return <BuilderLayout />;
}
