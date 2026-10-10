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
    assert.ok(html.length>=100,`Missing HTML for ${name}`);
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
}finally{
  await server.close();
}
