import Image from "next/image";
import AuthControl from "../../components/AuthControl";
import { sanityFetch } from "@/sanity/lib/live";

export default async function Home() {
  return (
    <div>
      <header className="flex w-full items-center justify-between gap-6">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <AuthControl />
      </header>
      {/* Featured products Carousel */}
      {/* Page Banner */}
      {/* Category Tiles */}
      {/* Products Section */}
    </div>
  );
}
