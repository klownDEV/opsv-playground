import Link from "next/link";
export default function NotFound() { return <div className="page-shell not-found"><span className="eyebrow">FEL / 404</span><h1>Fel<br/>väg.</h1><p>Det här experimentet finns inte – eller så har det rymt från labbet.</p><Link className="button button-accent" href="/challenges">TILLBAKA TILL UTMANINGARNA <span>→</span></Link></div>; }
