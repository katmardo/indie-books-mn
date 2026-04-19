import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
//comment
export default defineConfig({
  plugins: [react()],
  base: "/indie-books-mn/",
});
