import { HomeHeader } from "./components/HomeHeader";
import { HomeDashboard } from "./HomeDashboard";
import { useHomeData } from "./v1/useHomeData";

export function HomePage() {
  const data = useHomeData();

  return (
    <div className="min-h-full bg-[#1C1C1C] text-white">
      <div className="mx-auto max-w-6xl px-8 py-10">
        <HomeHeader nome={data.nomeUsuario} role={data.role} loading={data.loadingUser} />

        <HomeDashboard data={data} />
      </div>
    </div>
  );
}
