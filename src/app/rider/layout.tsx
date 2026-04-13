import RiderAuthGate from "@/components/rider/RiderAuthGate";

export default function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RiderAuthGate>{children}</RiderAuthGate>;
}
