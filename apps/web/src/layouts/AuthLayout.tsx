import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-3xl text-white tracking-tight">Link Hub</h1>
          <p className="text-white/60 text-sm mt-2">Faculdade de Negócios</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
