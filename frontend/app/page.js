import Storefront from "../components/Storefront";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export default function HomePage() {
  return <Storefront initialProducts={[]} apiUrl={apiUrl} />;
}
