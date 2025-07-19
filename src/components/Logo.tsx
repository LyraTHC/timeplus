import Image from "next/image";

export function Logo({ priority = false }: { priority?: boolean }) {
  return (
    <Image
      src="/logo.png"
      alt="TimePlus Logo"
      width={240}
      height={60}
      className="w-full h-auto"
      priority={priority}
    />
  );
}
