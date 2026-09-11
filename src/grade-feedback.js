// Presentation only: these bands do not change points or the verification report.

export function getGradeFeedback(pct) {
  if (pct === 100) return {
    grade: 'S',
    tone: 'success',
    label: 'Caso paranormal',
    emoji: '🏆',
    message: 'Todo salió demasiado bien. Seguridad investiga el incidente porque claramente esto no es comportamiento normal.',
  };

  if (pct >= 90) return {
    grade: 'A',
    tone: 'success',
    label: 'Pronóstico favorable',
    emoji: '🛡️',
    message: 'El pipeline tiene signos vitales estables. El auditor incluso guardó la bolsa para cadáveres.',
  };

  if (pct >= 80) return {
    grade: 'B',
    tone: 'success',
    label: 'Fuera de peligro',
    emoji: '😎',
    message: 'Sobrevivió. Tiene algunas heridas, pero nada que requiera apagar producción y fingir que fue mantenimiento programado.',
  };

  if (pct >= 70) return {
    grade: 'C',
    tone: 'warning',
    label: 'Pronóstico reservado',
    emoji: '🔧',
    message: 'El pipeline sigue respirando por sus propios medios. Producción, en cambio, ya pidió que no intenten reanimarla.',
  };

  if (pct >= 60) return {
    grade: 'D',
    tone: 'warning',
    label: 'Cuidados intensivos',
    emoji: '☕',
    message: 'El deploy llegó con pulso débil. El SOC pidió café, acceso a los logs y el número de emergencias.',
  };

  if (pct >= 50) return {
    grade: 'D-',
    tone: 'error',
    label: 'Preparando el funeral',
    emoji: '🧯',
    message: 'Todavía responde a ping, así que legalmente no podemos declararlo muerto. Técnicamente, ya están cavando.',
  };

  return {
    grade: 'F',
    tone: 'error',
    label: 'Hora del fallecimiento',
    emoji: '💀',
    message: 'El pipeline falleció durante las pruebas. Sus últimos logs serán enviados al post-mortem y sus dependencias piden privacidad.',
  };
}
