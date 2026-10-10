import { Grid2X2, Home, Package, PlusCircle, UserRound } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { MarketplaceFooter } from "../components/MarketplaceFooter";
import { MarketplaceHeader } from "../components/MarketplaceHeader";
import { useAuth } from "../contexts/AuthContext";

export function MarketplaceLayout() {
  const { viewer } = useAuth();
  const sellerActive =
    viewer?.capabilities.some(
      (item) => item.capability === "SELLER" && item.status === "ACTIVE",
    ) ?? false;
  return (
    <div className="app-shell app-shell--marketplace">
      <MarketplaceHeader />
      <main id="main-content">
        <Outlet />
      </main>
      <MarketplaceFooter />
      <nav className="bottom-nav" aria-label="Mobile navigation">
        <NavLink to="/" end>
          <Home />
          <span>Home</span>
        </NavLink>
        <NavLink to="/products">
          <Grid2X2 />
          <span>Categories</span>
        </NavLink>
        <NavLink
          className="bottom-nav__sell"
          to={sellerActive ? "/seller/dashboard" : "/signup/seller"}
        >
          <PlusCircle />
          <span>{sellerActive ? "Seller" : "Sell"}</span>
        </NavLink>
        <NavLink to="/orders">
          <Package />
          <span>Orders</span>
        </NavLink>
        <NavLink to="/account">
          <UserRound />
          <span>Account</span>
        </NavLink>
      </nav>
    </div>
  );
}
