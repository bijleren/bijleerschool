import React from 'react';
import { Card } from '../ui/Card';

interface StudentBookManagementProps {
  schoolId: string;
}

export function StudentBookManagement({ schoolId }: StudentBookManagementProps) {
  return (
    <Card>
      <div className="p-8 text-center">
        <p className="text-gray-600">Leerlingenbeheer komt binnenkort</p>
        <p className="text-sm text-gray-500 mt-2">
          Hier kun je zien welke boeken leerlingen hebben geleend en hun leesvoortgang volgen.
        </p>
      </div>
    </Card>
  );
}
