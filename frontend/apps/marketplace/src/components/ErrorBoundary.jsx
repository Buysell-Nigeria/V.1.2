import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
export class ErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={failed:false}}
  static getDerivedStateFromError(){return{failed:true}}
  componentDidCatch(error,info){console.error('BUYSELL screen failed:',error,info?.componentStack)}
  render(){if(this.state.failed)return <main className="bs2-error-boundary"><div><ShieldAlert size={35} color="#0b6b3a"/><h1>Something went wrong on this screen.</h1><p>Try refreshing this page. Your cart and account information are kept separately from the screen.</p><button onClick={()=>window.location.reload()}>Reload screen</button><Link to="/shop">Go to marketplace</Link></div></main>;return this.props.children}
}