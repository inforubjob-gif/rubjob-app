import RiderForm from "@/components/admin/RiderForm";

export default function NewRiderPage() {
  return (
    <div className="max-w-7xl mx-auto py-8">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Authorize New Fleet Personnel</h1>
        <p className="text-slate-500 font-medium mt-2">Initialize a new rider account and prepare document verification slots.</p>
      </header>
      
      <RiderForm />
    </div>
  );
}
