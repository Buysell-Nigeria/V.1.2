import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

// Catch render-time errors such as missing icon imports. A successful
// Vite/esbuild bundle does not catch JSX identifiers that are undefined.
const server=await createServer({configFile:'vite.config.js',appType:'custom',server:{middlewareMode:true,hmr:false}});
const el=React.createElement;
globalThis.window={location:{pathname:'/shop',search:''}};
try{
  const [auth,cart,pages,shell,authentication,seller,analytics,admin,logistics]=await Promise.all([
    server.ssrLoadModule('/src/auth/AuthContext.jsx'),
    server.ssrLoadModule('/src/state/CartContext.jsx'),
    server.ssrLoadModule('/src/pages/public/ShopPage.jsx'),
    server.ssrLoadModule('/src/layouts/AppShell.jsx'),
    server.ssrLoadModule('/src/pages/public/AuthPage.jsx'),
    server.ssrLoadModule('/src/pages/seller/SellerStorefrontPage.jsx'),
    server.ssrLoadModule('/src/pages/seller/SellerAnalyticsPage.jsx'),
    server.ssrLoadModule('/src/pages/admin/AdminOperationsPage.jsx'),
    server.ssrLoadModule('/src/pages/rider/RiderDeliveriesPage.jsx'),
  ]);
  const wrapper=(component,path)=>el(MemoryRouter,{initialEntries:[path]},
    el(auth.AuthProvider,null,el(cart.CartProvider,null,component)));
  const render=(name,component,path)=>{
    window.location.pathname=path.split('?')[0];
    window.location.search=path.includes('?')?'?'+path.split('?')[1]:'';
    const html=renderToString(wrapper(component,path));
    assert.ok(html.trim().length>=15,`Missing HTML for ${name}`);
    console.log('PASS '+name+' ('+html.length+' characters)');
  };
  render('Marketplace homepage',el(pages.ShopPage),'/shop');
  render('Marketplace catalog',el(pages.ShopPage),'/products');
  render('Marketplace search',el(pages.ShopPage),'/search?q=phone');
  render('Platform header',el(shell.AppShell),'/shop');
  render('Sign in',el(authentication.AuthPage),'/auth');
  render('Seller signup',el(authentication.AuthPage),'/auth?mode=signup&role=seller');
  render('Seller dashboard settings',el(seller.SellerStorefrontPage),'/seller/storefront');
  render('Seller analytics',el(analytics.SellerAnalyticsPage),'/seller/analytics');
  render('Admin moderation',el(admin.AdminOperationsPage,{type:'users'}),'/admin/users');
  render('Rider deliveries',el(logistics.RiderDeliveriesPage),'/rider/deliveries');
  render('Rider delivery details',el(logistics.RiderDeliveryDetailPage),'/rider/deliveries/1');
  render('Product card',el(pages.ProductCard,{product:{id:'demo',name:'Sample',price:100000,stock_quantity:3,images:[]},onAdd:()=>{}}),'/shop');
  // Cover every major route component, not just the landing page. This
  // intentionally needs no network or credentials: React effects don't run
  // in server rendering, but missing JSX symbols still throw immediately.
  const routeViews = [
    ['Product details','/src/pages/public/ProductPage.jsx','ProductPage','/products/sample'],
    ['Public storefront','/src/pages/public/StorePage.jsx','StorePage','/store/sample'],
    ['Cart','/src/pages/buyer/CartPage.jsx','CartPage','/cart'],
    ['Checkout','/src/pages/buyer/CheckoutPage.jsx','CheckoutPage','/checkout'],
    ['Buyer orders','/src/pages/buyer/OrdersPage.jsx','OrdersPage','/orders'],
    ['Order details','/src/pages/buyer/OrderDetailPage.jsx','OrderDetailPage','/orders/sample'],
    ['Wishlist','/src/pages/buyer/CollectionPage.jsx','CollectionPage','/wishlist',{type:'wishlist'}],
    ['Messages','/src/pages/buyer/MessagesPage.jsx','MessagesPage','/messages'],
    ['Account','/src/pages/buyer/AccountPage.jsx','AccountPage','/account'],
    ['Disputes','/src/pages/buyer/DisputesPage.jsx','DisputesPage','/disputes'],
    ['KYC','/src/pages/buyer/KycPage.jsx','KycPage','/account/kyc'],
    ['Seller products','/src/pages/seller/SellerProductsPage.jsx','SellerProductsPage','/seller/products'],
    ['Seller editor','/src/pages/seller/ProductFormPage.jsx','ProductFormPage','/seller/products/new'],
    ['Seller orders','/src/pages/seller/SellerOrdersPage.jsx','SellerOrdersPage','/seller/orders'],
    ['Seller payouts','/src/pages/seller/WithdrawalPage.jsx','WithdrawalPage','/seller/withdrawals'],
    ['Seller coupons','/src/pages/seller/CouponsPage.jsx','CouponsPage','/seller/coupons'],
    ['Seller advertising','/src/pages/seller/AdsPage.jsx','AdsPage','/seller/ads'],
    ['Seller sourcing','/src/pages/seller/DropshippingPage.jsx','DropshippingPage','/seller/dropshipping'],
    ['Seller team','/src/pages/seller/TeamPage.jsx','TeamPage','/seller/team'],
    ['Supplier catalog','/src/pages/supplier/SupplierCatalogPage.jsx','SupplierCatalogPage','/supplier/catalog'],
    ['Supplier profile','/src/pages/supplier/SupplierProfilePage.jsx','SupplierProfilePage','/supplier/profile'],
    ['Manager tasks','/src/pages/manager/ManagerTasksPage.jsx','ManagerTasksPage','/manager/tasks'],
    ['Rider earnings','/src/pages/rider/RiderEarningsPage.jsx','RiderEarningsPage','/rider/earnings'],
    ['Admin analytics','/src/pages/admin/AdminAnalyticsPage.jsx','AdminAnalyticsPage','/admin/analytics'],
    ['Admin broadcasts','/src/pages/admin/BroadcastPage.jsx','BroadcastPage','/admin/broadcasts'],
    ['Admin upcoming','/src/pages/admin/AdminUpcomingPage.jsx','AdminUpcomingPage','/admin/upcoming'],
    ['Admin moderation orders','/src/pages/admin/AdminOperationsPage.jsx','AdminOperationsPage','/admin/orders',{type:'orders'}],
    ['Help centre','/src/pages/public/SupportPage.jsx','SupportPage','/support'],
    ['Unrecognized route','/src/pages/public/NotFoundPage.jsx','NotFoundPage','/404'],
    ['Role dashboard overview','/src/pages/shared/DashboardOverview.jsx','DashboardOverview','/seller',{role:'seller'}],
    ['Role data views','/src/pages/shared/ResourcePage.jsx','ResourcePage','/supplier/orders',{title:'Supplier orders',endpoint:'/suppliers/orders'}],
  ];
  for (const [label, modulePath, exportName, url, props] of routeViews) {
    const loaded=await server.ssrLoadModule(modulePath);
    assert.equal(typeof loaded[exportName],'function',`Missing component ${exportName}`);
    render(label,el(loaded[exportName],props||{}),url);
  }

}finally{
  await server.close();
}
