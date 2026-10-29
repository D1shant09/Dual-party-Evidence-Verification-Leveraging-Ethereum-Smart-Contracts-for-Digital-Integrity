import { Outlet } from "react-router-dom";
import Navbar from './navbar/Navbar';

export default function Home() {
  return (
    <div className="container text-center">
      <Navbar />
      <Outlet />
    </div>
  );
}
