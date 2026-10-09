import React from 'react';
import { Card } from '@snhce/ui';
import { useTranslation } from 'react-i18next';

export default function AyudaPage() {
  const { t } = useTranslation('common');

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">{t('nav.ayuda', 'Ayuda y Soporte')}</h1>
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-2">Preguntas Frecuentes</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900">¿Cómo valido mi identidad para el Nivel Completo?</h3>
              <p className="text-gray-600">Debe acudir a cualquier establecimiento de salud pública con su documento de identidad original.</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">¿Cómo descargo mi historia clínica?</h3>
              <p className="text-gray-600">Desde la sección "Mi Historia", haga clic en el botón de descarga. Necesitará nivel completo.</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
