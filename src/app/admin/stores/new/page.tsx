import StoreForm from "@/components/admin/StoreForm";

export default function NewStorePage() {
  return (
    <div className="max-w-7xl mx-auto py-8">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Register New Branch</h1>
        <p className="text-slate-500 font-medium mt-2">Initialize a new physical location with its own geofence and pricing rules.</p>
      </header>
      
      <StoreForm />
    </div>
  );
}
