import { redirect } from "next/navigation";
import { ADMIN_HOME } from "@/lib/admin/rotas";

export default function AdminIndexPage() {
  redirect(ADMIN_HOME);
}
