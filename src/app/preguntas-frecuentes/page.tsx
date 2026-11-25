import Link from "next/link";
import { ArrowLeft, CircleHelp, Send } from "lucide-react";

const questions = [
  { question: "No puedo entrar al ERP. ¿Qué reviso?", answer: "Comprueba que tengas conexión a internet y que escribiste tu usuario correctamente. Si olvidaste tu contraseña o aparece un mensaje de acceso denegado, envía una solicitud y copia el mensaje sin incluir tu contraseña." },
  { question: "El ERP está lento o no carga. ¿Qué hago?", answer: "Espera un momento y actualiza la página una vez. Si sigue igual, indica en tu solicitud desde cuándo ocurre y qué pantalla estabas usando." },
  { question: "No puedo guardar o finalizar una tarea. ¿Qué información envío?", answer: "Cuéntanos qué estabas intentando hacer, en qué módulo ocurrió y el mensaje de error exacto. No incluyas contraseñas ni datos sensibles." },
  { question: "¿A quién le llegará mi solicitud?", answer: "Al responsable del área que selecciones en el formulario. Contabilidad, Financiera y Costos tienen cada una su propia persona encargada." },
  { question: "¿Necesito una cuenta para pedir ayuda?", answer: "No. Solo escribe tu nombre, elige tu área y describe el problema. Al enviar recibirás un número de caso." },
];

export default function FAQ() {
  return <main className="public-simple faq-page"><div className="faq-wrap"><Link href="/" className="back-link"><ArrowLeft size={18} /> Volver al inicio</Link><div className="faq-heading"><span className="public-eyebrow"><CircleHelp size={17} /> AYUDA RÁPIDA</span><h1>Preguntas frecuentes</h1><p>Revisa estas respuestas sencillas. Si el problema continúa, envíanos una solicitud.</p></div><div className="faq-list">{questions.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div><div className="faq-cta"><div><strong>¿Aún necesitas ayuda?</strong><p>Cuéntanos qué ocurre y lo revisaremos contigo.</p></div><Link href="/" className="button primary">Enviar solicitud <Send size={17} /></Link></div></div></main>;
}
