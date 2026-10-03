import React from 'react';
import { Card, Button } from '@snhce/ui';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center shadow-lg">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Página no encontrada</h1>
        <p className="text-gray-600 mb-8">
          La página que intenta buscar no existe o ha sido movida.
        </p>
        <Button onClick={() => navigate('/')} className="w-full">
          Ir al Inicio
        </Button>
      </Card>
    </div>
  );
}
