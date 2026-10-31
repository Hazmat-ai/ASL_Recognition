import {Component,type ReactNode} from 'react';
export class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed ? <main className="mx-auto max-w-xl p-8 text-white"><h1 className="text-2xl font-semibold">Palm couldn’t display this screen</h1><p className="mt-4">Reload to recover. Your saved practice data is kept in this browser.</p><button className="button-primary mt-4" onClick={()=>window.location.reload()}>Reload Palm</button></main> : this.props.children;}
}
