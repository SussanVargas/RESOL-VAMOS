import Link from "next/link";
import { CircleCheck, Home, BookOpenText } from "lucide-react";

export default async function Received({ searchParams }: { searchParams: Promise<{ numero?: string }> }) {
  const { numero } = await searchParams;
  const validNumber = numero && /^\d{1,12}$/.test(numero) ? numero : null;
  return <main className="public-simple"><div className="public-simple-card"><span className="success-symbol"><CircleCheck size={36} /></span><span className="public-eyebrow">SOLICITUD RECIBIDA</span><h1>Gracias por contarnos.</h1><p>Tu solicitud quedó registrada y llegará al responsable del área que elegiste.</p>{validNumber && <div className="public-ticket">Tu número de caso <strong>#{validNumber.padStart(4, "0")}</strong></div>}<div className="public-simple-actions"><Link href="/" className="button primary"><Home size={17} /> Volver al inicio</Link><Link href="/preguntas-frecuentes" className="button secondary"><BookOpenText size={17} /> Ver ayuda</Link></div></div></main>;
}
