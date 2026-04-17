import UmrahPicker from "@/components/umrah-picker";
import { listWorkbookFiles } from "@/lib/files-store";

export default async function Home() {
  const files = await listWorkbookFiles();

  return <UmrahPicker initialFiles={files} />;
}
