import { RouterProvider } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/contexts/theme-context";
import { router } from "@/router";

export function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </ThemeProvider>
  );
}
